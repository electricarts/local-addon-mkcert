import type * as Local from '@getflywheel/local';
import * as LocalMain from '@getflywheel/local/main';
import { errorMessage, installCertificateForSite } from './certificates';
import { getMkcertStatus } from './mkcert';
import { reloadRouter } from './router-reload';
import {
  IPC_GENERATE_FOR_SITE,
  IPC_GET_STATUS,
  type GenerateResult,
} from './shared';

let operationQueue: Promise<void> = Promise.resolve();
const LOCAL_SSL_BANNER_IDS = ['site-trust-error', 'ssl-untrusted'] as const;

function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const result = operationQueue.then(operation, operation);
  operationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export default function (context: LocalMain.AddonMainContext): void {
  const { localLogger, router, siteData } = LocalMain.getServiceContainer().cradle;
  const logger = localLogger.child({
    thread: 'main',
    addon: 'mkcert-ssl',
  });

  const generateForSite = async (site: Local.Site, source: 'manual' | 'siteAdded'): Promise<GenerateResult> =>
    serialize(async () => {
      logger.info(`Starting ${source} mkcert workflow for site ${site.id} (${site.domain}).`);

      try {
        const result = await installCertificateForSite(site, () => reloadRouter(router));
        if (result.ok) {
          logger.info(result.message);
          try {
            for (const id of LOCAL_SSL_BANNER_IDS) {
              LocalMain.sendIPCEvent('clearSiteBanner', {
                siteID: site.id,
                id,
              });
            }
            LocalMain.sendIPCEvent('siteCertTrusted', site, true);
          } catch (error) {
            logger.warn(
              `The certificate was installed, but Local's SSL status could not be refreshed: ${errorMessage(error)}`,
            );
          }
        } else {
          logger.warn(result.message);
        }
        return result;
      } catch (error) {
        const message = `mkcert workflow for ${site.domain} failed: ${errorMessage(error)}`;
        logger.error(message);
        return {
          ok: false,
          domain: site.domain,
          message,
        };
      }
    });

  LocalMain.addIpcAsyncListener(IPC_GET_STATUS, async () => getMkcertStatus());

  LocalMain.addIpcAsyncListener(
    IPC_GENERATE_FOR_SITE,
    async (siteId: Local.Site['id']): Promise<GenerateResult> => {
      const site = siteData.getSite(siteId);
      if (!site) {
        return {
          ok: false,
          message: `The site with ID ${siteId} was not found.`,
        };
      }
      return generateForSite(site, 'manual');
    },
  );

  LocalMain.HooksMain.addAction('siteAdded', async (site: Local.Site) => {
    const result = await generateForSite(site, 'siteAdded');
    if (!result.ok) {
      context.notifier.notify({
        title: 'mkcert SSL',
        message: result.message,
      });
    }
  });

  void getMkcertStatus()
    .then((status) => {
      if (status.ready) {
        logger.info(`mkcert ${status.version ?? ''} is ready at ${status.binaryPath}.`);
      } else {
        logger.warn(status.guidance.join(' '));
      }
    })
    .catch((error) => logger.error(`Could not inspect mkcert: ${errorMessage(error)}`));
}
