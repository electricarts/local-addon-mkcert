# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.11] - 2026-10-04

### Fixed

- Remove stale Local SSL trust banners directly from the visible renderer banner store after
  Local's asynchronous certificate check.

## [0.1.10] - 2026-10-04

### Fixed

- Clear Local's stale HTTPS trust banner after Local's own certificate status refresh.
- Repeat the banner cleanup when a mkcert-configured site starts.

## [0.1.9] - 2026-10-04

### Added

- Mark successfully configured sites as HTTPS-ready for Local's built-in **Open site** and
  **WP Admin** actions.
- Clarify that trusted mkcert certificates require no additional Local Trust action.
- Automatically switch WordPress `home` and `siteurl` to HTTPS after certificate installation.

### Changed

- Preserve WordPress hosts and paths while changing only the URL protocol to HTTPS.

## [0.1.8] - 2026-07-24

### Changed

- Use a saturated, higher-contrast red for error messages in Local's dark interface.

## [0.1.7] - 2026-07-24

### Fixed

- Treat a missing or stale router PID as a stopped router instead of a certificate error.
- Confirm that the installed certificate will be used when Local's router starts again.

## [0.1.6] - 2026-07-23

### Fixed

- Clear stale Local SSL trust banners after a successful mkcert installation.
- Ask Local to recheck its built-in certificate trust status.

## [0.1.5] - 2026-07-23

### Changed

- Explain that existing Local certificates can be replaced with trusted mkcert certificates.
- Clarify the certificate generation and mkcert status button labels.

## [0.1.4] - 2026-07-23

### Fixed

- Constrain the mkcert panel width so Local's site information remains readable.
- Allow long domains and status messages to wrap without expanding the panel.

## [0.1.3] - 2026-07-23

### Fixed

- Make the test command portable across macOS and Linux.
- Test against Node.js versions supported by the current Local development dependency.

## [0.1.2] - 2026-07-23

### Added

- Automatic certificate generation through Local's `siteAdded` action.
- Manual certificate generation on the Site Overview.
- mkcert binary and root CA detection on macOS.
- Domain validation, multisite SAN support, backups, logging, and serialized operations.
- Safe router configuration refresh and nginx reload.
- English user interface and Local-themed controls.

### Fixed

- Avoid starting a duplicate Local router that could cause port 80/443 conflicts.
- Remove a stretched panel border in Local's Site Overview.

[0.1.11]: https://github.com/electricarts/local-addon-mkcert/releases/tag/v0.1.11
[0.1.10]: https://github.com/electricarts/local-addon-mkcert/releases/tag/v0.1.10
[0.1.9]: https://github.com/electricarts/local-addon-mkcert/releases/tag/v0.1.9
[0.1.8]: https://github.com/electricarts/local-addon-mkcert/releases/tag/v0.1.8
[0.1.7]: https://github.com/electricarts/local-addon-mkcert/releases/tag/v0.1.7
[0.1.6]: https://github.com/electricarts/local-addon-mkcert/releases/tag/v0.1.6
[0.1.5]: https://github.com/electricarts/local-addon-mkcert/releases/tag/v0.1.5
[0.1.4]: https://github.com/electricarts/local-addon-mkcert/releases/tag/v0.1.4
[0.1.3]: https://github.com/electricarts/local-addon-mkcert/releases/tag/v0.1.3
[0.1.2]: https://github.com/electricarts/local-addon-mkcert/releases/tag/v0.1.2
