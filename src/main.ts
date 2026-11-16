import type * as Local from '@getflywheel/local';
import * as LocalMain from '@getflywheel/local/main';
import { errorMessage, installCertificateForSite } from './certificates';
import { getMkcertStatus } from './mkcert';
import { reloadRouter } from './router-reload';
import { hasMkcertHttpsEnabled, withMkcertHttpsEnabled } from './site-https';
import { getWordPressHttpsUrls } from './wordpress-urls';
import {
  IPC_GENERATE_FOR_SITE,
  IPC_GET_STATUS,
  type GenerateResult,
} from './shared';

let operationQueue: Promise<void> = Promise.resolve();
let initialized = false;
const LOCAL_SSL_BANNER_IDS = ['site-trust-error', 'ssl-untrusted'] as const;
const AUTOMATIC_WORKFLOW_DELAYS_MS = [2_000, 7_000, 15_000] as const;

type AutomaticWorkflowSource =
  | 'siteAdded'
  | 'wordPressInstaller:standardInstall'
  | 'wordPressInstaller:import'
  | 'wordPressInstaller:import:includesWP';

type WorkflowSource = 'manual' | AutomaticWorkflowSource;

interface ScheduledAutomaticWorkflow {
  site: Local.Site;
  source: AutomaticWorkflowSource;
  attempt: number;
  timer?: ReturnType<typeof setTimeout>;
}

function refreshLocalSslStatus(site: Local.Site): void {
  // Let Local recalculate its certificate status first. Clearing afterwards avoids
  // Local's asynchronous check re-adding the stale ssl-untrusted banner.
  LocalMain.sendIPCEvent('siteCertTrusted', site, true);
  for (const id of LOCAL_SSL_BANNER_IDS) {
    LocalMain.sendIPCEvent('clearSiteBanner', {
      siteID: site.id,
      id,
    });
  }
}

