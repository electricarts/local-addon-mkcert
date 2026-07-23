# Security policy

## Supported versions

Security fixes are applied to the latest released version.

## Reporting a vulnerability

Do not open a public issue for a vulnerability.

Use GitHub's private vulnerability reporting feature:

1. Open the repository's **Security** tab.
2. Choose **Report a vulnerability**.
3. Include affected versions, reproduction steps, impact, and any suggested mitigation.

Please allow a reasonable amount of time to investigate before public disclosure.

## Sensitive files

Never attach or commit:

- `rootCA-key.pem`
- private keys generated for Local sites
- complete Local logs containing private paths or site details

The mkcert root CA private key can issue certificates trusted by the local machine and must be
treated as a sensitive credential.
