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

function toTimestamp(value) {
  const date = toDate(value);
  const ms = date.getTime();
  return Number.isNaN(ms) ? null : ms;
}

function readDateField(item, dateKey) {
  if (!item || typeof item !== 'object') {
    return null;
  }
  return toTimestamp(item[dateKey]);
}

function compareDateImpl(a, b) {
  const aMs = toTimestamp(a);
  const bMs = toTimestamp(b);
  if (aMs === null || bMs === null) {
    return 0;
  }
  if (aMs > bMs) return 1;
  if (aMs < bMs) return -1;
  return 0;
}

function isAfterDateImpl(a, b) {
  return compareDateImpl(a, b) === 1;
}

function sortByDateImpl(value, dateKey = 'date', order = 'desc') {
  if (!Array.isArray(value)) {
    return [];
  }
  const normalizedOrder = String(order ?? 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
  const factor = normalizedOrder === 'asc' ? 1 : -1;
  return [...value].sort((left, right) => {
    const leftMs = readDateField(left, dateKey);
    const rightMs = readDateField(right, dateKey);

    if (leftMs === null && rightMs === null) return 0;
    if (leftMs === null) return 1;
    if (rightMs === null) return -1;
    if (leftMs === rightMs) return 0;
    return leftMs > rightMs ? factor : -factor;
  });
}

function latestByDateImpl(value, dateKey = 'date') {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  let latestItem = null;
  let latestMs = null;

  for (const item of value) {
    const itemMs = readDateField(item, dateKey);
    if (itemMs === null) {
      continue;
    }
    if (latestMs === null || itemMs > latestMs) {
      latestMs = itemMs;
      latestItem = item;
    }
  }

  return latestItem;
}

export const builtinTemplateFunctions = {
  encodeURI: (value) => encodeURI(String(value ?? '')),
  encodeURIComponent: (value) => encodeURIComponent(String(value ?? '')),
  decodeURI: (value) => safeDecode(value, decodeURI),
  decodeURIComponent: (value) => safeDecode(value, decodeURIComponent),
  jsonStringify,
  formatDate: formatDateImpl,
  now: (format = 'YYYYMMDDHHmmss', useUtc = true) => formatDateImpl(new Date(), format, useUtc),
  compareDate: compareDateImpl,
  isAfterDate: isAfterDateImpl,
  sortByDate: sortByDateImpl,
  latestByDate: latestByDateImpl,
  toQueryString,
};

export default builtinTemplateFunctions;
