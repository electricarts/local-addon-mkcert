import assert from 'node:assert/strict';
import test from 'node:test';
import { getWordPressHttpsUrls, useHttpsProtocol } from './wordpress-urls';

test('changes only the protocol and preserves paths and trailing slashes', () => {
  assert.equal(
    useHttpsProtocol('http://certtest.test/wp'),
    'https://certtest.test/wp',
  );
  assert.equal(useHttpsProtocol('https://certtest.test/'), 'https://certtest.test/');
});

test('builds HTTPS values for both WordPress URL options', () => {
  assert.deepEqual(
    getWordPressHttpsUrls('http://certtest.test', 'http://certtest.test/wp'),
    {
      home: 'https://certtest.test',
      siteurl: 'https://certtest.test/wp',
    },
  );
});

test('rejects missing or malformed WordPress URL options', () => {
  assert.throws(() => getWordPressHttpsUrls(null, 'http://certtest.test'), /home/);
  assert.throws(() => getWordPressHttpsUrls('http://certtest.test', 'certtest.test'), /absolute/);
});
