import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { routerCertificatePaths } from './certificates';

test('routerCertificatePaths uses Local router certificate filenames', () => {
  const result = routerCertificatePaths('example.local');
  assert.equal(result.certificate, path.join(result.directory, 'example.local.crt'));
  assert.equal(result.key, path.join(result.directory, 'example.local.key'));
  assert.match(result.directory, /Local[\\/]run[\\/]router[\\/]nginx[\\/]certs$/);
});
