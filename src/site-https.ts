export const MKCERT_HTTPS_CUSTOM_OPTION = 'mkcert-ssl.https';

export interface SiteWithCustomOptions {
  customOptions?: Record<string, unknown> | null;
}

/**
 * Local does not persist a built-in "HTTPS enabled" flag on a site. Keep the
 * URL preference namespaced to this add-on and store it in Local's supported
 * customOptions object instead of changing Local's core fields. WordPress's own
 * URL options are updated separately through Local's WP-CLI service.
 */
export function withMkcertHttpsEnabled(
  customOptions: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  return {
    ...(customOptions ?? {}),
    [MKCERT_HTTPS_CUSTOM_OPTION]: true,
  };
}

export function hasMkcertHttpsEnabled(site: SiteWithCustomOptions): boolean {
  return site.customOptions?.[MKCERT_HTTPS_CUSTOM_OPTION] === true;
}

export function useMkcertHttpsUrl(url: string, site: SiteWithCustomOptions): string {
  if (!hasMkcertHttpsEnabled(site)) {
    return url;
  }

  return url.replace(/^http:\/\//i, 'https://');
}
