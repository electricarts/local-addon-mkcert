# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.1.2]: https://github.com/electricarts/local-addon-mkcert/releases/tag/v0.1.2
