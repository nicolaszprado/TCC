import { spawn, execFileSync } from 'node:child_process';
import { mkdir, open, unlink, readFile, access } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { resolve, join } from 'node:path';
import { cpus, totalmem, platform, release } from 'node:os';
import { client, counts, readFixtures, fixturePath, jsonFile, positive } from './common.js';
import { DATABASE_POOL_POLICY } from '../../../apps/shared/database-policy.js';
import { TRANSACTION_ISOLATION_SQL, MAX_TRANSACTION_ATTEMPTS } from '../../../apps/shared/transaction-policy.js';
import { benchmarkTarget, configuration, endpoints, isWrite } from '../lib/config.js';

async function main(): Promise<void> {
  const [endpoint, mode = 'smoke', ...args] = process.argv.slice(2);
  if (!endpoints.includes(endpoint) || !['smoke', 'load'].includes(mode)) throw new Error('Usage: npm run k6:run -- <endpoint> <smoke|load> [--implementation raw-sql|typeorm|prisma] [--vus N --duration 1m]');
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--implementation', '--vus', '--duration'].includes(args[i]!) || !args[i + 1] || flags[args[i]!]) throw new Error('Use --implementation, --vus and --duration only, once each');
    flags[args[i]!] = args[i + 1]!;
  }
  const target = benchmarkTarget(process.env, flags['--implementation']);
  process.env.IMPLEMENTATION = target.implementation;
  process.env.BASE_URL = target.baseUrl;
  const writes = isWrite(endpoint);
  const vus = positive(flags['--vus'], mode === 'smoke' ? 1 : 10, 'vus');
  const duration = flags['--duration'] || (mode === 'smoke' ? '10s' : '1m');
  if (!/^\d+[smh]$/.test(duration) || parseInt(duration) < 1) throw new Error('Duration must be positive seconds/minutes/hours');
  if (mode === 'smoke' && (flags['--vus'] || flags['--duration'])) throw new Error('Smoke uses fixed 1 VU, 10s reads / 1 iteration writes');
  const f = await readFixtures();
  const c = configuration(endpoint, process.env, f);
  if (writes && vus > f.writes!.maxVus) throw new Error('VUs exceed prepared partitions');
  try { await access(fixturePath + '.used'); throw new Error('Write preparation already consumed: restore baseline and prepare again'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  const k6 = process.env.K6_BIN || 'k6';
  const k6Version = execFileSync(k6, ['version'], { encoding: 'utf8' }).trim();
  const connection = client();
  await connection.connect();
  const lockPath = resolve('tests/k6/fixtures/.run.lock');
  let lock: Awaited<ReturnType<typeof open>> | undefined;
  try {
    lock = await open(lockPath, 'wx');
    if (!(await connection.query('SELECT pg_try_advisory_lock(730031) AS locked')).rows[0].locked) throw new Error('Another benchmark tool is using this database');
    const actual = await counts(connection);
    if (Object.keys(actual).some((key) => actual[key] !== f.counts[key])) throw new Error('Database changed since preparation; restore baseline');
    const currentProducts = (await connection.query('SELECT id::float8 AS id, stock, active FROM products ORDER BY id')).rows;
    const preparedStocks = new Map(f.writes?.partitions.flatMap((p) => p.products.map((p) => [p.id, p.stock] as const)) || []);
    if (currentProducts.some((p, i) => p.id !== f.products[i]?.id || p.active !== f.products[i]?.active
      || p.stock !== (preparedStocks.get(p.id) ?? f.products[i]?.stock))) throw new Error('Product state changed since preparation');
    // One unmeasured request verifies reachability before launching the measured k6 process.
    const probe = await fetch(c.baseUrl + '/products/' + f.products[0]!.id, { signal: AbortSignal.timeout(5000) });
    if (probe.status !== 200) throw new Error(`Preflight HTTP ${probe.status}`);
    const runId = process.env.RUN_ID || `${f.dataset}-${endpoint}-${c.profile}-${vus}vus-${Date.now()}`;
    if (!/^[a-zA-Z0-9_-]+$/.test(runId)) throw new Error('RUN_ID must contain letters, digits, underscore or hyphen');
    const implementation = target.implementation;
    const directory = resolve('tests/k6/results', implementation, runId);
    await mkdir(resolve('tests/k6/results', implementation), { recursive: true });
    await mkdir(directory); // EEXIST is intentional: never overwrite an earlier result.
    const summary = join(directory, 'summary.json');
    const git = (args: string[]) => { try { return execFileSync('git', args, { encoding: 'utf8' }).trim(); } catch { return 'unavailable'; } };
    const pkg = JSON.parse(await readFile('package.json', 'utf8'));
    const installed: Record<string, string> = {};
    for (const name of Object.keys(pkg.dependencies)) {
      try { installed[name] = JSON.parse(await readFile(join('node_modules', name, 'package.json'), 'utf8')).version; }
      catch { installed[name] = 'unavailable'; }
    }
    const metadata = { runId, implementation, endpoint, mode, profile: c.profile, vus, duration: writes && mode === 'smoke' ? '1 iteration' : duration,
      baseUrl: c.baseUrl, dataset: f.dataset, fixtureHash: f.hash, database: f.database,
      versions: { node: process.version, k6: k6Version, dependencies: installed },
      platform: platform(), osRelease: release(), cpu: cpus()[0]?.model, logicalCpus: cpus().length, memoryBytes: totalmem(),
      git: { revision: git(['rev-parse', 'HEAD']), changes: git(['status', '--short']) },
      policy: { pool: DATABASE_POOL_POLICY, isolation: TRANSACTION_ISOLATION_SQL, retryAttempts: MAX_TRANSACTION_ATTEMPTS },
      controls: { apm: process.env.API_APM_STATE || 'not verified', logging: process.env.API_LOGGING_STATE || 'not verified', warmup: process.env.WARMUP_NOTE || 'not performed by runner' },
      fixturePreparedAt: f.preparedAt, startedAt: new Date().toISOString() };
    await jsonFile(join(directory, 'metadata.json'), metadata);
    if (writes) await jsonFile(fixturePath + '.used', { runId, endpoint, startedAt: metadata.startedAt });
    const cli = ['run', '--quiet', '-e', `BASE_URL=${c.baseUrl}`, '-e', `IMPLEMENTATION=${implementation}`, '-e', `FIXTURES_FILE=${fixturePath.replace(/\\/g, '/')}`,
      '-e', `RUN_ID=${runId}`, '-e', 'RUNNER_MANAGED=true', '-e', `RESULT_FILE=${summary.replace(/\\/g, '/')}`];
    if (mode === 'load') cli.push('--vus', String(vus), '--duration', duration);
    cli.push(`tests/k6/${mode}/${endpoint}.js`);
    console.log(`Running ${endpoint} (${c.profile}), ${vus} VUs. Results: ${directory}`);
    const output = createWriteStream(join(directory, 'console.log'), { flags: 'wx' });
    const exitCode = await new Promise<number>((resolveCode, reject) => {
      const child = spawn(k6, cli, { env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
      child.stdout.pipe(output, { end: false });
      child.stderr.pipe(output, { end: false });
      child.stderr.pipe(process.stderr);
      child.on('error', reject);
      child.on('close', (code) => output.end(() => resolveCode(code ?? 1)));
    });
    await jsonFile(join(directory, 'exit.json'), { exitCode, completedAt: new Date().toISOString() });
    let verification = 0;
    if (writes) {
      verification = await new Promise<number>((resolveCode) => {
        const child = spawn(process.execPath, ['--import', 'tsx', 'tests/k6/tools/verify-writes.ts', summary], { stdio: 'inherit', env: process.env });
        child.on('error', () => resolveCode(1)); child.on('close', (code) => resolveCode(code ?? 1));
      });
    }
    console.log(`k6 exit=${exitCode}; verification=${verification}; ${summary}`);
    process.exitCode = exitCode || verification;
  } finally {
    await connection.end(); // releases the advisory lock even on failure
    if (lock) { await lock.close(); await unlink(lockPath); }
  }
}
main().catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
