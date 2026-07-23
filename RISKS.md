# Known risks and limitations

## Router reload

Version 0.1.0 used Local's `router.restart(false)` service. On Local 10.1.1 this could start a
second nginx process while an older router worker still held ports 80 and 443. Version 0.1.1
removed that behavior.

The current implementation:

1. refreshes Local's router configuration;
2. reads Local's router PID file;
3. validates that the PID belongs to a running process;
4. asks Local's bundled nginx binary to reload its configuration.

If the PID file is stale, the add-on does not start or terminate another process. It asks the
user to quit and restart Local.

## Local may replace certificates

A Local update, domain change, Trust action, or router rebuild can overwrite the mkcert files.
Changing the domain of an existing site does not fire `siteAdded`; use the manual action after a
domain change.

## Local-specific file paths

The macOS MVP writes to:

```text
~/Library/Application Support/Local/run/router/nginx/certs/
```

If Local changes this internal path, the add-on will require an update. Windows and Linux are
not currently supported.

## Certificate/key replacement

The certificate and key are staged before replacement. They are two separate filesystem
objects, so their final renames cannot form one atomic operation. The router reload happens only
after both renames. On a write failure, the add-on attempts to restore the previous pair.

## Root CA detection

The add-on compares the fingerprint of mkcert's `rootCA.pem` with matching certificates in the
login and system Keychains. This covers the standard mkcert macOS workflow but is not a complete
evaluation of every custom trust policy.

The add-on intentionally never runs `mkcert -install`; that operation may require administrator
permission and changes the system trust store.

## Firefox

Firefox can use a separate NSS certificate store. Installing `nss` and running `mkcert -install`
again may be required. A successful macOS Keychain check does not prove that every Firefox
profile is configured.

## Multisite changes

Domains present in `site.multiSiteDomains` are added as SANs. Domains added to an existing
multisite later do not automatically trigger a new certificate; use the manual action.

## Compatibility

The add-on is built and tested against `@getflywheel/local` 10.1.1 and declares support for
Local 9 or later. Test each newly released major Local version before relying on the add-on in a
critical workflow.
