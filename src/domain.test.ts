import assert from 'node:assert/strict';
import test from 'node:test';
import { certificateNames, normalizeDomain } from './domain';

test('normalizeDomain accepts and normalizes a Local hostname', () => {
  assert.equal(normalizeDomain('Example-Site.LOCAL.'), 'example-site.local');
});

test('normalizeDomain rejects traversal and shell-like input', () => {
  for (const value of ['../example.local', 'example.local;open /', 'bad label.local', '']) {
    assert.throws(() => normalizeDomain(value));
  }
});

test('certificateNames includes wildcard, loopback names, and multisite domains', () => {
  assert.deepEqual(certificateNames('example.local', ['sub.example.local']), [
    'example.local',
    '*.example.local',
    'localhost',
    '127.0.0.1',
    '::1',
    'sub.example.local',
  ]);
});