function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const result = operationQueue.then(operation, operation);
  operationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export default function (context: LocalMain.AddonMainContext): void {
  // Local can initialize add-ons more than once while it refreshes its service
  // graph. Registering the same IPC listeners and actions repeatedly makes
  // automatic workflows unreliable and produces duplicate-listener warnings.
  if (initialized) {
    return;
  }
  initialized = true;

  const { localLogger, router, siteData, wpCli } = LocalMain.getServiceContainer().cradle;
  const logger = localLogger.child({
    thread: 'main',
    addon: 'mkcert-ssl',
  });

  const automaticWorkflows = new Map<string, ScheduledAutomaticWorkflow>();

  const generateForSite = async (site: Local.Site, source: WorkflowSource): Promise<GenerateResult> =>
    serialize(async () => {
      logger.info(`Starting ${source} mkcert workflow for site ${site.id} (${site.domain}).`);

      try {
        const result = await installCertificateForSite(site, () => reloadRouter(router));
        if (result.ok) {
          let httpsEnabled = false;
          let wordpressUrlsUpdated = false;
          let wordpressUrlError: string | undefined;

          try {
            const [home, siteurl] = await Promise.all([
              wpCli.getOption(site, 'home'),
              wpCli.getOption(site, 'siteurl'),
            ]);
            const httpsUrls = getWordPressHttpsUrls(home, siteurl);

            if (home?.trim() !== httpsUrls.home) {
              await wpCli.run(site, ['option', 'update', 'home', httpsUrls.home]);
            }
            if (siteurl?.trim() !== httpsUrls.siteurl) {
              await wpCli.run(site, ['option', 'update', 'siteurl', httpsUrls.siteurl]);
            }

            const [verifiedHome, verifiedSiteurl] = await Promise.all([
              wpCli.getOption(site, 'home'),
              wpCli.getOption(site, 'siteurl'),
            ]);
            if (
              verifiedHome?.trim() !== httpsUrls.home ||
              verifiedSiteurl?.trim() !== httpsUrls.siteurl
            ) {
              throw new Error('Local could not verify the updated WordPress URL options.');
            }
            wordpressUrlsUpdated = true;
          } catch (error) {
            wordpressUrlError = errorMessage(error);
            logger.warn(
              `The certificate was installed, but WordPress home/siteurl could not be switched to HTTPS: ${wordpressUrlError}`,
            );
          }

          try {
            siteData.updateSite(site.id, {
              customOptions: withMkcertHttpsEnabled(site.customOptions),
            });
            httpsEnabled = true;
          } catch (error) {
            logger.warn(
              `The certificate was installed, but Local's HTTPS URL preference could not be saved: ${errorMessage(error)}`,
            );
          }

          const resultWithHttps: GenerateResult = {
            ...result,
            httpsEnabled,
            wordpressUrlsUpdated,
            message: [
              result.message,
              httpsEnabled
                ? `Local's Open site and WP Admin actions now use HTTPS.`
                : `Local's HTTPS URL preference could not be saved; Open site and WP Admin may still use HTTP.`,
              wordpressUrlsUpdated
                ? `WordPress home and siteurl now use HTTPS.`
                : `WordPress home/siteurl could not be updated automatically${wordpressUrlError ? `: ${wordpressUrlError}` : '.'}`,
            ].join(' '),
          };

          logger.info(resultWithHttps.message);
          try {
            refreshLocalSslStatus(site);
          } catch (error) {
            logger.warn(
              `The certificate was installed, but Local's SSL status could not be refreshed: ${errorMessage(error)}`,
            );
          }
          return resultWithHttps;
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

  const runAutomaticWorkflow = async (workflow: ScheduledAutomaticWorkflow): Promise<void> => {
    const currentSite = siteData.getSite(workflow.site.id);
    if (!currentSite) {
      automaticWorkflows.delete(workflow.site.id);
      logger.warn(
        `Skipping automatic mkcert workflow because site ${workflow.site.id} no longer exists.`,
      );
      return;
    }

    const result = await generateForSite(currentSite, workflow.source);
    const complete =
      result.ok && result.httpsEnabled !== false && result.wordpressUrlsUpdated !== false;

    if (complete) {
      automaticWorkflows.delete(workflow.site.id);
      return;
    }

    const nextAttempt = workflow.attempt + 1;
    if (nextAttempt < AUTOMATIC_WORKFLOW_DELAYS_MS.length) {
      workflow.attempt = nextAttempt;
      workflow.timer = setTimeout(() => {
        void runAutomaticWorkflow(workflow);
      }, AUTOMATIC_WORKFLOW_DELAYS_MS[nextAttempt]);
      logger.info(
        `Automatic mkcert setup for ${currentSite.domain} is not complete yet; retrying in ${AUTOMATIC_WORKFLOW_DELAYS_MS[nextAttempt] / 1000}s.`,
      );
      return;
    }

    automaticWorkflows.delete(workflow.site.id);
    context.notifier.notify({
      title: 'mkcert SSL',
      message: result.message,
    });
  };

  const scheduleAutomaticWorkflow = (
    site: Local.Site,
    source: AutomaticWorkflowSource,
  ): void => {
    const existing = automaticWorkflows.get(site.id);
    if (existing) {
      existing.site = site;
      existing.source = source;
      return;
    }

    const workflow: ScheduledAutomaticWorkflow = {
      site,
      source,
      attempt: 0,
    };
    automaticWorkflows.set(site.id, workflow);
    workflow.timer = setTimeout(() => {
      void runAutomaticWorkflow(workflow);
    }, AUTOMATIC_WORKFLOW_DELAYS_MS[0]);
  };

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

  const hooks = context.hooks;
  const automaticHooks: AutomaticWorkflowSource[] = [
    'siteAdded',
    'wordPressInstaller:standardInstall',
    'wordPressInstaller:import',
    'wordPressInstaller:import:includesWP',
  ];

  for (const hook of automaticHooks) {
    hooks.addAction(hook, (site: Local.Site) => {
      logger.info(`Received ${hook} for site ${site.id} (${site.domain}); scheduling mkcert setup.`);
      scheduleAutomaticWorkflow(site, hook);
    });
  }

  hooks.addAction('siteStarted', (site: Local.Site) => {
    if (!hasMkcertHttpsEnabled(site)) {
      return;
    }

    try {
      refreshLocalSslStatus(site);
    } catch (error) {
      logger.warn(
        `The mkcert certificate is installed, but Local's SSL banner could not be cleared after site start: ${errorMessage(error)}`,
      );
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
