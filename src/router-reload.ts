import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import type { Services } from '@getflywheel/local/main';

const execFileAsync = promisify(execFile);

export function parseRouterPid(value: string): number {
  const pid = Number.parseInt(value.trim(), 10);
  if (!Number.isSafeInteger(pid) || pid <= 1) {
    throw new Error('The Local router PID file is invalid.');
  }
  return pid;
}

function assertProcessExists(pid: number): void {
  try {
    process.kill(pid, 0);
  } catch {
    throw new Error(
      'The Local router PID file is stale. Quit Local completely and restart it.',
    );
  }
}

/**
 * Rebuild Local's router configuration and ask the already running nginx master
 * to reload it. We intentionally do not call router.restart(): Local 10 can
 * leave an older router worker attached to ports 80/443, causing a second
 * process to fail with "Address already in use".
 */
export async function reloadRouter(router: Services.Router): Promise<void> {
  await router.refresh();

  const runPath = path.join(
    os.homedir(),
    'Library',
    'Application Support',
    'Local',
    'run',
    'router',
    'nginx',
  );
  const configPath = path.join(runPath, 'conf', 'nginx.conf');
  const pidPath = path.join(runPath, 'logs', 'nginx.pid');
  const pid = parseRouterPid(await fs.readFile(pidPath, 'utf8'));
  assertProcessExists(pid);

  await execFileAsync(
    router.nginxPath,
    ['-s', 'reload', '-c', configPath, '-p', runPath],
    {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024,
      timeout: 30_000,
    },
  );
}
