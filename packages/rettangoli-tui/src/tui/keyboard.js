const SPECIAL_SEQUENCE_MAP = {
  "\u0003": { name: "c", key: "c", ctrl: true },
  "\r": { name: "enter", key: "Enter" },
  "\n": { name: "enter", key: "Enter" },
  "\t": { name: "tab", key: "Tab" },
  "\u007f": { name: "backspace", key: "Backspace" },
  "\u001b": { name: "escape", key: "Escape" },
  "\u001b[A": { name: "up", key: "ArrowUp" },
  "\u001b[B": { name: "down", key: "ArrowDown" },
  "\u001b[C": { name: "right", key: "ArrowRight" },
  "\u001b[D": { name: "left", key: "ArrowLeft" },
};

const isPrintableCharacter = (value) => {
  return typeof value === "string" && value.length === 1 && value >= " " && value !== "\u007f";
};

const parseCtrlCharacter = (sequence) => {
  if (typeof sequence !== "string" || sequence.length !== 1) {
    return null;
  }

  const code = sequence.charCodeAt(0);
  if (code >= 1 && code <= 26) {
    const letter = String.fromCharCode(code + 96);
    return {
      name: letter,
      key: letter,
      ctrl: true,
    };
  }

  return null;
};

export const parseKeySequence = (sequence) => {
  if (SPECIAL_SEQUENCE_MAP[sequence]) {
    return {
      sequence,
      shift: false,
      meta: false,
      ...SPECIAL_SEQUENCE_MAP[sequence],
    };
  }

  const ctrlCharacter = parseCtrlCharacter(sequence);
  if (ctrlCharacter) {
    return {
      sequence,
      shift: false,
      meta: false,
      ...ctrlCharacter,
    };
  }

  if (sequence.startsWith("\u001b") && sequence.length === 2) {
    const character = sequence[1];
    return {
      sequence,
      name: character.toLowerCase(),
      key: character,
      ctrl: false,
      meta: true,
      shift: character.toUpperCase() === character && character.toLowerCase() !== character,
    };
  }

  if (isPrintableCharacter(sequence)) {
    const shift = sequence.toUpperCase() === sequence && sequence.toLowerCase() !== sequence;
    return {
      sequence,
      name: sequence.toLowerCase(),
      key: sequence,
      ctrl: false,
      meta: false,
      shift,
    };
  }

  return {
    sequence,
    name: "unknown",
    key: sequence,
    ctrl: false,
    meta: false,
    shift: false,
  };
};

export const splitInputSequences = (chunk = "") => {
  const sequences = [];
  let index = 0;

  while (index < chunk.length) {
    const char = chunk[index];
    if (char !== "\u001b") {
      sequences.push(char);
      index += 1;
      continue;
    }

    const next = chunk[index + 1];
    const nextNext = chunk[index + 2];

    if (next === "[" && ["A", "B", "C", "D"].includes(nextNext)) {
      sequences.push(chunk.slice(index, index + 3));
      index += 3;
      continue;
    }

    if (next) {
      sequences.push(chunk.slice(index, index + 2));
      index += 2;
      continue;
    }

    sequences.push(char);
    index += 1;
  }

  return sequences;
};

export const createKeyboardEvent = ({ sequence, target }) => {
  const parsed = parseKeySequence(sequence);
  const event = {
    type: "keydown",
    key: parsed.key,
    name: parsed.name,
    sequence: parsed.sequence,
    ctrlKey: parsed.ctrl,
    metaKey: parsed.meta,
    shiftKey: parsed.shift,
    target,
    currentTarget: target,
    defaultPrevented: false,
    __stopPropagation: false,
    __stopImmediate: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    stopPropagation() {
      this.__stopPropagation = true;
    },
    stopImmediatePropagation() {
      this.__stopImmediate = true;
      this.__stopPropagation = true;
    },
  };

  return event;
};
