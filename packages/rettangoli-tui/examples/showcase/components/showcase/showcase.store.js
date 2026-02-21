const DEFAULT_TASK_TITLE = [
  "Refactor renderer",
  "Keep overlay stable",
].join("\n");
const TITLE_WRAP_COLUMNS = 56;

const DEFAULT_TASK_CONTENT = [
  "- Extract overlay layer for dialog",
  "- Preserve base layout flow",
  "- Add integration tests",
].join("\n");
const DEFAULT_TASKS = Object.freeze([
  {
    id: "T-101",
    title: "Add list/table primitives",
    status: "todo",
    priority: "high",
    assignee: "Hanyon",
    done: false,
  },
  {
    id: "T-102",
    title: "Fix floating dialog borders",
    status: "done",
    priority: "med",
    assignee: "Hanyon",
    done: true,
  },
  {
    id: "T-103",
    title: "Reduce terminal flicker",
    status: "doing",
    priority: "high",
    assignee: "Codex",
    done: false,
  },
]);

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const toLines = (value) => {
  const lines = String(value ?? "").split("\n");
  return lines.length > 0 ? lines : [""];
};

const normalizeCursorIndex = (value, text) => {
  return clamp(Number(value) || 0, 0, String(text ?? "").length);
};

const indexToCursor = (text, index) => {
  const safeIndex = normalizeCursorIndex(index, text);
  const before = String(text ?? "").slice(0, safeIndex);
  const rows = before.split("\n");
  return {
    row: rows.length - 1,
    col: rows[rows.length - 1].length,
  };
};

const cursorToIndex = (text, row, col) => {
  const lines = toLines(text);
  const safeRow = clamp(Number(row) || 0, 0, lines.length - 1);
  const safeCol = clamp(Number(col) || 0, 0, lines[safeRow].length);

  let index = 0;
  for (let lineIndex = 0; lineIndex < safeRow; lineIndex += 1) {
    index += lines[lineIndex].length + 1;
  }
  return index + safeCol;
};

const insertAtCursor = (text, index, chunk) => {
  const safeIndex = normalizeCursorIndex(index, text);
  const source = String(text ?? "");
  const insertValue = String(chunk ?? "");
  return `${source.slice(0, safeIndex)}${insertValue}${source.slice(safeIndex)}`;
};

const wrapText = (text, maxCols = TITLE_WRAP_COLUMNS) => {
  const source = String(text ?? "");
  if (!maxCols || maxCols < 1 || source.length === 0) {
    return source;
  }

  let col = 0;
  let wrapped = "";

  for (const char of source) {
    if (char === "\n") {
      wrapped += char;
      col = 0;
      continue;
    }

    if (col >= maxCols) {
      wrapped += "\n";
      col = 0;
    }

    wrapped += char;
    col += 1;
  }

  return wrapped;
};

const insertWithAutoWrap = ({ text, index, chunk, wrapColumns }) => {
  const source = String(text ?? "");
  const insertValue = String(chunk ?? "");
  const maxCols = Number(wrapColumns) || 0;

  if (!insertValue || maxCols < 1) {
    return {
      value: insertAtCursor(source, index, insertValue),
      index: normalizeCursorIndex(index, source) + insertValue.length,
    };
  }

  let nextValue = source;
  let nextIndex = normalizeCursorIndex(index, source);

  for (const char of insertValue) {
    const cursor = indexToCursor(nextValue, nextIndex);
    if (char !== "\n" && cursor.col >= maxCols) {
      nextValue = insertAtCursor(nextValue, nextIndex, "\n");
      nextIndex += 1;
    }

    nextValue = insertAtCursor(nextValue, nextIndex, char);
    nextIndex += char.length;
  }

  return {
    value: nextValue,
    index: nextIndex,
  };
};

export const createInitialState = ({ props }) => ({
  title: "Rettangoli TUI Component Showcase",
  modeLabel: props.environment ? `env:${props.environment}` : "env:local",
  message: "Ready",
  taskTitle: DEFAULT_TASK_TITLE,
  taskContent: DEFAULT_TASK_CONTENT,
  tasks: DEFAULT_TASKS.map((task) => ({ ...task })),
  selectedTaskIndex: 0,
  lastKey: "none",
  titleDialogOpen: false,
  titleDraft: DEFAULT_TASK_TITLE,
  titleCursorIndex: DEFAULT_TASK_TITLE.length,
  titleCursorPreferredCol: null,
});

export const selectViewData = ({ state }) => {
  const contentLines = String(state.taskContent || "").split("\n");
  const previewLines = contentLines.slice(0, 5);
  const hiddenCount = Math.max(0, contentLines.length - previewLines.length);
  const suffix = hiddenCount > 0 ? `\n...(${hiddenCount} more line(s))` : "";
  const titleCursor = indexToCursor(state.titleDraft, state.titleCursorIndex);
  const titleLines = String(state.taskTitle || "").split("\n");
  const tasks = Array.isArray(state.tasks) ? state.tasks : [];
  const safeSelectedTaskIndex = clamp(
    Number(state.selectedTaskIndex) || 0,
    0,
    Math.max(0, tasks.length - 1),
  );
  const taskListItems = tasks.map((task) => ({
    label: `${task.id} ${task.title}`,
    status: task.status,
    done: Boolean(task.done),
  }));
  const taskTableData = {
    columns: [
      { key: "id", label: "ID" },
      { key: "title", label: "Task" },
      { key: "status", label: "Status" },
      { key: "priority", label: "Pri" },
      { key: "assignee", label: "Owner" },
    ],
    rows: tasks,
  };

  return {
    ...state,
    dialogStatus: state.titleDialogOpen ? "open" : "closed",
    taskTitleLineCount: titleLines.length,
    taskCount: tasks.length,
    selectedTaskIndex: safeSelectedTaskIndex,
    selectedTaskId: tasks[safeSelectedTaskIndex]?.id || "-",
    taskListItems,
    taskTableData,
    taskContentPreview: `${previewLines.join("\n")}${suffix}`,
    taskContentLength: String(state.taskContent || "").length,
    titleCursorRow: titleCursor.row,
    titleCursorCol: titleCursor.col,
  };
};

