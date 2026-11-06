import path from 'path';

// Normalize a site-relative URL path to "/a/b/" (or "/"). Page "url" frontmatter, "_each.url"
// and the sitemap config all use it; every error message starts with contextLabel.
export function normalizeSitePath(rawUrl, contextLabel) {
  if (typeof rawUrl !== 'string') {
    throw new Error(`${contextLabel}: expected a string.`);
  }

  if (rawUrl === '') {
    throw new Error(`${contextLabel}: expected a non-empty string.`);
  }

  if (/[\u0000-\u001F\u007F]/u.test(rawUrl)) {
    throw new Error(`${contextLabel}: must not contain control characters.`);
  }

  if (/\s/u.test(rawUrl)) {
    throw new Error(`${contextLabel}: must not contain whitespace.`);
  }

  if (/^[A-Za-z][A-Za-z0-9+.-]*:/u.test(rawUrl) || rawUrl.startsWith('//')) {
    throw new Error(`${contextLabel}: expected a site-relative URL path.`);
  }

  if (rawUrl.includes('\\')) {
    throw new Error(`${contextLabel}: must use forward slashes.`);
  }

  if (rawUrl.includes('?') || rawUrl.includes('#')) {
    throw new Error(`${contextLabel}: must not include query strings or fragments.`);
  }

  const withLeadingSlash = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
  const collapsedUrl = withLeadingSlash.replace(/\/+/g, '/');
  const pathWithoutSlashes = collapsedUrl.replace(/^\/+|\/+$/g, '');

  if (pathWithoutSlashes === '') {
    return '/';
  }

  const segments = pathWithoutSlashes.split('/');
  for (const segment of segments) {
    let decodedSegment;
    try {
      decodedSegment = decodeURIComponent(segment);
    } catch {
      throw new Error(`${contextLabel}: contains invalid URL encoding.`);
    }

    if (decodedSegment === '.' || decodedSegment === '..') {
      throw new Error(`${contextLabel}: must not contain "." or ".." segments.`);
    }

    if (decodedSegment.includes('/') || decodedSegment.includes('\\')) {
      throw new Error(`${contextLabel}: must not include encoded slashes or backslashes.`);
    }

    if (/[\u0000-\u001F\u007F]/u.test(decodedSegment)) {
      throw new Error(`${contextLabel}: must not contain control characters.`);
    }

    if (/\s/u.test(decodedSegment)) {
      throw new Error(`${contextLabel}: must not contain whitespace.`);
    }
  }

  return `/${segments.join('/')}/`;
}

export function normalizePageUrlOverride(rawUrl, pagePath) {
  return normalizeSitePath(rawUrl, `Invalid url in ${pagePath}`);
}

export function normalizeRelativeUrlPath(relativePath) {
  return relativePath.replace(/\\/g, '/');
}

export function derivePageUrlFromRelativePath(relativePath) {
  const normalizedPath = normalizeRelativeUrlPath(relativePath);
  const pathWithoutExtension = normalizedPath.replace(/\.(yaml|yml|md)$/, '');
  const pageName = path.posix.basename(pathWithoutExtension);

  if (pageName === 'index') {
    const dirName = path.posix.dirname(pathWithoutExtension);
    return dirName === '.' ? '/' : `/${dirName}/`;
  }

  return `/${pathWithoutExtension}/`;
}

export function resolvePageUrl(publicFrontmatter, relativePath, pagePath) {
  if (Object.hasOwn(publicFrontmatter, 'url')) {
    return normalizePageUrlOverride(publicFrontmatter.url, pagePath);
  }

  return derivePageUrlFromRelativePath(relativePath);
}

export function htmlOutputRelativePathFromUrl(url) {
  if (url === '/') {
    return 'index.html';
  }

  return `${url.slice(1, -1)}/index.html`;
}

export function markdownOutputRelativePathFromUrl(url) {
  if (url === '/') {
    return 'index.md';
  }

  const segments = url.slice(1, -1).split('/');
  const fileName = `${segments.pop()}.md`;
  return [...segments, fileName].join('/');
}

// Where a markdown page's source copy goes when keepMarkdownFiles is on.
export function markdownOutputRelativePathForPage(pageEntry) {
  return pageEntry.hasCustomUrl
    ? markdownOutputRelativePathFromUrl(pageEntry.url)
    : pageEntry.relativePath;
}
