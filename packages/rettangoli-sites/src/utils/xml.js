export function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

export function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

export function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function validateSiteUrl(siteUrl, contextLabel) {
  if (typeof siteUrl !== 'string' || siteUrl.trim() === '') {
    throw new Error(`${contextLabel}: expected a non-empty URL string.`);
  }

  let parsed;
  try {
    parsed = new URL(siteUrl);
  } catch {
    throw new Error(`${contextLabel}: "${siteUrl}" is not a valid URL.`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`${contextLabel}: protocol "${parsed.protocol}" is not supported. Allowed protocols: http:, https:.`);
  }

  if (parsed.search || parsed.hash) {
    throw new Error(`${contextLabel}: must not include query strings or fragments.`);
  }

  parsed.pathname = parsed.pathname.replace(/\/+$/u, '');
  return parsed.toString().replace(/\/$/u, '');
}

export function validateRelativeOutputPath(outputPath, contextLabel) {
  if (typeof outputPath !== 'string' || outputPath.trim() === '') {
    throw new Error(`${contextLabel}: expected a non-empty string.`);
  }

  if (/[\u0000-\u001F\u007F]/u.test(outputPath)) {
    throw new Error(`${contextLabel}: must not contain control characters.`);
  }

  if (/\s/u.test(outputPath)) {
    throw new Error(`${contextLabel}: must not contain whitespace.`);
  }

  if (outputPath.startsWith('/') || /^[A-Za-z][A-Za-z0-9+.-]*:/u.test(outputPath)) {
    throw new Error(`${contextLabel}: expected a relative output path.`);
  }

  if (outputPath.includes('\\') || outputPath.includes('?') || outputPath.includes('#')) {
    throw new Error(`${contextLabel}: must be a clean relative file path.`);
  }

  const segments = outputPath.split('/').filter(Boolean);
  if (segments.length === 0) {
    throw new Error(`${contextLabel}: expected a relative file path.`);
  }

  for (const segment of segments) {
    if (segment === '.' || segment === '..') {
      throw new Error(`${contextLabel}: must not contain "." or ".." segments.`);
    }
  }

  return segments.join('/');
}

export function joinSiteUrl(siteUrl, pageUrl) {
  const parsed = new URL(siteUrl);
  const basePath = parsed.pathname.replace(/\/+$/u, '');
  parsed.pathname = `${basePath}${pageUrl}`.replace(/\/+/g, '/');
  return parsed.toString();
}
