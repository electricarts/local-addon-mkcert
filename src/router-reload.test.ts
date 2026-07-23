import assert from 'node:assert/strict';
import test from 'node:test';
import { parseRouterPid } from './router-reload';

test('parseRouterPid accepts a positive nginx master PID', () => {
  assert.equal(parseRouterPid('12345\n'), 12345);
});

test('parseRouterPid rejects empty, malformed, and unsafe values', () => {
  for (const value of ['', 'nginx', '0', '-2', '1']) {
    assert.throws(() => parseRouterPid(value));
  }
});
