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
const scratch = mkdtempSync(join(tmpdir(), 'eflow-project-pg-'));
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
try {
  command('initdb', ['-D', dataDir, '-U', 'postgres', '--auth-local=trust', '--auth-host=trust', '--encoding=UTF8', '--no-locale']);
  started = true;
  command('pg_ctl', ['-D', dataDir, '-l', join(scratch, 'postgres.log'), '-o', `-h 127.0.0.1 -p ${port}`, '-w', 'start']);
  sql(readFileSync(join(root, 'tests/sql/project-lifecycle-fixture.sql'), 'utf8'));
  sql(sourceFunction('supabase/migrations/20260821000003_collaboration_runtime.sql', 'can_manage_collaboration_project'));
  sql(sourceFunction('supabase/migrations/20260821000003_collaboration_runtime.sql', 'can_manage_project'));
  sql('alter table projects enable row level security; create policy project_read on projects for select to authenticated using (true); create policy project_update on projects for update to authenticated using (can_manage_project(id,auth.uid()));');
  const migration = readFileSync(join(root, 'supabase/migrations/20260831000003_project_completion_lifecycle.sql'), 'utf8');
  sql(migration); sql(migration);
  console.log('PASS: project lifecycle migration compiles and is repeatable.');
  sql(readFileSync(join(root, 'tests/sql/project-lifecycle.sql'), 'utf8'));
  console.log('PASS: completion, archive, restore, permissions, direct-update guards, task/subtask/cash/governance blockers, sibling isolation, and audit rollback.');
} finally {
  let stopped = !started;
  if (started) { try { command('pg_ctl', ['-D', dataDir, '-m', 'fast', '-w', 'stop']); stopped = true; } catch (error) { console.warn(`Test cluster retained at ${scratch}: ${error.message}`); } }
  const actual = realpathSync(scratch);
  if (stopped && actual.startsWith(realpathSync(tmpdir()) + sep) && basename(actual).startsWith('eflow-project-pg-')) {
    try { rmSync(actual, { recursive: true, maxRetries: 3, retryDelay: 200 }); } catch { console.warn(`Stopped test files retained at ${actual}`); }
  }
}
