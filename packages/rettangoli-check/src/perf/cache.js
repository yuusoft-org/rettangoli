const defaultSizer = (value) => {
  try {
    return Buffer.byteLength(JSON.stringify(value), "utf8");
  } catch {
    return 0;
  }
};

export class LruAnalysisCache {
  constructor({
    maxEntries = 200,
    maxBytes = 25 * 1024 * 1024,
    sizer = defaultSizer,
  } = {}) {
    this.maxEntries = Math.max(1, Number(maxEntries) || 200);
    this.maxBytes = Math.max(1, Number(maxBytes) || 25 * 1024 * 1024);
    this.sizer = typeof sizer === "function" ? sizer : defaultSizer;
    this.map = new Map();
    this.totalBytes = 0;
  }

  _touch(key, value) {
    this.map.delete(key);
    this.map.set(key, value);
  }

  _evictIfNeeded() {
    while (this.map.size > this.maxEntries || this.totalBytes > this.maxBytes) {
      const oldestKey = this.map.keys().next().value;
      if (oldestKey === undefined) {
        break;
      }
      const record = this.map.get(oldestKey);
      this.map.delete(oldestKey);
      this.totalBytes -= Number(record?.size || 0);
    }
  }

  get size() {
    return this.map.size;
  }

  get byteSize() {
    return this.totalBytes;
  }

  has(key) {
    return this.map.has(key);
  }

  get(key) {
    if (!this.map.has(key)) {
      return undefined;
    }
    const record = this.map.get(key);
    this._touch(key, record);
    return record.value;
  }

  set(key, value) {
    const serializedSize = Math.max(0, Number(this.sizer(value)) || 0);
    if (this.map.has(key)) {
      const previous = this.map.get(key);
      this.totalBytes -= Number(previous?.size || 0);
    }

    this._touch(key, {
      value,
      size: serializedSize,
      insertedAt: Date.now(),
    });
    this.totalBytes += serializedSize;
    this._evictIfNeeded();
  }

  clear() {
    this.map.clear();
    this.totalBytes = 0;
  }
}
