const ANSI = {
  enterAlternateScreen: "\u001b[?1049h",
  leaveAlternateScreen: "\u001b[?1049l",
  clearScreen: "\u001b[2J\u001b[H",
  hideCursor: "\u001b[?25l",
  showCursor: "\u001b[?25h",
  clearLine: "\u001b[2K",
};

const DEFAULT_FOOTER = "[q] quit  [r] refresh";

export const createTerminalSession = ({
  stdin = process.stdin,
  stdout = process.stdout,
  footer = DEFAULT_FOOTER,
} = {}) => {
  let started = false;
  let active = false;
  let dataListener = null;
  let onDataHandler = null;
  let lastRenderedLines = [];
  let lastOverlayFrame = "";
  let lastOverlayRows = [];

  const assertTTY = () => {
    if (!stdin.isTTY || !stdout.isTTY) {
      throw new Error("[TUI Runtime] Interactive mode requires a TTY terminal.");
    }
  };

  const write = (value) => {
    stdout.write(value);
  };

  const moveTo = (row, column = 1) => `\u001b[${row};${column}H`;

  const splitFrame = (frame) => {
    const normalized = String(frame || "");
    const overlayStart = normalized.indexOf("\u001b[s");

    if (overlayStart < 0) {
      return { base: normalized, overlay: "" };
    }

    return {
      base: normalized.slice(0, overlayStart),
      overlay: normalized.slice(overlayStart),
    };
  };

  const frameToLines = (frameBase) => {
    const lines = frameBase ? frameBase.split("\n") : [];

    if (!footer) {
      return lines;
    }

    return [...lines, "", "", footer];
  };

  const parseOverlayRows = (overlayFrame) => {
    if (!overlayFrame) {
      return [];
    }

    const rows = new Set();
    const moveRegex = /\u001b\[(\d+);(\d+)H/g;
    let match = moveRegex.exec(overlayFrame);

    while (match) {
      rows.add(Number(match[1]));
      match = moveRegex.exec(overlayFrame);
    }

    return [...rows];
  };

  const renderIncremental = (frame) => {
    const { base, overlay } = splitFrame(frame);
    const nextLines = frameToLines(base);
    const maxLineCount = Math.max(lastRenderedLines.length, nextLines.length);
    const dirtyRows = new Set();

    const nextOverlayRows = parseOverlayRows(overlay);
    if (lastOverlayFrame && !overlay) {
      lastOverlayRows.forEach((row) => dirtyRows.add(row));
    } else if (lastOverlayFrame && overlay) {
      const nextRowsSet = new Set(nextOverlayRows);
      lastOverlayRows
        .filter((row) => !nextRowsSet.has(row))
        .forEach((row) => dirtyRows.add(row));
    }

    const dirtyRowsList = [...dirtyRows];
    const maxDirtyRow = dirtyRowsList.length > 0
      ? Math.max(...dirtyRowsList)
      : 0;
    const maxRow = Math.max(maxLineCount, maxDirtyRow);
    let output = "";

    for (let row = 1; row <= maxRow; row += 1) {
      const lineIndex = row - 1;
      const previousLine = lastRenderedLines[lineIndex] || "";
      const nextLine = nextLines[lineIndex] || "";

      if (previousLine !== nextLine || dirtyRows.has(row)) {
        output += `${moveTo(row)}${ANSI.clearLine}${nextLine}`;
      }
    }

    if (overlay) {
      output += overlay;
    }

    if (output) {
      write(output);
    }

    lastRenderedLines = nextLines;
    lastOverlayFrame = overlay;
    lastOverlayRows = nextOverlayRows;
  };

  const attachInput = () => {
    if (!dataListener || !onDataHandler) {
      return;
    }
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    stdin.on("data", dataListener);
    active = true;
  };

  const detachInput = () => {
    if (!dataListener) {
      return;
    }
    stdin.off("data", dataListener);
    stdin.setRawMode(false);
    stdin.pause();
    active = false;
  };

  const start = ({ onData }) => {
    if (started) {
      return;
    }

    assertTTY();
    started = true;
    onDataHandler = onData;

    write(`${ANSI.enterAlternateScreen}${ANSI.hideCursor}${ANSI.clearScreen}`);

    dataListener = (chunk) => {
      if (typeof onDataHandler === "function") {
        onDataHandler(String(chunk));
      }
    };

    attachInput();
  };

  const render = (frame) => {
    if (!started) {
      return;
    }

    renderIncremental(frame);
  };

  const stop = () => {
    if (!started) {
      return;
    }

    if (active) {
      detachInput();
    }

    started = false;
    onDataHandler = null;

    dataListener = null;
    lastRenderedLines = [];
    lastOverlayFrame = "";
    lastOverlayRows = [];

    write(`${ANSI.showCursor}${ANSI.leaveAlternateScreen}`);
  };

  const suspend = () => {
    if (!started || !active) {
      return;
    }

    detachInput();
    write(`${ANSI.showCursor}${ANSI.leaveAlternateScreen}`);
  };

  const resume = () => {
    if (!started || active) {
      return;
    }

    write(`${ANSI.enterAlternateScreen}${ANSI.hideCursor}${ANSI.clearScreen}`);
    lastRenderedLines = [];
    lastOverlayFrame = "";
    lastOverlayRows = [];
    attachInput();
  };

  return {
    start,
    render,
    stop,
    suspend,
    resume,
  };
};
