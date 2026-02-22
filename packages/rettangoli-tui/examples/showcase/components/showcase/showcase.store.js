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
const DEFAULT_SELECTOR_OPTIONS = Object.freeze([
  { id: "demo", label: "Demo environment" },
  { id: "local", label: "Local development" },
  { id: "staging", label: "Staging cluster" },
  { id: "production", label: "Production cluster" },
]);

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const normalizeEnvironmentId = (value) => String(value || "local").trim().toLowerCase();

const findOptionIndexById = (options, optionId) => {
  const safeOptions = Array.isArray(options) ? options : [];
  if (safeOptions.length === 0) {
    return 0;
  }

  const index = safeOptions.findIndex((option) => {
    return String(option?.id || "").toLowerCase() === String(optionId || "").toLowerCase();
  });

  return index >= 0 ? index : 0;
};

const cloneSelectorOptions = () => {
  return DEFAULT_SELECTOR_OPTIONS.map((option) => ({ ...option }));
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

export const createInitialState = ({ props }) => ({
  ...(() => {
    const selectorOptions = cloneSelectorOptions();
    const environmentId = normalizeEnvironmentId(props.environment || "local");
    const selectorIndex = findOptionIndexById(selectorOptions, environmentId);
    const selectedEnvironment = selectorOptions[selectorIndex]?.id || selectorOptions[0]?.id || "demo";
    return {
      selectorOptions,
      selectorIndex,
      initialEnvironment: selectedEnvironment,
      selectedEnvironment,
      modeLabel: `env:${selectedEnvironment}`,
    };
  })(),
  title: "Rettangoli TUI Component Showcase",
  message: "Ready",
  taskTitle: DEFAULT_TASK_TITLE,
  taskContent: DEFAULT_TASK_CONTENT,
  tasks: DEFAULT_TASKS.map((task) => ({ ...task })),
  selectedTaskIndex: 0,
  lastKey: "none",
});

export const selectViewData = ({ state }) => {
  const contentLines = String(state.taskContent || "").split("\n");
  const previewLines = contentLines.slice(0, 5);
  const hiddenCount = Math.max(0, contentLines.length - previewLines.length);
  const suffix = hiddenCount > 0 ? `\n...(${hiddenCount} more line(s))` : "";
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
  const selectorOptions = Array.isArray(state.selectorOptions) ? state.selectorOptions : [];
  const selectedSelectorIndex = findOptionIndexById(selectorOptions, state.selectedEnvironment);
  const selectedSelectorOption = selectorOptions[selectedSelectorIndex] || null;

  return {
    ...state,
    taskTitleLineCount: titleLines.length,
    taskCount: tasks.length,
    selectedTaskIndex: safeSelectedTaskIndex,
    selectedTaskId: tasks[safeSelectedTaskIndex]?.id || "-",
    selectorOptions,
    selectorIndex: selectedSelectorIndex,
    selectorSelectedLabel: selectedSelectorOption?.label || "(none)",
    taskListItems,
    taskTableData,
    taskContentPreview: `${previewLines.join("\n")}${suffix}`,
    taskContentLength: String(state.taskContent || "").length,
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

export const setTaskContent = ({ state }, payload = {}) => {
  state.taskContent = String(payload.value || "");
};

export const setTaskTitleFromDialog = ({ state }, payload = {}) => {
  state.taskTitle = wrapText(String(payload.value || ""), TITLE_WRAP_COLUMNS);
};

export const setSelectedEnvironment = ({ state }, payload = {}) => {
  const options = Array.isArray(state.selectorOptions) ? state.selectorOptions : [];
  const nextEnvironmentId = normalizeEnvironmentId(payload.id || state.selectedEnvironment);
  state.selectedEnvironment = nextEnvironmentId;
  state.selectorIndex = findOptionIndexById(options, nextEnvironmentId);
  state.modeLabel = state.selectedEnvironment ? `env:${state.selectedEnvironment}` : "env:local";
};

export const resetDemo = ({ state }) => {
  const selectorOptions = cloneSelectorOptions();
  const selectedEnvironment = normalizeEnvironmentId(state.initialEnvironment || "local");
  const selectorIndex = findOptionIndexById(selectorOptions, selectedEnvironment);

  state.message = "Reset";
  state.modeLabel = `env:${selectedEnvironment}`;
  state.taskTitle = DEFAULT_TASK_TITLE;
  state.taskContent = DEFAULT_TASK_CONTENT;
  state.tasks = DEFAULT_TASKS.map((task) => ({ ...task }));
  state.selectedTaskIndex = 0;
  state.selectorOptions = selectorOptions;
  state.selectorIndex = selectorIndex;
  state.selectedEnvironment = selectedEnvironment;
};
