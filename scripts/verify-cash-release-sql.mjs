// Disposable localhost PostgreSQL only. Never loads .env or a live database URL.
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const pgBin = process.env.EFLOW_TEST_PG_BIN || (process.platform === 'win32' ? 'C:/Program Files/PostgreSQL/17/bin' : '');
const binary = name => pgBin ? join(pgBin, name + (process.platform === 'win32' ? '.exe' : '')) : name;
const scratch = mkdtempSync(join(tmpdir(), 'eflow-release-pg-'));
const dataDir = join(scratch, 'data');
let started = false;
function command(name, args, input) {
  const result = spawnSync(binary(name), args, { input, encoding: 'utf8', windowsHide: true, timeout: 60000, ...(name === 'pg_ctl' ? { stdio: 'ignore' } : {}) });
  if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr || result.stdout);
  return result.stdout;
}
const listener = createServer();
await new Promise((res, rej) => { listener.once('error', rej); listener.listen(0, '127.0.0.1', res); });
const port = listener.address().port;
await new Promise(res => listener.close(res));
const args = ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-h', '127.0.0.1', '-p', String(port), '-U', 'postgres', '-d', 'postgres'];
const sql = input => command('psql', args, input);
const sourceFunction = (file, name) => {
  const text = readFileSync(join(root, file), 'utf8');
  const start = text.indexOf(`create or replace function public.${name}(`);
  const end = text.indexOf('\n$$;', start);
  if (start < 0 || end < 0) throw new Error(`Missing ${name}`);
  return text.slice(start, end + 4);
};
const identity = "set role authenticated; select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',false);";
try {
  command('initdb', ['-D', dataDir, '-U', 'postgres', '--auth-local=trust', '--auth-host=trust', '--encoding=UTF8', '--no-locale']);
  started = true;
  command('pg_ctl', ['-D', dataDir, '-l', join(scratch, 'postgres.log'), '-o', `-h 127.0.0.1 -p ${port}`, '-w', 'start']);
  sql(readFileSync(join(root, 'tests/sql/cash-release-fixture.sql'), 'utf8'));
  sql(sourceFunction('supabase/migrations/20260822000008_department_budget_and_petty_cash.sql', 'is_department_budget_approver'));
  sql(sourceFunction('supabase/migrations/20260826000003_dynamic_task_funding.sql', 'audit_cash_release_change'));
  sql('create trigger release_audit after update on petty_cash_releases for each row execute function audit_cash_release_change();');
  const migration = readFileSync(join(root, 'supabase/migrations/20260831000002_cash_release_schedule_override.sql'), 'utf8');
  sql(migration); sql(migration);
  console.log('PASS: migration compiles and is safely repeatable.');
  sql(readFileSync(join(root, 'tests/sql/cash-release-override.sql'), 'utf8'));
  console.log('PASS: permissions, reason, dates, daily ceiling, bookings, lifecycle, audit, notifications and rollback.');
  for (const secondNormal of [false, true]) {
    sql(`select reset_cash_test(); update petty_cash_requests set approved_amount=6000; update petty_cash_releases set amount=6000; ${secondNormal ? "update petty_cash_releases set scheduled_date=current_date-1 where id='50000000-0000-4000-8000-000000000002';" : ''}`);
    const first = spawn(binary('psql'), args, { windowsHide: true });
    let output = ''; let error = ''; let signal; let signalError;
    const ready = new Promise((res, rej) => { signal = res; signalError = rej; });
    const timer = setTimeout(() => { first.kill(); signalError(new Error('Concurrent release timed out')); }, 10000);
    first.stdout.on('data', chunk => { output += chunk; if (output.includes('RELEASE_LOCKED')) signal(); });
    first.stderr.on('data', chunk => { error += chunk; });
    const done = new Promise((res, rej) => {
      first.on('error', rej);
      first.on('close', code => { clearTimeout(timer); if (code) { const failure = new Error(error); signalError(failure); rej(failure); } else res(); });
    });
    first.stdin.end(`begin; ${identity} select override_petty_cash_release_schedule('50000000-0000-4000-8000-000000000001','Concurrent first release'); select 'RELEASE_LOCKED'; select pg_sleep(1); commit;`);
    await ready;
    const second = secondNormal ? "select mark_petty_cash_released('50000000-0000-4000-8000-000000000002')" : "select override_petty_cash_release_schedule('50000000-0000-4000-8000-000000000002','Concurrent second release')";
    sql(`${identity} select test_throws($race$${second}$race$,'Daily release ceiling exceeded');`);
    await done;
    sql("select test_assert((select sum(amount)=6000 from petty_cash_releases where status='released'),'concurrent cash cannot exceed daily ceiling');");
  }
  console.log('PASS: two-connection override/override and override/normal release races.');
} finally {
  let stopped = !started;
  if (started) { try { command('pg_ctl', ['-D', dataDir, '-m', 'fast', '-w', 'stop']); stopped = true; } catch (error) { console.warn(`Test cluster retained at ${scratch}: ${error.message}`); } }
  const actual = realpathSync(scratch);
  if (stopped && actual.startsWith(realpathSync(tmpdir()) + sep) && basename(actual).startsWith('eflow-release-pg-')) {
    try { rmSync(actual, { recursive: true, maxRetries: 3, retryDelay: 200 }); } catch { console.warn(`Stopped test files retained at ${actual}`); }
  }
}
