import { constants as fsConstants, promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type * as Local from '@getflywheel/local';
import { certificateNames, normalizeDomain } from './domain';
import { generateCertificateFiles, getMkcertStatus } from './mkcert';
import type { GenerateResult } from './shared';

export function routerCertificatePaths(domainInput: string): {
  directory: string;
  certificate: string;
  key: string;
} {
  const domain = normalizeDomain(domainInput);
  const directory = path.join(
    os.homedir(),
    'Library',
    'Application Support',
    'Local',
    'run',
    'router',
    'nginx',
    'certs',
  );

  return {
    directory,
    certificate: path.join(directory, `${domain}.crt`),
    key: path.join(directory, `${domain}.key`),
  };
}

async function backupOnce(source: string): Promise<void> {
  try {
    await fs.copyFile(source, `${source}.local-original`, fsConstants.COPYFILE_EXCL);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'EEXIST' && code !== 'ENOENT') {
      throw error;
    }
  }
}

async function replaceCertificatePair(
  generatedCertificate: string,
  generatedKey: string,
  destinationCertificate: string,
  destinationKey: string,
): Promise<void> {
  const suffix = `.mkcert-stage-${process.pid}-${Date.now()}`;
  const stagedCertificate = `${destinationCertificate}${suffix}`;
  const stagedKey = `${destinationKey}${suffix}`;
  const previousCertificate = await fs.readFile(destinationCertificate).catch(() => undefined);
  const previousKey = await fs.readFile(destinationKey).catch(() => undefined);

  try {
    await Promise.all([
      fs.copyFile(generatedCertificate, stagedCertificate),
      fs.copyFile(generatedKey, stagedKey),
    ]);
    await fs.chmod(stagedCertificate, 0o644);
    await fs.chmod(stagedKey, 0o600);
    await fs.rename(stagedCertificate, destinationCertificate);
    await fs.rename(stagedKey, destinationKey);
  } catch (error) {
    await Promise.allSettled([
      fs.rm(stagedCertificate, { force: true }),
      fs.rm(stagedKey, { force: true }),
      previousCertificate
        ? fs.writeFile(destinationCertificate, previousCertificate, { mode: 0o644 })
        : fs.rm(destinationCertificate, { force: true }),
      previousKey
        ? fs.writeFile(destinationKey, previousKey, { mode: 0o600 })
        : fs.rm(destinationKey, { force: true }),
    ]);
    throw error;
  }
}

export async function installCertificateForSite(
  site: Local.Site,
  reloadRouter: () => Promise<boolean>,
): Promise<GenerateResult> {
  const status = await getMkcertStatus();
  if (!status.ready || !status.binaryPath) {
    return {
      ok: false,
      domain: site.domain,
      message: status.guidance.join(' '),
    };
  }

  const domain = normalizeDomain(site.domain);
  const paths = routerCertificatePaths(domain);
  await fs.mkdir(paths.directory, { recursive: true });

  const generated = await generateCertificateFiles(
    status.binaryPath,
    certificateNames(domain, site.multiSiteDomains ?? []),
  );

  try {
    await Promise.all([backupOnce(paths.certificate), backupOnce(paths.key)]);
    await replaceCertificatePair(
      generated.certificate,
      generated.key,
      paths.certificate,
      paths.key,
    );
  } finally {
    await generated.cleanup();
  }

  try {
    const routerReloaded = await reloadRouter();
    return {
      ok: true,
      domain,
      certificatePath: paths.certificate,
      keyPath: paths.key,
      routerReloaded,
      message: routerReloaded
        ? `The mkcert certificate for ${domain} was installed and the Local router was reloaded.`
        : `The mkcert certificate for ${domain} was installed. The Local router is not running and will use it the next time it starts.`,
    };
  } catch (error) {
    return {
      ok: false,
      domain,
      certificatePath: paths.certificate,
      keyPath: paths.key,
      routerReloaded: false,
      message:
        `The certificate was written, but the router reload failed: ${errorMessage(error)} ` +
        'Quit Local completely and restart it.',
    };
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