export const selectState = ({ state }) => {
  return state;
};

export const setLastKey = ({ state }, payload = {}) => {
  state.lastKey = payload.key || "unknown";
};

export const setMessage = ({ state }, payload = {}) => {
  state.message = payload.value || "";
};

export const moveTaskSelectionUp = ({ state }) => {
  const tasks = Array.isArray(state.tasks) ? state.tasks : [];
  if (tasks.length === 0) {
    state.selectedTaskIndex = 0;
    return;
  }
  state.selectedTaskIndex = clamp((Number(state.selectedTaskIndex) || 0) - 1, 0, tasks.length - 1);
};

export const moveTaskSelectionDown = ({ state }) => {
  const tasks = Array.isArray(state.tasks) ? state.tasks : [];
  if (tasks.length === 0) {
    state.selectedTaskIndex = 0;
    return;
  }
  state.selectedTaskIndex = clamp((Number(state.selectedTaskIndex) || 0) + 1, 0, tasks.length - 1);
};

export const appendTitleChar = ({ state }, payload = {}) => {
  const char = payload.char;
  if (!char || typeof char !== "string") {
    return;
  }
  const { value, index } = insertWithAutoWrap({
    text: state.titleDraft,
    index: state.titleCursorIndex,
    chunk: char,
    wrapColumns: payload.wrapColumns,
  });
  state.titleDraft = value;
  state.titleCursorIndex = index;
  state.titleCursorPreferredCol = null;
};

export const backspaceTitle = ({ state }) => {
  const safeIndex = normalizeCursorIndex(state.titleCursorIndex, state.titleDraft);
  if (safeIndex <= 0) {
    return;
  }

  state.titleDraft = `${state.titleDraft.slice(0, safeIndex - 1)}${state.titleDraft.slice(safeIndex)}`;
  state.titleCursorIndex = safeIndex - 1;
  state.titleCursorPreferredCol = null;
};

export const setTaskContent = ({ state }, payload = {}) => {
  state.taskContent = String(payload.value || "");
};

export const openTitleDialog = ({ state }) => {
  state.titleDialogOpen = true;
  state.titleDraft = wrapText(state.taskTitle, TITLE_WRAP_COLUMNS);
  state.titleCursorIndex = state.titleDraft.length;
  state.titleCursorPreferredCol = null;
};

export const closeTitleDialog = ({ state }) => {
  state.titleDialogOpen = false;
  state.titleCursorPreferredCol = null;
};

export const saveTitleDialog = ({ state }) => {
  state.taskTitle = wrapText(state.titleDraft, TITLE_WRAP_COLUMNS);
  state.titleDialogOpen = false;
  state.titleCursorPreferredCol = null;
};

export const insertTitleLineBreak = ({ state }) => {
  state.titleDraft = insertAtCursor(state.titleDraft, state.titleCursorIndex, "\n");
  state.titleCursorIndex += 1;
  state.titleCursorPreferredCol = null;
};

export const moveTitleCursorLeft = ({ state }) => {
  state.titleCursorIndex = Math.max(0, state.titleCursorIndex - 1);
  state.titleCursorPreferredCol = null;
};

export const moveTitleCursorRight = ({ state }) => {
  state.titleCursorIndex = Math.min(
    String(state.titleDraft || "").length,
    state.titleCursorIndex + 1,
  );
  state.titleCursorPreferredCol = null;
};

export const moveTitleCursorUp = ({ state }) => {
  const cursor = indexToCursor(state.titleDraft, state.titleCursorIndex);
  const targetCol = state.titleCursorPreferredCol ?? cursor.col;
  if (cursor.row <= 0) {
    return;
  }

  state.titleCursorIndex = cursorToIndex(state.titleDraft, cursor.row - 1, targetCol);
  state.titleCursorPreferredCol = targetCol;
};

export const moveTitleCursorDown = ({ state }) => {
  const lines = toLines(state.titleDraft);
  const cursor = indexToCursor(state.titleDraft, state.titleCursorIndex);
  const targetCol = state.titleCursorPreferredCol ?? cursor.col;
  if (cursor.row >= lines.length - 1) {
    return;
  }

  state.titleCursorIndex = cursorToIndex(state.titleDraft, cursor.row + 1, targetCol);
  state.titleCursorPreferredCol = targetCol;
};

export const resetDemo = ({ state }) => {
  state.message = "Reset";
  state.taskTitle = DEFAULT_TASK_TITLE;
  state.taskContent = DEFAULT_TASK_CONTENT;
  state.tasks = DEFAULT_TASKS.map((task) => ({ ...task }));
  state.selectedTaskIndex = 0;
  state.titleDialogOpen = false;
  state.titleDraft = DEFAULT_TASK_TITLE;
  state.titleCursorIndex = DEFAULT_TASK_TITLE.length;
  state.titleCursorPreferredCol = null;
};
