// Runs ONLY a new disposable localhost PostgreSQL cluster, never .env/database URLs.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const pgBin = process.env.EFLOW_TEST_PG_BIN || (process.platform === 'win32' ? 'C:/Program Files/PostgreSQL/17/bin' : '');
const bin = name => pgBin ? join(pgBin, name + (process.platform === 'win32' ? '.exe' : '')) : name;
const scratch = mkdtempSync(join(tmpdir(), 'eflow-evidence-pg-'));
const dataDir = join(scratch, 'data');
const migration = readFileSync(join(root, 'supabase/migrations/20260831000001_task_evidence_security.sql'), 'utf8');
let started = false;
function command(name, args, input) {
  // Detached PostgreSQL children can inherit pg_ctl's pipe handles on Windows.
  // No captured pipes for pg_ctl: its server log is kept in the temp directory.
  const result = spawnSync(bin(name), args, { input, encoding: 'utf8', windowsHide: true, timeout: 60000, ...(name === 'pg_ctl' ? { stdio: 'ignore' } : {}) });
  if (result.error || result.status !== 0) throw new Error(`${name} failed: ${result.error?.message || result.stderr || result.stdout}`);
  return result.stdout;
}
const listener = createServer();
await new Promise((res, rej) => { listener.once('error', rej); listener.listen(0, '127.0.0.1', res); });
const port = listener.address().port;
await new Promise(res => listener.close(res));
const args = ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-h', '127.0.0.1', '-p', String(port), '-U', 'postgres', '-d', 'postgres'];
const sql = input => command('psql', args, input);
function sourceFunction(file, name) {
  const source = readFileSync(join(root, file), 'utf8');
  const start = source.indexOf(`create or replace function public.${name}(`);
  const end = source.indexOf('\n$$;', source.indexOf('as $$', start));
  if (start < 0 || end < 0) throw new Error(`Cannot extract existing RPC ${name}`);
  return source.slice(start, end + 4);
}
const identity = `set role authenticated; select set_config('request.jwt.claim.role','authenticated',false); select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',false);`;
function asyncSql(input, marker) {
  const child = spawn(bin('psql'), args, { windowsHide: true });
  let output = ''; let error = ''; let resolveReady; let rejectReady;
  const ready = new Promise((res, rej) => { resolveReady = res; rejectReady = rej; });
  const timer = setTimeout(() => { child.kill(); rejectReady(new Error('Concurrent SQL timed out')); }, 10000);
  child.stdout.on('data', chunk => { output += chunk; if (output.includes(marker)) resolveReady(); });
  child.stderr.on('data', chunk => { error += chunk; });
  const done = new Promise((res, rej) => {
    child.on('error', rej);
    child.on('close', code => {
      clearTimeout(timer);
      if (code !== 0) { const failure = new Error(error || output); rejectReady(failure); rej(failure); }
      else res(output);
    });
  });
  child.stdin.end(input);
  return { ready, done };
}
try {
  command('initdb', ['-D', dataDir, '-U', 'postgres', '--auth-local=trust', '--auth-host=trust', '--encoding=UTF8', '--no-locale']);
  started = true;
  command('pg_ctl', ['-D', dataDir, '-l', join(scratch, 'postgres.log'), '-o', `-h 127.0.0.1 -p ${port}`, '-w', 'start']);
  sql(readFileSync(join(root, 'tests/sql/task-evidence-fixture.sql'), 'utf8'));
  sql(sourceFunction('supabase/migrations/20260807000000_task_review_hardening.sql', 'submit_task_for_review'));
  for (const name of ['save_subtask_progress', 'submit_subtask_for_review']) {
    sql(sourceFunction('supabase/migrations/20260816000001_subtask_evidence_review.sql', name));
  }
  sql(migration);
  sql(migration); // Safe rerun, with existing seals and without optional bucket.
  console.log('PASS: migration compiles and can be reapplied without task-files.');
  sql(readFileSync(join(root, 'tests/sql/task-evidence-security.sql'), 'utf8'));
  console.log('PASS: evidence authorization, real RPCs, history, limits, cleanup, and rollback assertions.');

  // Attaching outside the submission transaction must be rejected, even if a
  // legacy policy grants direct INSERT on the attachment table.
  const leader = identity.replaceAll('10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001');
  sql(`${leader} select public.submit_task_for_review('20000000-0000-4000-8000-000000000002','{"id":"40000000-0000-4000-8000-000000000020","note":"No attachment parent"}');`);
  sql(`${leader} select public.test_throws($late$insert into public.task_attachments(task_id,submission_id,uploaded_by,file_name,file_path,file_size,mime_type) values ('20000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000020','10000000-0000-4000-8000-000000000001','late.pdf','late',20,'application/pdf')$late$,'submission transaction');`);
  console.log('PASS: later-transaction attachment injection is rejected.');

  // A service-only orphan worker still needs the claim-before-remove protocol.
  sql(`insert into storage.objects(bucket_id,name,owner_id,metadata,created_at) values
    ('task-attachments','orphan-old','10000000-0000-4000-8000-000000000002','{"size":20,"mimetype":"application/pdf"}',now()-interval '25 hours'),
    ('task-attachments','orphan-new','10000000-0000-4000-8000-000000000002','{"size":20,"mimetype":"application/pdf"}',now());`);
  sql(`set role service_role; select set_config('request.jwt.claim.role','service_role',false);
    select public.test_assert(public.claim_task_evidence_cleanup('orphan-old'),'old orphan claim');
    select public.test_throws($age$select public.claim_task_evidence_cleanup('orphan-new')$age$,'24 hours');
    select public.test_throws($seal$select public.claim_task_evidence_cleanup('legacy/retained.pdf')$seal$,'24 hours');`);
  console.log('PASS: orphan-worker minimum age is enforced.');
  sql(`${identity} select public.save_subtask_progress('30000000-0000-4000-8000-000000000001',10);`);
  for (const [file, first] of [['finalize-wins.pdf', 'finalize'], ['cleanup-wins.pdf', 'cleanup']]) {
    const path = `subtasks/30000000-0000-4000-8000-000000000001/progress/${file}`;
    sql(`${identity} insert into storage.objects(bucket_id,name,owner_id,metadata) values ('task-attachments','${path}','10000000-0000-4000-8000-000000000002','{"size":20,"mimetype":"application/pdf"}');`);
    const finalize = `select public.save_subtask_progress('30000000-0000-4000-8000-000000000001',20,p_attachment_path=>'${path}');`;
    const cleanup = `select public.claim_task_evidence_cleanup('${path}');`;
    const initial = asyncSql(`begin; ${identity} ${first === 'finalize' ? finalize : cleanup} select 'LOCK_HELD'; select pg_sleep(1); commit;`, 'LOCK_HELD');
    await initial.ready;
    const expected = first === 'finalize' ? 'Finalized evidence' : 'claimed for cleanup';
    sql(`${identity} select public.test_throws($race$${first === 'finalize' ? cleanup : finalize}$race$,'${expected}');`);
    await initial.done;
  }
  console.log('PASS: two-connection cleanup/finalization race in both orders.');
} finally {
  let stopped = !started;
  if (started) {
    try { command('pg_ctl', ['-D', dataDir, '-m', 'fast', '-w', 'stop']); stopped = true; }
    catch (error) { console.warn(`Test cluster retained at ${scratch}: ${error.message}`); }
  }
  // Only remove this script's validated disposable directory after shutdown.
  const actual = realpathSync(scratch);
  const parent = realpathSync(tmpdir());
  if (stopped && actual.startsWith(parent + sep) && basename(actual).startsWith('eflow-evidence-pg-') && existsSync(actual)) {
    try { rmSync(actual, { recursive: true, maxRetries: 3, retryDelay: 200 }); }
    catch (error) { console.warn(`Stopped test-cluster files retained at ${actual}: ${error.message}`); }
  }
}
