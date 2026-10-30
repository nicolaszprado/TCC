import 'dotenv/config';

import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

import { benchmarkTarget, endpoints, isWrite } from '../lib/config.js';
import { db, jsonFile, positive } from './common.js';

type CampaignOptions = {
  endpoint: string;
  implementation: string;
  baseUrl: string;
  profile: string;
  vus: number;
  duration: string;
  repetitions: number;
  warmup: string;
  resetWrites: boolean;
  dryRun: boolean;
};

type RunRecord = {
  runId: string;
  phase: 'warmup' | 'measurement';
  round: number | null;
  duration: string;
  fixtureFile: string | null;
  status: 'running' | 'passed' | 'failed';
  startedAt: string;
  completedAt?: string;
  error?: string;
};

const usage = `Usage:
  npm run k6:campaign -- <endpoint> [options]

Options:
  --implementation raw-sql|typeorm|prisma  (default: raw-sql)
  --profile baseline|filtered|paginated|three-items (default: baseline)
  --vus N                                  (default: 10, maximum: 100)
  --duration 3m                            (default: 3m)
  --repetitions N                          (default: 5, maximum: 20)
  --warmup 1m                              (default: 1m)
  --reset-writes                           required for POST/PATCH; resets the database before every run
  --dry-run                                print the plan without changing anything
  --help`;

function duration(value: string | undefined, fallback: string, name: string): string {
  const result = value ?? fallback;
  if (!/^[1-9]\d*[smh]$/.test(result)) throw new Error(`${name} must be positive seconds, minutes or hours (example: 3m)`);
  return result;
}

function durationSeconds(value: string): number {
  const amount = Number.parseInt(value, 10);
  const unit = value.at(-1);
  return amount * (unit === 'h' ? 3600 : unit === 'm' ? 60 : 1);
}

function parse(argv: string[]): CampaignOptions | null {
  if (argv.includes('--help')) return null;
  const [endpoint, ...args] = argv;
  if (!endpoint || !endpoints.includes(endpoint)) throw new Error(usage);

  const values: Record<string, string> = {};
  const booleans = new Set<string>();
  const valueFlags = new Set(['--implementation', '--profile', '--vus', '--duration', '--repetitions', '--warmup']);
  const booleanFlags = new Set(['--reset-writes', '--dry-run']);
  for (let index = 0; index < args.length; index++) {
    const flag = args[index]!;
    if (booleanFlags.has(flag)) {
      if (booleans.has(flag)) throw new Error(`${flag} may be used only once`);
      booleans.add(flag);
      continue;
    }
    if (!valueFlags.has(flag) || !args[index + 1] || values[flag] !== undefined) throw new Error(usage);
    values[flag] = args[++index]!;
  }

  const target = benchmarkTarget(process.env, values['--implementation']);
  const profile = values['--profile'] ?? process.env.PROFILE ?? 'baseline';
  const profiles = endpoint.startsWith('list-') ? ['baseline', 'filtered', 'paginated']
    : endpoint === 'create-order' ? ['baseline', 'three-items'] : ['baseline'];
  if (!profiles.includes(profile)) throw new Error(`Invalid profile '${profile}' for ${endpoint}: ${profiles.join(', ')}`);

  const vus = positive(values['--vus'], 10, 'vus');
  const repetitions = positive(values['--repetitions'], 5, 'repetitions');
  if (vus > 100) throw new Error('vus must be <= 100');
  if (repetitions > 20) throw new Error('repetitions must be <= 20');

  const resetWrites = booleans.has('--reset-writes');
  if (resetWrites && !isWrite(endpoint)) throw new Error('--reset-writes is accepted only for create-order and update-product-stock');

  return {
    endpoint,
    implementation: target.implementation,
    baseUrl: target.baseUrl,
    profile,
    vus,
    duration: duration(values['--duration'], '3m', 'duration'),
    repetitions,
    warmup: duration(values['--warmup'], '1m', 'warmup'),
    resetWrites,
    dryRun: booleans.has('--dry-run'),
  };
}

function execute(file: string, args: string[], env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', file, ...args], { env, stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolveRun() : reject(new Error(`${file} exited with code ${code ?? 1}`)));
  });
}

