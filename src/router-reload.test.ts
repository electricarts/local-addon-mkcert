import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { parseRouterPid, readRouterPid } from './router-reload';

test('parseRouterPid accepts a positive nginx master PID', () => {
  assert.equal(parseRouterPid('12345\n'), 12345);
});

test('parseRouterPid rejects empty, malformed, and unsafe values', () => {
  for (const value of ['', 'nginx', '0', '-2', '1']) {
    assert.throws(() => parseRouterPid(value));
  }
});

test('readRouterPid treats a missing PID file as a stopped router', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mkcert-router-test-'));
  try {
    assert.equal(await readRouterPid(path.join(directory, 'nginx.pid')), null);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
