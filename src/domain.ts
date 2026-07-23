export function normalizeDomain(input: string): string {
  const domain = input.trim().toLowerCase().replace(/\.$/, '');

  if (domain.length === 0 || domain.length > 253) {
    throw new Error(`Invalid domain length: ${input}`);
  }

  const labels = domain.split('.');
  if (
    labels.some(
      (label) =>
        label.length === 0 ||
        label.length > 63 ||
        !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label),
    )
  ) {
    throw new Error(`Invalid Local domain: ${input}`);
  }

  return domain;
}

export function certificateNames(
  primaryDomain: string,
  multiSiteDomains: ReadonlyArray<string | null | undefined> = [],
): string[] {
  const primary = normalizeDomain(primaryDomain);
  const names = new Set<string>([
    primary,
    `*.${primary}`,
    'localhost',
    '127.0.0.1',
    '::1',
  ]);

  for (const candidate of multiSiteDomains) {
    if (!candidate) {
      continue;
    }

    names.add(normalizeDomain(candidate));
  }

  return [...names];
}