async function main(): Promise<void> {
  const parsedOptions = parse(process.argv.slice(2));
  if (!parsedOptions) {
    console.log(usage);
    return;
  }
  const options = parsedOptions;

  const writes = isWrite(options.endpoint);
  const plannedSeconds = durationSeconds(options.warmup) + options.repetitions * durationSeconds(options.duration);
  const plan = {
    ...options,
    writes,
    plannedRuns: options.repetitions + 1,
    plannedDurationSeconds: plannedSeconds,
    note: writes ? 'Database reset/load/write preparation occurs before warm-up and every measurement.' : 'Read fixture is reused; the database is not changed.',
  };
  if (options.dryRun) {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  if (writes && !options.resetWrites) {
    throw new Error('Write campaigns reset and reload the database. Confirm with --reset-writes.');
  }
  if (writes && (process.env.ALLOW_WRITES !== 'true' || process.env.BENCHMARK_DB_CONFIRM !== db.database)) {
    throw new Error(`Write campaign requires ALLOW_WRITES=true and BENCHMARK_DB_CONFIRM=${db.database}`);
  }

  const campaignId = `${options.implementation}-${options.endpoint}-${options.profile}-${options.vus}vus-${Date.now()}`;
  const campaignDirectory = resolve('tests/k6/results', options.implementation, `campaign-${campaignId}`);
  await mkdir(campaignDirectory, { recursive: false });
  const reportPath = resolve(campaignDirectory, 'campaign.json');
  const runs: RunRecord[] = [];
  const report = {
    version: 1,
    campaignId,
    status: 'running',
    startedAt: new Date().toISOString(),
    completedAt: null as string | null,
    plan,
    runs,
  };
  await jsonFile(reportPath, report);

  const baseEnvironment: NodeJS.ProcessEnv = {
    ...process.env,
    IMPLEMENTATION: options.implementation,
    BASE_URL: options.baseUrl,
    PROFILE: options.profile,
  };
  // Official campaigns use fixture variability instead of stale diagnostic selectors.
  for (const key of ['PRODUCT_ID', 'ORDER_ID', 'CUSTOMER_ID', 'MIN_PRODUCT_ID', 'MAX_PRODUCT_ID']) {
    delete baseEnvironment[key];
  }
  if (writes) {
    baseEnvironment.MAX_VUS = String(options.vus);
    baseEnvironment.MAX_ORDERS_PER_VU ||= '100000';
    baseEnvironment.QUANTITY ||= '1';
    baseEnvironment.ITEMS_PER_ORDER = options.profile === 'three-items' ? '3' : '1';
  }

  async function run(label: string, phase: RunRecord['phase'], round: number | null, runDuration: string): Promise<void> {
    const runId = `${campaignId}-${label}`;
    let environment: NodeJS.ProcessEnv = { ...baseEnvironment };
    let fixtureFile: string | null = process.env.FIXTURES_FILE ? resolve(process.env.FIXTURES_FILE) : null;
    const record: RunRecord = {
      runId,
      phase,
      round,
      duration: runDuration,
      fixtureFile,
      status: 'running',
      startedAt: new Date().toISOString(),
    };
    runs.push(record);
    await jsonFile(reportPath, report, false);
    try {
      if (writes) {
        fixtureFile = resolve(campaignDirectory, `fixtures-${label}.json`);
        record.fixtureFile = fixtureFile;
        environment = { ...environment, FIXTURES_FILE: fixtureFile };
        console.log(`\n[${label}] Restoring ${db.database} and preparing isolated write fixtures...`);
        await execute('database/scripts/reset.ts', [], environment);
        await execute('database/scripts/load.ts', [], environment);
        await execute('tests/k6/tools/prepare-fixtures.ts', ['--writes'], environment);
      }
      environment.RUN_ID = runId;
      environment.PHASE = phase;
      environment.WARMUP_NOTE = phase === 'warmup'
        ? 'campaign warm-up; excluded from official measurements'
        : `${options.warmup} campaign warm-up completed before the measurement rounds`;
      console.log(`\n[${label}] ${options.implementation} ${options.endpoint}/${options.profile}: ${options.vus} VUs for ${runDuration}`);
      await execute('tests/k6/tools/run.ts', [options.endpoint, 'load', '--implementation', options.implementation,
        '--vus', String(options.vus), '--duration', runDuration], environment);
      record.status = 'passed';
    } catch (error) {
      record.status = 'failed';
      record.error = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      record.completedAt = new Date().toISOString();
      await jsonFile(reportPath, report, false);
    }
  }

  try {
    await run('warmup', 'warmup', null, options.warmup);
    for (let round = 1; round <= options.repetitions; round++) {
      await run(`round-${String(round).padStart(2, '0')}`, 'measurement', round, options.duration);
    }
    report.status = 'passed';
    console.log(`\nCampaign passed. Report: ${reportPath}`);
  } catch (error) {
    report.status = 'failed';
    console.error(`\nCampaign failed. Evidence preserved at ${reportPath}`);
    throw error;
  } finally {
    report.completedAt = new Date().toISOString();
    await jsonFile(reportPath, report, false);
  }
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
