import assert from 'node:assert/strict';
import test from 'node:test';
import {
  hasMkcertHttpsEnabled,
  MKCERT_HTTPS_CUSTOM_OPTION,
  useMkcertHttpsUrl,
  withMkcertHttpsEnabled,
} from './site-https';

test('marks a site as HTTPS-ready without dropping other custom options', () => {
  const customOptions = withMkcertHttpsEnabled({ existingOption: 'keep' });

  assert.deepEqual(customOptions, {
    existingOption: 'keep',
    [MKCERT_HTTPS_CUSTOM_OPTION]: true,
  });
  assert.equal(hasMkcertHttpsEnabled({ customOptions }), true);
});

test('rewrites Local HTTP URLs only for an HTTPS-ready site', () => {
  const site = {
    customOptions: {
      [MKCERT_HTTPS_CUSTOM_OPTION]: true,
    },
  };

  assert.equal(useMkcertHttpsUrl('http://certtest.test', site), 'https://certtest.test');
  assert.equal(
    useMkcertHttpsUrl('http://certtest.test/wp-admin/?localwp_auto_login=1', site),
    'https://certtest.test/wp-admin/?localwp_auto_login=1',
  );
  assert.equal(useMkcertHttpsUrl('https://certtest.test', site), 'https://certtest.test');
});

test('leaves URLs unchanged until mkcert has enabled HTTPS for the site', () => {
  assert.equal(
    useMkcertHttpsUrl('http://certtest.test/wp-admin/', { customOptions: {} }),
    'http://certtest.test/wp-admin/',
  );
});
