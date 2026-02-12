import MarkdownIt from 'markdown-it';

const markdownRenderer = new MarkdownIt();

function toDate(value) {
  if (value instanceof Date) {
    return value;
  }

  if (value === undefined || value === null || value === '') {
    return new Date();
  }

  return new Date(value);
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function formatDateImpl(value, format = 'YYYYMMDDHHmmss', useUtc = true) {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const read = (localGetter, utcGetter) => (useUtc ? utcGetter.call(date) : localGetter.call(date));
  const tokens = {
    YYYY: String(read(date.getFullYear, date.getUTCFullYear)),
    MM: pad2(read(date.getMonth, date.getUTCMonth) + 1),
    DD: pad2(read(date.getDate, date.getUTCDate)),
    HH: pad2(read(date.getHours, date.getUTCHours)),
    mm: pad2(read(date.getMinutes, date.getUTCMinutes)),
    ss: pad2(read(date.getSeconds, date.getUTCSeconds)),
  };

  return String(format).replace(/YYYY|MM|DD|HH|mm|ss/g, (token) => tokens[token]);
}

function jsonStringify(value, space = 0) {
  const indent = Number.isFinite(Number(space))
    ? Math.max(0, Math.min(10, Math.trunc(Number(space))))
    : 0;
  const result = JSON.stringify(value, null, indent);
  return result === undefined ? '' : result;
}

function toQueryString(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return '';
  }

  const params = new URLSearchParams();
  for (const [key, raw] of Object.entries(value)) {
    if (raw === undefined || raw === null) {
      continue;
    }
    if (Array.isArray(raw)) {
      for (const item of raw) {
        params.append(key, String(item));
      }
      continue;
    }
    params.set(key, String(raw));
  }
  return params.toString();
}

function safeDecode(value, decoder) {
  const input = String(value ?? '');
  try {
    return decoder(input);
  } catch {
    return input;
  }
}

function sortImpl(value, key, order = 'asc') {
  if (!Array.isArray(value)) {
    return [];
  }
  const normalizedOrder = String(order ?? 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';
  const factor = normalizedOrder === 'asc' ? 1 : -1;
  return [...value].sort((left, right) => {
    const leftRaw = key == null ? left : left?.[key];
    const rightRaw = key == null ? right : right?.[key];

    if (leftRaw == null && rightRaw == null) return 0;
    if (leftRaw == null) return 1;
    if (rightRaw == null) return -1;

    const leftDate = Date.parse(String(leftRaw));
    const rightDate = Date.parse(String(rightRaw));
    const canCompareAsDate = !Number.isNaN(leftDate) && !Number.isNaN(rightDate);

    if (canCompareAsDate) {
      if (leftDate === rightDate) return 0;
      return leftDate > rightDate ? factor : -factor;
    }

    if (typeof leftRaw === 'number' && typeof rightRaw === 'number') {
      if (leftRaw === rightRaw) return 0;
      return leftRaw > rightRaw ? factor : -factor;
    }

    const leftText = String(leftRaw);
    const rightText = String(rightRaw);
    const result = leftText.localeCompare(rightText);
    if (result === 0) return 0;
    return result > 0 ? factor : -factor;
  });
}

function mdImpl(content) {
  return {
    __html: markdownRenderer.render(String(content ?? '')),
  };
}

export const builtinTemplateFunctions = {
  encodeURI: (value) => encodeURI(String(value ?? '')),
  encodeURIComponent: (value) => encodeURIComponent(String(value ?? '')),
  decodeURI: (value) => safeDecode(value, decodeURI),
  decodeURIComponent: (value) => safeDecode(value, decodeURIComponent),
  jsonStringify,
  formatDate: formatDateImpl,
  now: (format = 'YYYYMMDDHHmmss', useUtc = true) => formatDateImpl(new Date(), format, useUtc),
  sort: sortImpl,
  md: mdImpl,
  toQueryString,
};

export default builtinTemplateFunctions;
