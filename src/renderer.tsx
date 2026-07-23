import type * as Local from '@getflywheel/local';
import * as LocalRenderer from '@getflywheel/local/renderer';
import type { MkcertStatus, GenerateResult } from './shared';
import { IPC_GENERATE_FOR_SITE, IPC_GET_STATUS } from './shared';

export default function (context: LocalRenderer.AddonRendererContext): void {
  const { React, hooks } = context;
  const { useCallback, useEffect, useState } = React;

  function MkcertPanel({ site }: { site: Local.Site }): React.ReactElement {
    const [status, setStatus] = useState<MkcertStatus | null>(null);
    const [result, setResult] = useState<GenerateResult | null>(null);
    const [busy, setBusy] = useState(false);

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

    return (
      <section style={panelStyle}>
        <h3 style={{ margin: '0 0 8px' }}>mkcert SSL</h3>
        <p style={{ margin: '0 0 10px' }}>
          New sites automatically receive an mkcert certificate. For existing sites, you can
          replace Local&apos;s certificate with a trusted mkcert certificate. This works with
          both Apache and nginx because HTTPS terminates at Local&apos;s central router.
        </p>
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
            style={{ color: result.ok ? '#1d6b3b' : '#a13d2d', margin: '12px 0 0' }}
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
