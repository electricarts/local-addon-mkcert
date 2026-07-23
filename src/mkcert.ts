import { execFile } from 'node:child_process';
import { constants as fsConstants, promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { createPrivateKey, X509Certificate } from 'node:crypto';
import type { MkcertStatus } from './shared';

const execFileAsync = promisify(execFile);
const EXEC_OPTIONS = {
  encoding: 'utf8' as BufferEncoding,
  maxBuffer: 1024 * 1024,
  timeout: 30_000,
};

async function canExecute(candidate: string): Promise<string | null> {
  try {
    const { stdout, stderr } = await execFileAsync(candidate, ['-version'], EXEC_OPTIONS);
    return `${stdout}${stderr}`.trim() || 'unknown version';
  } catch {
    return null;
  }
}

export async function findMkcert(): Promise<{ path: string; version: string } | null> {
  const candidates = [
    process.env.MKCERT,
    'mkcert',
    '/opt/homebrew/bin/mkcert',
    '/usr/local/bin/mkcert',
    '/opt/local/bin/mkcert',
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of [...new Set(candidates)]) {
    const version = await canExecute(candidate);
    if (version) {
      return { path: candidate, version };
    }
  }

  return null;
}

async function getCARoot(binaryPath: string): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync(binaryPath, ['-CAROOT'], EXEC_OPTIONS);
    const caRoot = stdout.trim();
    return caRoot.length > 0 ? caRoot : undefined;
  } catch {
    return undefined;
  }
}

function pemCertificates(pem: string): string[] {
  return pem.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g) ?? [];
}

async function isRootCAInKeychain(rootCAPath: string): Promise<boolean> {
  let rootFingerprint: string;
  try {
    rootFingerprint = new X509Certificate(await fs.readFile(rootCAPath)).fingerprint256;
  } catch {
    return false;
  }

  const keychains = [
    path.join(os.homedir(), 'Library', 'Keychains', 'login.keychain-db'),
    '/Library/Keychains/System.keychain',
  ];

  for (const keychain of keychains) {
    try {
      const { stdout } = await execFileAsync(
        '/usr/bin/security',
        ['find-certificate', '-a', '-c', 'mkcert', '-p', keychain],
        EXEC_OPTIONS,
      );

      if (
        pemCertificates(stdout).some(
          (certificate) => new X509Certificate(certificate).fingerprint256 === rootFingerprint,
        )
      ) {
        return true;
      }
    } catch {
      // A missing keychain or no matching certificate is a normal "not trusted" result.
    }
  }

  return false;
}

export async function getMkcertStatus(): Promise<MkcertStatus> {
  if (process.platform !== 'darwin') {
    return {
      platformSupported: false,
      caFilesPresent: false,
      caTrusted: false,
      ready: false,
      guidance: ['This add-on currently supports macOS only.'],
    };
  }

  const binary = await findMkcert();
  if (!binary) {
    return {
      platformSupported: true,
      caFilesPresent: false,
      caTrusted: false,
      ready: false,
      guidance: ['mkcert was not found.', 'Install it with: brew install mkcert'],
    };
  }

  const caRoot = await getCARoot(binary.path);
  const rootCAPath = caRoot ? path.join(caRoot, 'rootCA.pem') : undefined;
  const rootKeyPath = caRoot ? path.join(caRoot, 'rootCA-key.pem') : undefined;
  const caFilesPresent = Boolean(
    rootCAPath &&
      rootKeyPath &&
      (await Promise.all([
        fs.access(rootCAPath, fsConstants.R_OK).then(() => true, () => false),
        fs.access(rootKeyPath, fsConstants.R_OK).then(() => true, () => false),
      ])).every(Boolean),
  );
  const caTrusted = Boolean(rootCAPath && caFilesPresent && (await isRootCAInKeychain(rootCAPath)));
  const guidance: string[] = [];

  if (!caFilesPresent || !caTrusted) {
    guidance.push(
      'The mkcert root CA is not fully configured or was not found in the macOS Keychain.',
      'Run once in Terminal: mkcert -install',
      'Then check the status again in Local.',
    );
  }

  return {
    platformSupported: true,
    binaryPath: binary.path,
    version: binary.version,
    caRoot,
    caFilesPresent,
    caTrusted,
    ready: caFilesPresent && caTrusted,
    guidance,
  };
}

export interface GeneratedFiles {
  certificate: string;
  key: string;
  cleanup: () => Promise<void>;
}

export async function generateCertificateFiles(
  binaryPath: string,
  names: string[],
): Promise<GeneratedFiles> {
  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'local-mkcert-'));
  const certificate = path.join(temporaryDirectory, 'certificate.crt');
  const key = path.join(temporaryDirectory, 'certificate.key');

  try {
    await execFileAsync(
      binaryPath,
      ['-cert-file', certificate, '-key-file', key, ...names],
      EXEC_OPTIONS,
    );

    const [certificatePem, keyPem] = await Promise.all([
      fs.readFile(certificate),
      fs.readFile(key),
    ]);
    new X509Certificate(certificatePem);
    createPrivateKey(keyPem);

    return {
      certificate,
      key,
      cleanup: () => fs.rm(temporaryDirectory, { recursive: true, force: true }),
    };
  } catch (error) {
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
    throw error;
  }
}
