import type * as Local from '@getflywheel/local';
import * as LocalRenderer from '@getflywheel/local/renderer';
import { hasMkcertHttpsEnabled, useMkcertHttpsUrl } from './site-https';
import type { MkcertStatus, GenerateResult } from './shared';
import { IPC_GENERATE_FOR_SITE, IPC_GET_STATUS } from './shared';

const LOCAL_SSL_BANNER_IDS = ['site-trust-error', 'ssl-untrusted'] as const;

export default function (context: LocalRenderer.AddonRendererContext): void {
  const { React, hooks, store } = context;
  const { useCallback, useEffect, useState } = React;

  hooks.addFilter('siteUrl', (url: string, site: Local.Site) => useMkcertHttpsUrl(url, site));
  hooks.addFilter('siteAdminUrl', (url: string, site: Local.Site) => useMkcertHttpsUrl(url, site));

  function MkcertPanel({ site }: { site: Local.Site }): React.ReactElement {
    const [status, setStatus] = useState<MkcertStatus | null>(null);
    const [result, setResult] = useState<GenerateResult | null>(null);
    const [busy, setBusy] = useState(false);
    const [showInfo, setShowInfo] = useState(false);

    const clearLocalSslBanners = useCallback(() => {
      if (!hasMkcertHttpsEnabled(site)) {
        return;
      }

      for (const id of LOCAL_SSL_BANNER_IDS) {
        // Use Local's own event first so its site-info banner hook clears the
        // banner as well. The store call handles a banner that was already
        // materialized in the current renderer.
        LocalRenderer.sendIPCEvent('clearSiteBanner', {
          siteID: site.id,
          id,
        });
        store.$banner.removeBanner(`${site.id}-${id}`);
      }
    }, [site, store]);

    useEffect(() => {
      if (!hasMkcertHttpsEnabled(site)) {
        return undefined;
      }

      // Local performs its certificate check asynchronously. Keep clearing the
      // stale banner while this site overview is mounted so a late result from
      // Local cannot put the already trusted mkcert site back into the warning
      // state.
      clearLocalSslBanners();
      const interval = setInterval(clearLocalSslBanners, 500);
      return () => clearInterval(interval);
    }, [clearLocalSslBanners, site]);

    const refreshStatus = useCallback(async () => {
      setBusy(true);
      try {
        setStatus(await LocalRenderer.ipcAsync(IPC_GET_STATUS));
      } finally {
        setBusy(false);
      }
    }, []);

    useEffect(() => {
      void refreshStatus();
    }, [refreshStatus]);

    const generate = async (): Promise<void> => {
      setBusy(true);
      setResult(null);
      try {
        const response: GenerateResult = await LocalRenderer.ipcAsync(
          IPC_GENERATE_FOR_SITE,
          site.id,
        );
        setResult(response);
        await refreshStatus();
      } catch (error) {
        setResult({
          ok: false,
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setBusy(false);
      }
    };

    const ready = Boolean(status?.ready);
    const panelStyle: React.CSSProperties = {
      alignSelf: 'flex-start',
      background: 'transparent',
      border: 0,
      boxSizing: 'border-box',
      flex: '0 1 auto',
      margin: 0,
      maxWidth: 560,
      overflowWrap: 'anywhere',
      padding: '24px 26px',
      width: 'clamp(360px, 36vw, 560px)',
    };
    const primaryButtonStyle: React.CSSProperties = {
      background: ready ? '#51bb7b' : '#666',
      border: `1px solid ${ready ? '#51bb7b' : '#777'}`,
      borderRadius: 4,
      color: ready ? '#17231c' : '#d0d0d0',
      cursor: ready && !busy ? 'pointer' : 'not-allowed',
      fontWeight: 600,
      lineHeight: 1.2,
      padding: '10px 16px',
    };
    const secondaryButtonStyle: React.CSSProperties = {
      background: 'transparent',
      border: '1px solid #51bb7b',
      borderRadius: 4,
      color: '#51bb7b',
      cursor: busy ? 'not-allowed' : 'pointer',
      fontWeight: 600,
      lineHeight: 1.2,
      opacity: busy ? 0.6 : 1,
      padding: '10px 16px',
    };
    const infoButtonStyle: React.CSSProperties = {
      alignItems: 'center',
      background: 'transparent',
      border: '1px solid #9b9b9b',
      borderRadius: '50%',
      color: '#c8c8c8',
      cursor: 'pointer',
      display: 'inline-flex',
      fontSize: 15,
      fontWeight: 700,
      height: 22,
      justifyContent: 'center',
      lineHeight: 1,
      padding: 0,
      width: 22,
    };
    const infoPopupStyle: React.CSSProperties = {
      background: '#303030',
      border: '1px solid #626262',
      borderRadius: 4,
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
      boxSizing: 'border-box',
      color: '#f1f1f1',
      left: 0,
      padding: '16px 18px',
      position: 'absolute',
      top: 34,
      width: 'min(520px, 100%)',
      zIndex: 10,
    };

    return (
      <section style={panelStyle}>
        <div style={{ position: 'relative' }}>
          <div style={{ alignItems: 'center', display: 'flex', gap: 8, marginBottom: 8 }}>
            <h3 style={{ margin: 0 }}>mkcert SSL</h3>
            <button
              type="button"
              aria-expanded={showInfo}
              aria-label={showInfo ? 'Hide mkcert SSL information' : 'Show mkcert SSL information'}
              style={infoButtonStyle}
              onClick={() => setShowInfo((visible) => !visible)}
            >
              i
            </button>
          </div>
          <p style={{ margin: '0 0 10px' }}>Automatic trusted HTTPS for new and imported sites.</p>
          {showInfo ? (
            <div role="dialog" aria-label="mkcert SSL information" style={infoPopupStyle}>
              <div
                style={{
                  alignItems: 'center',
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <strong>About mkcert SSL</strong>
                <button
                  type="button"
                  aria-label="Close mkcert SSL information"
                  style={{
                    background: 'transparent',
                    border: 0,
                    color: '#c8c8c8',
                    cursor: 'pointer',
                    fontSize: 22,
                    lineHeight: 1,
                    padding: '0 2px',
                  }}
                  onClick={() => setShowInfo(false)}
                >
                  ×
                </button>
              </div>
              <p style={{ margin: '0 0 8px' }}>
                New sites automatically receive a trusted mkcert certificate. Local&apos;s Open site
                and WP Admin actions use HTTPS automatically, and WordPress&apos; home and siteurl
                values are switched to HTTPS as well. No manual Keychain, URL, or Trust action is
                needed.
              </p>
              <p style={{ margin: 0 }}>
                For existing sites, use the button below to replace Local&apos;s certificate. This
                works with Apache and nginx because HTTPS terminates at Local&apos;s central router.
              </p>
            </div>
          ) : null}
        </div>
        {status ? (
          <p style={{ margin: '0 0 10px' }}>
            Status: {ready ? 'Ready' : 'Setup required'}
            {status.version ? ` (${status.version})` : ''}
          </p>
        ) : (
          <p style={{ margin: '0 0 10px' }}>Checking status…</p>
        )}
        {status?.guidance.map((line) => (
          <p key={line} style={{ color: '#8a4b08', margin: '4px 0' }}>
            {line}
          </p>
        ))}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
          <button
            type="button"
            style={primaryButtonStyle}
            disabled={!ready || busy}
            onClick={() => void generate()}
          >
            {busy ? 'Please wait…' : 'Generate new certificate with mkcert'}
          </button>
          <button
            type="button"
            style={secondaryButtonStyle}
            disabled={busy}
            onClick={() => void refreshStatus()}
          >
            Check mkcert status again
          </button>
        </div>
        {result ? (
          <p
            role="status"
            style={{
              color: result.ok && result.wordpressUrlsUpdated !== false ? '#1d6b3b' : '#ff5c64',
              margin: '12px 0 0',
            }}
          >
            {result.message}
          </p>
        ) : null}
      </section>
    );
  }

  hooks.addContent('SiteInfoOverview', (site: Local.Site) => (
    <MkcertPanel key={`mkcert-ssl-${site.id}`} site={site} />
  ));
}
