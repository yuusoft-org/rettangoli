import { readFileSync, statSync } from "node:fs";
import path from "node:path";

import { resolveWidth } from "./common.js";

const KITTY_APC_START = "\u001b_G";
const KITTY_APC_END = "\u001b\\";
const KITTY_CHUNK_SIZE = 4096;
const DEFAULT_COLS = 24;
const DEFAULT_ROWS = 10;
const YES_VALUES = new Set(["", "1", "true", "yes", "on"]);
const BASE64_PATTERN = /^[A-Za-z0-9+/=]+$/;
const GIT_LFS_POINTER_PREFIX = "version https://git-lfs.github.com/spec/v1";
const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47,
  0x0d, 0x0a, 0x1a, 0x0a,
]);

const filePayloadCache = new Map();
const transmittedImageIds = new Set();

const isTrue = (value) => {
  if (value === true || value === 1) {
    return true;
  }
  if (typeof value !== "string") {
    return false;
  }
  return YES_VALUES.has(value.trim().toLowerCase());
};

const fnv1aHash = (value) => {
  const input = String(value ?? "");
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

const toProtocolId = (seed) => {
  const id = fnv1aHash(seed);
  return id === 0 ? 1 : id;
};

const createKittyCommand = (controlData, payload = "") => {
  if (payload) {
    return `${KITTY_APC_START}${controlData};${payload}${KITTY_APC_END}`;
  }
  return `${KITTY_APC_START}${controlData}${KITTY_APC_END}`;
};

const splitPayload = (payload, chunkSize = KITTY_CHUNK_SIZE) => {
  const value = String(payload || "");
  if (!value) {
    return [];
  }

  const chunks = [];
  for (let index = 0; index < value.length; index += chunkSize) {
    chunks.push(value.slice(index, index + chunkSize));
  }
  return chunks;
};

const normalizeDataBase64 = (value) => {
  if (value === undefined || value === null) {
    return "";
  }

  const text = String(value).trim();
  if (!text) {
    return "";
  }

  const dataUriMatch = text.match(/^data:([^;,]+);base64,(.+)$/);
  if (dataUriMatch) {
    const mediaType = String(dataUriMatch[1] || "").toLowerCase();
    if (mediaType !== "image/png") {
      return "";
    }
  }
  const maybeBase64 = dataUriMatch ? dataUriMatch[2] : text;
  const normalized = maybeBase64.replace(/\s+/g, "");
  if (!normalized || !BASE64_PATTERN.test(normalized)) {
    return "";
  }
  return normalized;
};

const hasPngSignature = (bytes) => {
  if (!bytes || bytes.length < PNG_SIGNATURE.length) {
    return false;
  }

  for (let index = 0; index < PNG_SIGNATURE.length; index += 1) {
    if (bytes[index] !== PNG_SIGNATURE[index]) {
      return false;
    }
  }

  return true;
};

const resolveSourceFromData = ({ attrs, props }) => {
  const rawSrc = String(props.src ?? attrs.src ?? "").trim();
  const inlineData = normalizeDataBase64(
    props.data
      ?? attrs.data
      ?? props.base64
      ?? attrs.base64
      ?? (rawSrc.startsWith("data:image/") ? rawSrc : ""),
  );

  if (!inlineData) {
    return null;
  }

  let decodedBytes;
  try {
    decodedBytes = Buffer.from(inlineData, "base64");
  } catch {
    return null;
  }

  if (!hasPngSignature(decodedBytes)) {
    return null;
  }

  return {
    payloadBase64: inlineData,
    imageId: toProtocolId(`inline:${inlineData}`),
  };
};

const resolvePathFromSrc = (srcValue) => {
  if (srcValue === undefined || srcValue === null) {
    return "";
  }
  const srcText = String(srcValue).trim();
  if (!srcText) {
    return "";
  }

  if (srcText.startsWith("file://")) {
    try {
      return decodeURIComponent(new URL(srcText).pathname);
    } catch {
      return "";
    }
  }

  return srcText;
};

const resolveSourceFromFile = ({ attrs, props }) => {
  const rawPath = resolvePathFromSrc(props.src ?? attrs.src);
  if (!rawPath) {
    return null;
  }

  const absolutePath = path.isAbsolute(rawPath)
    ? rawPath
    : path.resolve(process.cwd(), rawPath);

  let stat;
  try {
    stat = statSync(absolutePath);
  } catch {
    return null;
  }

  if (!stat.isFile()) {
    return null;
  }

  const cacheEntry = filePayloadCache.get(absolutePath);
  const mtimeMs = Math.floor(Number(stat.mtimeMs) || 0);
  if (
    cacheEntry
    && cacheEntry.mtimeMs === mtimeMs
    && cacheEntry.size === stat.size
  ) {
    return cacheEntry.value;
  }

  let payloadBytes;
  try {
    payloadBytes = readFileSync(absolutePath);
  } catch {
    return null;
  }

  const maybePointer = payloadBytes.toString("utf8");
  if (maybePointer.startsWith(GIT_LFS_POINTER_PREFIX)) {
    return null;
  }

  if (!hasPngSignature(payloadBytes)) {
    return null;
  }

  const payloadBase64 = payloadBytes.toString("base64");

  const sourceSignature = `file:${absolutePath}:${mtimeMs}:${stat.size}`;
  const value = {
    payloadBase64,
    imageId: toProtocolId(sourceSignature),
  };
  filePayloadCache.set(absolutePath, {
    mtimeMs,
    size: stat.size,
    value,
  });

  return value;
};

const resolveImageSource = ({ attrs, props }) => {
  return resolveSourceFromData({ attrs, props })
    || resolveSourceFromFile({ attrs, props });
};

const supportsKittyProtocol = ({ attrs, props }) => {
  const protocolToken = String(props.protocol ?? attrs.protocol ?? "").trim().toLowerCase();
  if (protocolToken && protocolToken !== "kitty") {
    return false;
  }

  if (protocolToken === "kitty") {
    return true;
  }

  const explicitKitty = props.kitty ?? attrs.kitty;
  if (explicitKitty !== undefined) {
    return isTrue(explicitKitty);
  }

  if (process.env.RETTANGOLI_TUI_FORCE_KITTY === "1") {
    return true;
  }
  if (process.env.RETTANGOLI_TUI_DISABLE_KITTY === "1") {
    return false;
  }

  const term = String(process.env.TERM || "").toLowerCase();
  const termProgram = String(process.env.TERM_PROGRAM || "").toLowerCase();
  return Boolean(
    process.env.KITTY_WINDOW_ID
    || term.includes("kitty")
    || term.includes("ghostty")
    || termProgram === "kitty"
    || termProgram === "ghostty"
    || process.env.WEZTERM_EXECUTABLE,
  );
};

const resolveCellSize = ({ attrs, props }) => {
  const cols = resolveWidth(
    props.c
      ?? attrs.c
      ?? props.w
      ?? attrs.w,
    DEFAULT_COLS,
  );
  const rows = resolveWidth(
    props.r
      ?? attrs.r
      ?? props.h
      ?? attrs.h,
    DEFAULT_ROWS,
  );
  return { cols, rows };
};

const createPlaceholder = ({ cols, rows }) => {
  const line = " ".repeat(Math.max(1, cols));
  const lines = Array.from({ length: Math.max(1, rows) }, () => line).join("\n");
  return `${lines}\u001b[0m`;
};

const createTransmitAndPlaceCommand = ({
  imageId,
  placementId,
  cols,
  rows,
  payloadBase64,
}) => {
  const chunks = splitPayload(payloadBase64);
  if (chunks.length === 0) {
    return "";
  }

  return chunks
    .map((chunk, chunkIndex) => {
      const isLastChunk = chunkIndex === chunks.length - 1;
      const m = isLastChunk ? 0 : 1;

      if (chunkIndex === 0) {
        return createKittyCommand(
          `a=T,f=100,i=${imageId},p=${placementId},q=2,C=1,c=${cols},r=${rows},m=${m}`,
          chunk,
        );
      }

      return createKittyCommand(`m=${m}`, chunk);
    })
    .join("");
};

const createPlacementCommand = ({ imageId, placementId, cols, rows }) => {
  return createKittyCommand(
    `a=p,i=${imageId},p=${placementId},q=2,C=1,c=${cols},r=${rows}`,
  );
};

const resolveFallback = ({ attrs, props }) => {
  const token = String(
    props.alt
      ?? attrs.alt
      ?? props.fallback
      ?? attrs.fallback
      ?? "[image]",
  );
  return token;
};

const renderImage = ({ attrs = {}, props = {}, node = {} }) => {
  if (!supportsKittyProtocol({ attrs, props })) {
    return resolveFallback({ attrs, props });
  }

  const source = resolveImageSource({ attrs, props });
  if (!source) {
    return resolveFallback({ attrs, props });
  }

  const { cols, rows } = resolveCellSize({ attrs, props });
  const placementSeed = String(node?.data?.key || node?.sel || "rtgl-image");
  const placementId = toProtocolId(
    `placement:${source.imageId}:${placementSeed}`,
  );

  let command;
  if (transmittedImageIds.has(source.imageId)) {
    command = createPlacementCommand({
      imageId: source.imageId,
      placementId,
      cols,
      rows,
    });
  } else {
    command = createTransmitAndPlaceCommand({
      imageId: source.imageId,
      placementId,
      cols,
      rows,
      payloadBase64: source.payloadBase64,
    });
    transmittedImageIds.add(source.imageId);
  }

  if (!command) {
    return resolveFallback({ attrs, props });
  }

  return `${command}${createPlaceholder({ cols, rows })}`;
};

export const __resetKittyImageCacheForTests = () => {
  filePayloadCache.clear();
  transmittedImageIds.clear();
};

export default renderImage;
