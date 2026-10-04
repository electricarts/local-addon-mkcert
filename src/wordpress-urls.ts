export interface WordPressHttpsUrls {
  home: string;
  siteurl: string;
}

function requiredOption(value: string | null, option: 'home' | 'siteurl'): string {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(
      `WordPress option ${option} could not be read. The site may not be ready yet.`,
    );
  }
  return normalized;
}

/**
 * Change only the URL scheme and preserve the configured host, path, and slash.
 * This keeps imported sites and subdirectory installations intact.
 */
export function useHttpsProtocol(url: string): string {
  if (!/^https?:\/\//i.test(url)) {
    throw new Error(`WordPress URL is not an absolute HTTP(S) URL: ${url}`);
  }

  return url.replace(/^https?:\/\//i, 'https://');
}

export function getWordPressHttpsUrls(
  home: string | null,
  siteurl: string | null,
): WordPressHttpsUrls {
  return {
    home: useHttpsProtocol(requiredOption(home, 'home')),
    siteurl: useHttpsProtocol(requiredOption(siteurl, 'siteurl')),
  };
}
