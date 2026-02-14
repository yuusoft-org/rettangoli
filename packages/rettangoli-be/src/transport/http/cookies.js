const toCookieValue = (value) => encodeURIComponent(String(value));

const toCookieName = (value) => String(value);

export const parseCookieHeader = (cookieHeader) => {
  if (!cookieHeader || typeof cookieHeader !== 'string') {
    return {};
  }

  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((result, part) => {
      const separatorIndex = part.indexOf('=');
      if (separatorIndex === -1) {
        return result;
      }

      const name = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();
      try {
        result[name] = decodeURIComponent(value);
      } catch {
        result[name] = value;
      }
      return result;
    }, {});
};

const appendFlag = (parts, enabled, flagName) => {
  if (enabled) {
    parts.push(flagName);
  }
};

export const serializeCookie = (cookie) => {
  if (!cookie || typeof cookie !== 'object') {
    throw new Error('serializeCookie: cookie object is required');
  }

  if (!cookie.name) {
    throw new Error('serializeCookie: cookie.name is required');
  }

  const value = cookie.value === undefined ? '' : cookie.value;
  const config = cookie.config || {};
  const parts = [`${toCookieName(cookie.name)}=${toCookieValue(value)}`];

  if (config.path) parts.push(`Path=${config.path}`);
  if (config.domain) parts.push(`Domain=${config.domain}`);
  if (config.expires) parts.push(`Expires=${config.expires}`);
  if (typeof config.maxAge === 'number') parts.push(`Max-Age=${config.maxAge}`);
  appendFlag(parts, !!config.httpOnly, 'HttpOnly');
  appendFlag(parts, !!config.secure, 'Secure');
  if (config.sameSite) parts.push(`SameSite=${config.sameSite}`);
  if (config.priority) parts.push(`Priority=${config.priority}`);
  appendFlag(parts, !!config.partitioned, 'Partitioned');

  if (config.attributes && typeof config.attributes === 'object') {
    Object.entries(config.attributes).forEach(([key, attributeValue]) => {
      if (attributeValue === undefined || attributeValue === false) {
        return;
      }

      if (attributeValue === true) {
        parts.push(key);
        return;
      }

      parts.push(`${key}=${attributeValue}`);
    });
  }

  return parts.join('; ');
};

export const serializeResponseCookies = (cookies = []) => {
  if (!Array.isArray(cookies)) {
    return [];
  }

  return cookies.map((cookie) => serializeCookie(cookie));
};
