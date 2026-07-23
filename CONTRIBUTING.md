# Contributing

Thank you for helping improve mkcert SSL for Local.

## Before opening an issue

- Confirm that Local and mkcert are current.
- Run `mkcert -install`.
- Restart Local and reproduce the problem.
- Search existing issues.
- Remove domains, usernames, paths, and other private information from logs.

## Development

1. Fork and clone the repository.
2. Install dependencies with `npm ci`.
3. Create a focused branch.
4. Make the change.
5. Run:

   ```sh
   npm run typecheck
   npm test
   ```

6. Test the packed `.tgz` in a currently supported Local release on macOS.
7. Open a pull request describing the behavior change and manual verification.

Keep external command execution on the Main process and use `execFile` with argument arrays.
Never interpolate domains or paths into a shell command.

## Releases

Maintainers update `package.json`, `package-lock.json`, and `CHANGELOG.md`, build from a clean
dependency installation, create the npm-compatible `.tgz`, tag the commit, and attach the exact
archive to the GitHub release.
