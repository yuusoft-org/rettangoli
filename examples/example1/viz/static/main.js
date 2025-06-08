var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// fe/pages/todos.handlers.js
var todos_handlers_exports = {};
__export(todos_handlers_exports, {
  handleClearCompletedClick: () => handleClearCompletedClick,
  handleDeleteClick: () => handleDeleteClick,
  handleFilterClick: () => handleFilterClick,
  handleNewTodoKeyDown: () => handleNewTodoKeyDown,
  handleTodoClick: () => handleTodoClick,
  handleToggleAllClick: () => handleToggleAllClick
});
var handleNewTodoKeyDown = (e, deps2) => {
  if (e.key === "Enter") {
    const title = e.target.value.trim();
    if (title) {
      deps2.store.addTodo(title);
      e.target.value = "";
      deps2.render();
    }
  }
};
var handleToggleAllClick = (_, deps2) => {
  deps2.store.toggleAll();
  deps2.render();
};
var handleTodoClick = (e, deps2) => {
  deps2.store.toggleTodo(e.currentTarget.id.replace("todo-", ""));
  deps2.render();
};
var handleDeleteClick = (e, deps2) => {
  e.stopPropagation();
  deps2.store.deleteTodo(e.currentTarget.id.replace("delete-", ""));
  deps2.render();
};
var handleClearCompletedClick = (_, deps2) => {
  deps2.store.clearCompleted();
  deps2.render();
};
var handleFilterClick = (e, deps2) => {
  deps2.store.setFilter(e.currentTarget.id.replace("filter-", ""));
  deps2.render();
};

// fe/pages/todos.store.js
var todos_store_exports = {};
__export(todos_store_exports, {
  INITIAL_STATE: () => INITIAL_STATE,
  addTodo: () => addTodo,
  clearCompleted: () => clearCompleted,
  deleteTodo: () => deleteTodo,
  setFilter: () => setFilter,
  toViewData: () => toViewData,
  toggleAll: () => toggleAll,
  toggleTodo: () => toggleTodo
});
var INITIAL_STATE = {
  title: "todos",
  placeholderText: "What needs to be done?",
  filter: "all",
  // 'all', 'active', 'completed'
  todos: [
    {
      id: "1",
      title: "Todo 1",
      completed: false
    },
    {
      id: "2",
      title: "Todo 2",
      completed: true
    }
  ]
};
var toViewData = ({ state }) => {
  const activeCount = state.todos.filter((todo) => !todo.completed).length;
  const completedCount = state.todos.filter((todo) => todo.completed).length;
  const filteredTodos = state.todos.filter((todo) => {
    if (state.filter === "active") return !todo.completed;
    if (state.filter === "completed") return todo.completed;
    return true;
  });
  return {
    ...state,
    activeCount,
    completedCount,
    filteredTodos,
    allCompleted: state.todos.length > 0 && state.todos.every((todo) => todo.completed),
    itemText: activeCount === 1 ? "item" : "items",
    showClearCompleted: completedCount > 0,
    isAllFilter: state.filter === "all",
    isActiveFilter: state.filter === "active",
    isCompletedFilter: state.filter === "completed"
  };
};
var addTodo = (state, title) => {
  if (!title.trim()) return;
  const newTodo = {
    id: Date.now().toString(),
    title: title.trim(),
    completed: false
  };
  state.todos.push(newTodo);
};
var toggleTodo = (state, id) => {
  state.todos.forEach((todo) => {
    if (todo.id === id) {
      todo.completed = !todo.completed;
    }
  });
};
var toggleAll = (state) => {
  const allCompleted = state.todos.every((todo) => todo.completed);
  state.todos.forEach((todo) => {
    todo.completed = !allCompleted;
  });
};
var deleteTodo = (state, id) => {
  state.todos = state.todos.filter((todo) => todo.id !== id);
};
var clearCompleted = (state) => {
  state.todos = state.todos.filter((todo) => !todo.completed);
};
var setFilter = (state, filter) => {
  state.filter = filter;
};

// .temp/fe/todos.view.js
var todos_view_default = { "elementName": "custom-todos", "viewDataSchema": { "type": "object", "properties": { "title": { "type": "string" }, "placeholderText": { "type": "string" }, "todos": { "type": "array" }, "filteredTodos": { "type": "array" }, "activeCount": { "type": "number" }, "completedCount": { "type": "number" }, "allCompleted": { "type": "boolean" }, "filter": { "type": "string" } } }, "refs": { "todo-input": { "eventListeners": { "keydown": { "handler": "handleNewTodoKeyDown" } } }, "toggle-all": { "eventListeners": { "click": { "handler": "handleToggleAllClick" } } }, "clear-completed": { "eventListeners": { "click": { "handler": "handleClearCompletedClick" } } }, "completed-todo-svg": { "eventListeners": { "click": { "handler": "handleTodoClick" } } }, "todo-*": { "eventListeners": { "click": { "handler": "handleTodoClick" } } }, "delete-*": { "eventListeners": { "click": { "handler": "handleDeleteClick" } } }, "filter-*": { "eventListeners": { "click": { "handler": "handleFilterClick" } } } }, "styles": {}, "template": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view#root d=v ah=c av=c w=f", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view#app w=550 h=100vh ah=c", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view#header ah=c ph=lg pv=xl w=f", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text s=h1 ta=c c=fg", "value": { "type": 1, "path": "title" } }], "fast": true }, { "type": 8, "properties": [{ "key": "rtgl-view d=h av=c mt=xl w=f", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-svg#toggle-all mr=sm svg=tick c=fg wh=48", "value": { "type": 0, "value": null } }], "fast": true }, { "type": 8, "properties": [{ "key": 'input#todo-input style="height: 48px; width: 100%; flex: 1;" ph=xl w=f placeholder="${placeholderText}"', "value": { "type": 0, "value": null }, "parsedKey": { "type": 2, "parts": ['input#todo-input style="height: 48px; width: 100%; flex: 1;" ph=xl w=f placeholder="', { "var": "placeholderText" }, '"'] } }], "fast": true }], "fast": true } }], "fast": true }], "fast": true } }], "fast": true }, { "type": 8, "properties": [{ "key": "rtgl-view#main ah=c w=f", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view#todo-list w=f", "value": { "type": 9, "items": [{ "type": 7, "itemVar": "todo", "indexVar": "i", "iterable": { "type": 1, "path": "filteredTodos" }, "body": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view#todo w=f g=xl d=h av=c pv=md ph=lg bwb=xs", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view flex=1 d=h av=c", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "$if todo.completed", "value": { "type": 6, "conditions": [{ "type": 1, "path": "todo.completed" }, null], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-svg#todo-${todo.id} svg=tick c=fg wh=16", "value": { "type": 0, "value": null }, "parsedKey": { "type": 2, "parts": ["rtgl-svg#todo-", { "var": "todo.id" }, " svg=tick c=fg wh=16"] } }], "fast": true }, { "type": 8, "properties": [{ "key": "rtgl-text c=su-fg ml=md", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "del", "value": { "type": 1, "path": "todo.title" } }], "fast": true }], "fast": true } }], "fast": true }], "fast": true }, { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view#todo-${todo.id} bgc=fg w=16 h=16", "value": { "type": 0, "value": null }, "parsedKey": { "type": 2, "parts": ["rtgl-view#todo-", { "var": "todo.id" }, " bgc=fg w=16 h=16"] } }], "fast": true }, { "type": 8, "properties": [{ "key": "rtgl-text c=er-fg ml=md", "value": { "type": 1, "path": "todo.title" } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }, { "type": 8, "properties": [{ "key": "rtgl-view flex=1", "value": { "type": 0, "value": null } }], "fast": true }, { "type": 8, "properties": [{ "key": "rtgl-svg#delete-${todo.id} svg=cross c=fg wh=16", "value": { "type": 0, "value": null }, "parsedKey": { "type": 2, "parts": ["rtgl-svg#delete-", { "var": "todo.id" }, " svg=cross c=fg wh=16"] } }], "fast": true }], "fast": false } }], "fast": false }], "fast": false } }], "fast": false }], "fast": false } }], "fast": false } }], "fast": false }], "fast": false } }], "fast": false }, { "type": 8, "properties": [{ "key": "rtgl-view#footer d=h p=md c=mu-fg av=c mt=xl", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text", "value": { "type": 2, "parts": [{ "var": "activeCount" }, " ", { "var": "itemText" }, " left"] } }], "fast": true }, { "type": 8, "properties": [{ "key": "rtgl-view w=8", "value": { "type": 0, "value": null } }], "fast": true }, { "type": 8, "properties": [{ "key": "$if isAllFilter", "value": { "type": 6, "conditions": [{ "type": 1, "path": "isAllFilter" }, null], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-button#filter-all s=sm v=pr", "value": { "type": 0, "value": "All" } }], "fast": true }], "fast": true }, { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-button#filter-all s=sm v=lk", "value": { "type": 0, "value": "All" } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }, { "type": 8, "properties": [{ "key": "$if isActiveFilter", "value": { "type": 6, "conditions": [{ "type": 1, "path": "isActiveFilter" }, null], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-button#filter-active s=sm v=pr", "value": { "type": 0, "value": "Active" } }], "fast": true }], "fast": true }, { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-button#filter-active s=sm v=lk", "value": { "type": 0, "value": "Active" } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }, { "type": 8, "properties": [{ "key": "$if isCompletedFilter", "value": { "type": 6, "conditions": [{ "type": 1, "path": "isCompletedFilter" }, null], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-button#filter-completed s=sm v=pr", "value": { "type": 0, "value": "Completed" } }], "fast": true }], "fast": true }, { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-button#filter-completed s=sm v=lk", "value": { "type": 0, "value": "Completed" } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }, { "type": 8, "properties": [{ "key": "rtgl-button#clear-completed s=sm v=lk", "value": { "type": 2, "parts": ["Clear completed (", { "var": "completedCount" }, ")"] } }], "fast": true }], "fast": false } }], "fast": false }], "fast": false } }], "fast": false }], "fast": false } }], "fast": false }], "fast": false } };

// ../../node_modules/immer/dist/immer.mjs
var NOTHING = Symbol.for("immer-nothing");
var DRAFTABLE = Symbol.for("immer-draftable");
var DRAFT_STATE = Symbol.for("immer-state");
var errors = true ? [
  // All error codes, starting by 0:
  function(plugin) {
    return `The plugin for '${plugin}' has not been loaded into Immer. To enable the plugin, import and call \`enable${plugin}()\` when initializing your application.`;
  },
  function(thing) {
    return `produce can only be called on things that are draftable: plain objects, arrays, Map, Set or classes that are marked with '[immerable]: true'. Got '${thing}'`;
  },
  "This object has been frozen and should not be mutated",
  function(data) {
    return "Cannot use a proxy that has been revoked. Did you pass an object from inside an immer function to an async process? " + data;
  },
  "An immer producer returned a new value *and* modified its draft. Either return a new value *or* modify the draft.",
  "Immer forbids circular references",
  "The first or second argument to `produce` must be a function",
  "The third argument to `produce` must be a function or undefined",
  "First argument to `createDraft` must be a plain object, an array, or an immerable object",
  "First argument to `finishDraft` must be a draft returned by `createDraft`",
  function(thing) {
    return `'current' expects a draft, got: ${thing}`;
  },
  "Object.defineProperty() cannot be used on an Immer draft",
  "Object.setPrototypeOf() cannot be used on an Immer draft",
  "Immer only supports deleting array indices",
  "Immer only supports setting array indices and the 'length' property",
  function(thing) {
    return `'original' expects a draft, got: ${thing}`;
  }
  // Note: if more errors are added, the errorOffset in Patches.ts should be increased
  // See Patches.ts for additional errors
] : [];
function die(error, ...args) {
  if (true) {
    const e = errors[error];
    const msg = typeof e === "function" ? e.apply(null, args) : e;
    throw new Error(`[Immer] ${msg}`);
  }
  throw new Error(
    `[Immer] minified error nr: ${error}. Full error at: https://bit.ly/3cXEKWf`
  );
}
var getPrototypeOf = Object.getPrototypeOf;
function isDraft(value) {
  return !!value && !!value[DRAFT_STATE];
}
function isDraftable(value) {
  if (!value)
    return false;
  return isPlainObject(value) || Array.isArray(value) || !!value[DRAFTABLE] || !!value.constructor?.[DRAFTABLE] || isMap(value) || isSet(value);
}
var objectCtorString = Object.prototype.constructor.toString();
function isPlainObject(value) {
  if (!value || typeof value !== "object")
    return false;
  const proto = getPrototypeOf(value);
  if (proto === null) {
    return true;
  }
  const Ctor = Object.hasOwnProperty.call(proto, "constructor") && proto.constructor;
  if (Ctor === Object)
    return true;
  return typeof Ctor == "function" && Function.toString.call(Ctor) === objectCtorString;
}
function each(obj, iter) {
  if (getArchtype(obj) === 0) {
    Reflect.ownKeys(obj).forEach((key) => {
      iter(key, obj[key], obj);
    });
  } else {
    obj.forEach((entry, index) => iter(index, entry, obj));
  }
}
function getArchtype(thing) {
  const state = thing[DRAFT_STATE];
  return state ? state.type_ : Array.isArray(thing) ? 1 : isMap(thing) ? 2 : isSet(thing) ? 3 : 0;
}
function has(thing, prop) {
  return getArchtype(thing) === 2 ? thing.has(prop) : Object.prototype.hasOwnProperty.call(thing, prop);
}
function set(thing, propOrOldValue, value) {
  const t = getArchtype(thing);
  if (t === 2)
    thing.set(propOrOldValue, value);
  else if (t === 3) {
    thing.add(value);
  } else
    thing[propOrOldValue] = value;
}
function is(x, y) {
  if (x === y) {
    return x !== 0 || 1 / x === 1 / y;
  } else {
    return x !== x && y !== y;
  }
}
function isMap(target) {
  return target instanceof Map;
}
function isSet(target) {
  return target instanceof Set;
}
function latest(state) {
  return state.copy_ || state.base_;
}
function shallowCopy(base, strict) {
  if (isMap(base)) {
    return new Map(base);
  }
  if (isSet(base)) {
    return new Set(base);
  }
  if (Array.isArray(base))
    return Array.prototype.slice.call(base);
  const isPlain = isPlainObject(base);
  if (strict === true || strict === "class_only" && !isPlain) {
    const descriptors = Object.getOwnPropertyDescriptors(base);
    delete descriptors[DRAFT_STATE];
    let keys = Reflect.ownKeys(descriptors);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const desc = descriptors[key];
      if (desc.writable === false) {
        desc.writable = true;
        desc.configurable = true;
      }
      if (desc.get || desc.set)
        descriptors[key] = {
          configurable: true,
          writable: true,
          // could live with !!desc.set as well here...
          enumerable: desc.enumerable,
          value: base[key]
        };
    }
    return Object.create(getPrototypeOf(base), descriptors);
  } else {
    const proto = getPrototypeOf(base);
    if (proto !== null && isPlain) {
      return { ...base };
    }
    const obj = Object.create(proto);
    return Object.assign(obj, base);
  }
}
function freeze(obj, deep = false) {
  if (isFrozen(obj) || isDraft(obj) || !isDraftable(obj))
    return obj;
  if (getArchtype(obj) > 1) {
    obj.set = obj.add = obj.clear = obj.delete = dontMutateFrozenCollections;
  }
  Object.freeze(obj);
  if (deep)
    Object.entries(obj).forEach(([key, value]) => freeze(value, true));
  return obj;
}
function dontMutateFrozenCollections() {
  die(2);
}
function isFrozen(obj) {
  return Object.isFrozen(obj);
}
var plugins = {};
function getPlugin(pluginKey) {
  const plugin = plugins[pluginKey];
  if (!plugin) {
    die(0, pluginKey);
  }
  return plugin;
}
var currentScope;
function getCurrentScope() {
  return currentScope;
}
function createScope(parent_, immer_) {
  return {
    drafts_: [],
    parent_,
    immer_,
    // Whenever the modified draft contains a draft from another scope, we
    // need to prevent auto-freezing so the unowned draft can be finalized.
    canAutoFreeze_: true,
    unfinalizedDrafts_: 0
  };
}
function usePatchesInScope(scope, patchListener) {
  if (patchListener) {
    getPlugin("Patches");
    scope.patches_ = [];
    scope.inversePatches_ = [];
    scope.patchListener_ = patchListener;
  }
}
function revokeScope(scope) {
  leaveScope(scope);
  scope.drafts_.forEach(revokeDraft);
  scope.drafts_ = null;
}
function leaveScope(scope) {
  if (scope === currentScope) {
    currentScope = scope.parent_;
  }
}
function enterScope(immer2) {
  return currentScope = createScope(currentScope, immer2);
}
function revokeDraft(draft) {
  const state = draft[DRAFT_STATE];
  if (state.type_ === 0 || state.type_ === 1)
    state.revoke_();
  else
    state.revoked_ = true;
}
function processResult(result, scope) {
  scope.unfinalizedDrafts_ = scope.drafts_.length;
  const baseDraft = scope.drafts_[0];
  const isReplaced = result !== void 0 && result !== baseDraft;
  if (isReplaced) {
    if (baseDraft[DRAFT_STATE].modified_) {
      revokeScope(scope);
      die(4);
    }
    if (isDraftable(result)) {
      result = finalize(scope, result);
      if (!scope.parent_)
        maybeFreeze(scope, result);
    }
    if (scope.patches_) {
      getPlugin("Patches").generateReplacementPatches_(
        baseDraft[DRAFT_STATE].base_,
        result,
        scope.patches_,
        scope.inversePatches_
      );
    }
  } else {
    result = finalize(scope, baseDraft, []);
  }
  revokeScope(scope);
  if (scope.patches_) {
    scope.patchListener_(scope.patches_, scope.inversePatches_);
  }
  return result !== NOTHING ? result : void 0;
}
function finalize(rootScope, value, path) {
  if (isFrozen(value))
    return value;
  const state = value[DRAFT_STATE];
  if (!state) {
    each(
      value,
      (key, childValue) => finalizeProperty(rootScope, state, value, key, childValue, path)
    );
    return value;
  }
  if (state.scope_ !== rootScope)
    return value;
  if (!state.modified_) {
    maybeFreeze(rootScope, state.base_, true);
    return state.base_;
  }
  if (!state.finalized_) {
    state.finalized_ = true;
    state.scope_.unfinalizedDrafts_--;
    const result = state.copy_;
    let resultEach = result;
    let isSet2 = false;
    if (state.type_ === 3) {
      resultEach = new Set(result);
      result.clear();
      isSet2 = true;
    }
    each(
      resultEach,
      (key, childValue) => finalizeProperty(rootScope, state, result, key, childValue, path, isSet2)
    );
    maybeFreeze(rootScope, result, false);
    if (path && rootScope.patches_) {
      getPlugin("Patches").generatePatches_(
        state,
        path,
        rootScope.patches_,
        rootScope.inversePatches_
      );
    }
  }
  return state.copy_;
}
function finalizeProperty(rootScope, parentState, targetObject, prop, childValue, rootPath, targetIsSet) {
  if (childValue === targetObject)
    die(5);
  if (isDraft(childValue)) {
    const path = rootPath && parentState && parentState.type_ !== 3 && // Set objects are atomic since they have no keys.
    !has(parentState.assigned_, prop) ? rootPath.concat(prop) : void 0;
    const res = finalize(rootScope, childValue, path);
    set(targetObject, prop, res);
    if (isDraft(res)) {
      rootScope.canAutoFreeze_ = false;
    } else
      return;
  } else if (targetIsSet) {
    targetObject.add(childValue);
  }
  if (isDraftable(childValue) && !isFrozen(childValue)) {
    if (!rootScope.immer_.autoFreeze_ && rootScope.unfinalizedDrafts_ < 1) {
      return;
    }
    finalize(rootScope, childValue);
    if ((!parentState || !parentState.scope_.parent_) && typeof prop !== "symbol" && Object.prototype.propertyIsEnumerable.call(targetObject, prop))
      maybeFreeze(rootScope, childValue);
  }
}
function maybeFreeze(scope, value, deep = false) {
  if (!scope.parent_ && scope.immer_.autoFreeze_ && scope.canAutoFreeze_) {
    freeze(value, deep);
  }
}
function createProxyProxy(base, parent) {
  const isArray = Array.isArray(base);
  const state = {
    type_: isArray ? 1 : 0,
    // Track which produce call this is associated with.
    scope_: parent ? parent.scope_ : getCurrentScope(),
    // True for both shallow and deep changes.
    modified_: false,
    // Used during finalization.
    finalized_: false,
    // Track which properties have been assigned (true) or deleted (false).
    assigned_: {},
    // The parent draft state.
    parent_: parent,
    // The base state.
    base_: base,
    // The base proxy.
    draft_: null,
    // set below
    // The base copy with any updated values.
    copy_: null,
    // Called by the `produce` function.
    revoke_: null,
    isManual_: false
  };
  let target = state;
  let traps = objectTraps;
  if (isArray) {
    target = [state];
    traps = arrayTraps;
  }
  const { revoke, proxy } = Proxy.revocable(target, traps);
  state.draft_ = proxy;
  state.revoke_ = revoke;
  return proxy;
}
var objectTraps = {
  get(state, prop) {
    if (prop === DRAFT_STATE)
      return state;
    const source = latest(state);
    if (!has(source, prop)) {
      return readPropFromProto(state, source, prop);
    }
    const value = source[prop];
    if (state.finalized_ || !isDraftable(value)) {
      return value;
    }
    if (value === peek(state.base_, prop)) {
      prepareCopy(state);
      return state.copy_[prop] = createProxy(value, state);
    }
    return value;
  },
  has(state, prop) {
    return prop in latest(state);
  },
  ownKeys(state) {
    return Reflect.ownKeys(latest(state));
  },
  set(state, prop, value) {
    const desc = getDescriptorFromProto(latest(state), prop);
    if (desc?.set) {
      desc.set.call(state.draft_, value);
      return true;
    }
    if (!state.modified_) {
      const current2 = peek(latest(state), prop);
      const currentState = current2?.[DRAFT_STATE];
      if (currentState && currentState.base_ === value) {
        state.copy_[prop] = value;
        state.assigned_[prop] = false;
        return true;
      }
      if (is(value, current2) && (value !== void 0 || has(state.base_, prop)))
        return true;
      prepareCopy(state);
      markChanged(state);
    }
    if (state.copy_[prop] === value && // special case: handle new props with value 'undefined'
    (value !== void 0 || prop in state.copy_) || // special case: NaN
    Number.isNaN(value) && Number.isNaN(state.copy_[prop]))
      return true;
    state.copy_[prop] = value;
    state.assigned_[prop] = true;
    return true;
  },
  deleteProperty(state, prop) {
    if (peek(state.base_, prop) !== void 0 || prop in state.base_) {
      state.assigned_[prop] = false;
      prepareCopy(state);
      markChanged(state);
    } else {
      delete state.assigned_[prop];
    }
    if (state.copy_) {
      delete state.copy_[prop];
    }
    return true;
  },
  // Note: We never coerce `desc.value` into an Immer draft, because we can't make
  // the same guarantee in ES5 mode.
  getOwnPropertyDescriptor(state, prop) {
    const owner = latest(state);
    const desc = Reflect.getOwnPropertyDescriptor(owner, prop);
    if (!desc)
      return desc;
    return {
      writable: true,
      configurable: state.type_ !== 1 || prop !== "length",
      enumerable: desc.enumerable,
      value: owner[prop]
    };
  },
  defineProperty() {
    die(11);
  },
  getPrototypeOf(state) {
    return getPrototypeOf(state.base_);
  },
  setPrototypeOf() {
    die(12);
  }
};
var arrayTraps = {};
each(objectTraps, (key, fn) => {
  arrayTraps[key] = function() {
    arguments[0] = arguments[0][0];
    return fn.apply(this, arguments);
  };
});
arrayTraps.deleteProperty = function(state, prop) {
  if (isNaN(parseInt(prop)))
    die(13);
  return arrayTraps.set.call(this, state, prop, void 0);
};
arrayTraps.set = function(state, prop, value) {
  if (prop !== "length" && isNaN(parseInt(prop)))
    die(14);
  return objectTraps.set.call(this, state[0], prop, value, state[0]);
};
function peek(draft, prop) {
  const state = draft[DRAFT_STATE];
  const source = state ? latest(state) : draft;
  return source[prop];
}
function readPropFromProto(state, source, prop) {
  const desc = getDescriptorFromProto(source, prop);
  return desc ? `value` in desc ? desc.value : (
    // This is a very special case, if the prop is a getter defined by the
    // prototype, we should invoke it with the draft as context!
    desc.get?.call(state.draft_)
  ) : void 0;
}
function getDescriptorFromProto(source, prop) {
  if (!(prop in source))
    return void 0;
  let proto = getPrototypeOf(source);
  while (proto) {
    const desc = Object.getOwnPropertyDescriptor(proto, prop);
    if (desc)
      return desc;
    proto = getPrototypeOf(proto);
  }
  return void 0;
}
function markChanged(state) {
  if (!state.modified_) {
    state.modified_ = true;
    if (state.parent_) {
      markChanged(state.parent_);
    }
  }
}
function prepareCopy(state) {
  if (!state.copy_) {
    state.copy_ = shallowCopy(
      state.base_,
      state.scope_.immer_.useStrictShallowCopy_
    );
  }
}
var Immer2 = class {
  constructor(config) {
    this.autoFreeze_ = true;
    this.useStrictShallowCopy_ = false;
    this.produce = (base, recipe, patchListener) => {
      if (typeof base === "function" && typeof recipe !== "function") {
        const defaultBase = recipe;
        recipe = base;
        const self = this;
        return function curriedProduce(base2 = defaultBase, ...args) {
          return self.produce(base2, (draft) => recipe.call(this, draft, ...args));
        };
      }
      if (typeof recipe !== "function")
        die(6);
      if (patchListener !== void 0 && typeof patchListener !== "function")
        die(7);
      let result;
      if (isDraftable(base)) {
        const scope = enterScope(this);
        const proxy = createProxy(base, void 0);
        let hasError = true;
        try {
          result = recipe(proxy);
          hasError = false;
        } finally {
          if (hasError)
            revokeScope(scope);
          else
            leaveScope(scope);
        }
        usePatchesInScope(scope, patchListener);
        return processResult(result, scope);
      } else if (!base || typeof base !== "object") {
        result = recipe(base);
        if (result === void 0)
          result = base;
        if (result === NOTHING)
          result = void 0;
        if (this.autoFreeze_)
          freeze(result, true);
        if (patchListener) {
          const p = [];
          const ip = [];
          getPlugin("Patches").generateReplacementPatches_(base, result, p, ip);
          patchListener(p, ip);
        }
        return result;
      } else
        die(1, base);
    };
    this.produceWithPatches = (base, recipe) => {
      if (typeof base === "function") {
        return (state, ...args) => this.produceWithPatches(state, (draft) => base(draft, ...args));
      }
      let patches, inversePatches;
      const result = this.produce(base, recipe, (p, ip) => {
        patches = p;
        inversePatches = ip;
      });
      return [result, patches, inversePatches];
    };
    if (typeof config?.autoFreeze === "boolean")
      this.setAutoFreeze(config.autoFreeze);
    if (typeof config?.useStrictShallowCopy === "boolean")
      this.setUseStrictShallowCopy(config.useStrictShallowCopy);
  }
  createDraft(base) {
    if (!isDraftable(base))
      die(8);
    if (isDraft(base))
      base = current(base);
    const scope = enterScope(this);
    const proxy = createProxy(base, void 0);
    proxy[DRAFT_STATE].isManual_ = true;
    leaveScope(scope);
    return proxy;
  }
  finishDraft(draft, patchListener) {
    const state = draft && draft[DRAFT_STATE];
    if (!state || !state.isManual_)
      die(9);
    const { scope_: scope } = state;
    usePatchesInScope(scope, patchListener);
    return processResult(void 0, scope);
  }
  /**
   * Pass true to automatically freeze all copies created by Immer.
   *
   * By default, auto-freezing is enabled.
   */
  setAutoFreeze(value) {
    this.autoFreeze_ = value;
  }
  /**
   * Pass true to enable strict shallow copy.
   *
   * By default, immer does not copy the object descriptors such as getter, setter and non-enumrable properties.
   */
  setUseStrictShallowCopy(value) {
    this.useStrictShallowCopy_ = value;
  }
  applyPatches(base, patches) {
    let i;
    for (i = patches.length - 1; i >= 0; i--) {
      const patch2 = patches[i];
      if (patch2.path.length === 0 && patch2.op === "replace") {
        base = patch2.value;
        break;
      }
    }
    if (i > -1) {
      patches = patches.slice(i + 1);
    }
    const applyPatchesImpl = getPlugin("Patches").applyPatches_;
    if (isDraft(base)) {
      return applyPatchesImpl(base, patches);
    }
    return this.produce(
      base,
      (draft) => applyPatchesImpl(draft, patches)
    );
  }
};
function createProxy(value, parent) {
  const draft = isMap(value) ? getPlugin("MapSet").proxyMap_(value, parent) : isSet(value) ? getPlugin("MapSet").proxySet_(value, parent) : createProxyProxy(value, parent);
  const scope = parent ? parent.scope_ : getCurrentScope();
  scope.drafts_.push(draft);
  return draft;
}
function current(value) {
  if (!isDraft(value))
    die(10, value);
  return currentImpl(value);
}
function currentImpl(value) {
  if (!isDraftable(value) || isFrozen(value))
    return value;
  const state = value[DRAFT_STATE];
  let copy;
  if (state) {
    if (!state.modified_)
      return state.base_;
    state.finalized_ = true;
    copy = shallowCopy(value, state.scope_.immer_.useStrictShallowCopy_);
  } else {
    copy = shallowCopy(value, true);
  }
  each(copy, (key, childValue) => {
    set(copy, key, currentImpl(childValue));
  });
  if (state) {
    state.finalized_ = false;
  }
  return copy;
}
var immer = new Immer2();
var produce = immer.produce;
var produceWithPatches = immer.produceWithPatches.bind(
  immer
);
var setAutoFreeze = immer.setAutoFreeze.bind(immer);
var setUseStrictShallowCopy = immer.setUseStrictShallowCopy.bind(immer);
var applyPatches = immer.applyPatches.bind(immer);
var createDraft = immer.createDraft.bind(immer);
var finishDraft = immer.finishDraft.bind(immer);

// ../../node_modules/jempl/src/parse/constants.js
var NodeType = {
  LITERAL: 0,
  VARIABLE: 1,
  INTERPOLATION: 2,
  FUNCTION: 3,
  BINARY: 4,
  UNARY: 5,
  CONDITIONAL: 6,
  LOOP: 7,
  OBJECT: 8,
  ARRAY: 9
};
var BinaryOp = {
  EQ: 0,
  // ==
  NEQ: 1,
  // !=
  GT: 2,
  // >
  LT: 3,
  // <
  GTE: 4,
  // >=
  LTE: 5,
  // <=
  AND: 6,
  // &&
  OR: 7,
  // ||
  IN: 8
  // in
};
var UnaryOp = {
  NOT: 0
  // !
};

// ../../node_modules/jempl/src/render.js
var render = (input) => {
  const { ast, functions, data } = input;
  return renderNode(ast, functions, data, {});
};
var renderNode = (node, functions, data, scope) => {
  switch (node.type) {
    case NodeType.LITERAL:
      return node.value;
    case NodeType.VARIABLE:
      return getVariableValue(node.path, data, scope);
    case NodeType.INTERPOLATION:
      return renderInterpolation(node.parts, functions, data, scope);
    case NodeType.FUNCTION:
      return renderFunction(node, functions, data, scope);
    case NodeType.BINARY:
      return renderBinaryOperation(node, functions, data, scope);
    case NodeType.UNARY:
      return renderUnaryOperation(node, functions, data, scope);
    case NodeType.CONDITIONAL:
      return renderConditional(node, functions, data, scope);
    case NodeType.LOOP:
      return renderLoop(node, functions, data, scope);
    case NodeType.OBJECT:
      return renderObject(node, functions, data, scope);
    case NodeType.ARRAY:
      return renderArray(node, functions, data, scope);
    default:
      throw new Error(`Unknown node type: ${node.type}`);
  }
};
var getVariableValue = (path, data, scope) => {
  if (!path) return void 0;
  if (scope.hasOwnProperty(path)) {
    return scope[path];
  }
  const parts = path.split(".");
  let current2 = data;
  for (const part of parts) {
    if (current2 == null) return void 0;
    if (scope.hasOwnProperty(part)) {
      current2 = scope[part];
    } else {
      current2 = current2[part];
    }
  }
  return current2;
};
var renderInterpolation = (parts, functions, data, scope) => {
  let result = "";
  for (const part of parts) {
    if (typeof part === "string") {
      result += part;
    } else if (part.var) {
      const value = getVariableValue(part.var, data, scope);
      result += value != null ? String(value) : "";
    } else if (part.func) {
      const funcResult = functions[part.func]?.(...part.args || []);
      result += funcResult != null ? String(funcResult) : "";
    }
  }
  return result;
};
var renderFunction = (node, functions, data, scope) => {
  const func = functions[node.name];
  if (!func) {
    throw new Error(`Function '${node.name}' is not defined`);
  }
  const args = node.args.map((arg) => renderNode(arg, functions, data, scope));
  return func(...args);
};
var evaluateCondition = (node, functions, data, scope) => {
  switch (node.type) {
    case NodeType.VARIABLE:
      return getVariableValue(node.path, data, scope);
    case NodeType.LITERAL:
      return node.value;
    case NodeType.BINARY:
      return renderBinaryOperation(node, functions, data, scope);
    case NodeType.UNARY:
      return renderUnaryOperation(node, functions, data, scope);
    case NodeType.FUNCTION:
      return renderFunction(node, functions, data, scope);
    default:
      return renderNode(node, functions, data, scope);
  }
};
var renderBinaryOperation = (node, functions, data, scope) => {
  if (node.op === BinaryOp.AND || node.op === BinaryOp.OR) {
    const left2 = evaluateCondition(node.left, functions, data, scope);
    const right2 = evaluateCondition(node.right, functions, data, scope);
    switch (node.op) {
      case BinaryOp.AND:
        return left2 && right2;
      case BinaryOp.OR:
        return left2 || right2;
    }
  }
  const left = renderNode(node.left, functions, data, scope);
  const right = renderNode(node.right, functions, data, scope);
  switch (node.op) {
    case BinaryOp.EQ:
      return left == right;
    case BinaryOp.NEQ:
      return left != right;
    case BinaryOp.GT:
      return left > right;
    case BinaryOp.LT:
      return left < right;
    case BinaryOp.GTE:
      return left >= right;
    case BinaryOp.LTE:
      return left <= right;
    case BinaryOp.IN:
      return Array.isArray(right) ? right.includes(left) : false;
    default:
      throw new Error(`Unknown binary operator: ${node.op}`);
  }
};
var renderUnaryOperation = (node, functions, data, scope) => {
  const operand = node.op === UnaryOp.NOT ? evaluateCondition(node.operand, functions, data, scope) : renderNode(node.operand, functions, data, scope);
  switch (node.op) {
    case UnaryOp.NOT:
      return !operand;
    default:
      throw new Error(`Unknown unary operator: ${node.op}`);
  }
};
var renderConditional = (node, functions, data, scope) => {
  for (let i = 0; i < node.conditions.length; i++) {
    const condition = node.conditions[i];
    if (condition === null) {
      return renderNode(node.bodies[i], functions, data, scope);
    }
    const conditionValue = evaluateCondition(condition, functions, data, scope);
    if (conditionValue) {
      return renderNode(node.bodies[i], functions, data, scope);
    }
  }
  return {};
};
var renderLoop = (node, functions, data, scope) => {
  const iterable = renderNode(node.iterable, functions, data, scope);
  if (!Array.isArray(iterable)) {
    return [];
  }
  const results = [];
  for (let i = 0; i < iterable.length; i++) {
    const newScope = Object.create(scope);
    newScope[node.itemVar] = iterable[i];
    if (node.indexVar) {
      newScope[node.indexVar] = i;
    }
    const rendered = renderNode(node.body, functions, data, newScope);
    if (Array.isArray(rendered) && rendered.length === 1) {
      results.push(rendered[0]);
    } else {
      results.push(rendered);
    }
  }
  return results;
};
var renderObject = (node, functions, data, scope) => {
  const result = {};
  let conditionalResult = null;
  let hasNonConditionalProperties = false;
  for (const prop of node.properties) {
    if (!prop.key.startsWith("$if ") && !prop.key.match(/^\$if\s+\w+.*:?$/) && !prop.key.startsWith("$elif") && !prop.key.startsWith("$else") && !prop.key.startsWith("$for ")) {
      hasNonConditionalProperties = true;
      break;
    }
  }
  for (const prop of node.properties) {
    if (prop.key.startsWith("$if ") || prop.key.match(/^\$if\s+\w+.*:?$/)) {
      const rendered = renderNode(prop.value, functions, data, scope);
      if (!hasNonConditionalProperties && rendered !== null && rendered !== void 0) {
        if (Array.isArray(rendered) && rendered.length === 1) {
          return rendered[0];
        }
        return rendered;
      }
      if (typeof rendered === "object" && rendered !== null && !Array.isArray(rendered)) {
        Object.assign(result, rendered);
      }
    } else if (prop.key.startsWith("$for ")) {
    } else {
      const propValue = prop.value;
      if (propValue && propValue.type === NodeType.OBJECT && propValue.properties) {
        const loopProp = propValue.properties.find(
          (p) => p.key.startsWith("$for ")
        );
        if (loopProp) {
          const loopResult = renderNode(loopProp.value, functions, data, scope);
          if (loopResult !== void 0) {
            result[prop.key] = loopResult;
          }
        } else {
          const renderedValue = renderNode(prop.value, functions, data, scope);
          if (renderedValue !== void 0) {
            result[prop.key] = renderedValue;
          }
        }
      } else {
        const renderedKey = prop.parsedKey ? renderNode(prop.parsedKey, functions, data, scope) : prop.key;
        const renderedValue = renderNode(prop.value, functions, data, scope);
        if (renderedValue !== void 0) {
          result[renderedKey] = renderedValue;
        }
      }
    }
  }
  return result;
};
var renderArray = (node, functions, data, scope) => {
  const results = [];
  for (const item of node.items) {
    if (item.type === NodeType.LOOP) {
      const loopResults = renderNode(item, functions, data, scope);
      results.push(loopResults);
    } else {
      results.push(renderNode(item, functions, data, scope));
    }
  }
  return results;
};
var render_default = render;

// ../../packages/rettangoli-fe/src/parser.js
var lodashGet = (obj, path) => {
  return path.split(".").reduce((acc, part) => acc && acc[part], obj);
};
var flattenArrays = (items) => {
  if (!Array.isArray(items)) {
    return items;
  }
  return items.reduce((acc, item) => {
    if (Array.isArray(item)) {
      acc.push(...flattenArrays(item));
    } else {
      if (item && typeof item === "object") {
        const entries = Object.entries(item);
        if (entries.length > 0) {
          const [key, value] = entries[0];
          if (Array.isArray(value)) {
            item = { [key]: flattenArrays(value) };
          }
        }
      }
      acc.push(item);
    }
    return acc;
  }, []);
};
var parseView = ({ h: h2, template, viewData, refs, handlers }) => {
  const result = render_default({
    ast: template,
    data: viewData
  });
  const flattenedResult = flattenArrays(result);
  const childNodes = createVirtualDom({
    h: h2,
    items: flattenedResult,
    refs,
    handlers,
    viewData
  });
  const vdom = h2("div", { style: { display: "contents" } }, childNodes);
  return vdom;
};
var createVirtualDom = ({
  h: h2,
  items,
  refs = {},
  handlers = {},
  viewData = {}
}) => {
  if (!Array.isArray(items)) {
    console.error("Input to createVirtualDom must be an array.");
    return [h2("div", {}, [])];
  }
  function processItems(currentItems, parentPath = "") {
    return currentItems.map((item, index) => {
      if (typeof item === "string" || typeof item === "number") {
        return String(item);
      }
      if (typeof item !== "object" || item === null) {
        console.warn("Skipping invalid item in DOM structure:", item);
        return null;
      }
      const entries = Object.entries(item);
      if (entries.length === 0) {
        console.warn("Skipping empty object item:", item);
        return null;
      }
      const [keyString, value] = entries[0];
      if (!isNaN(Number(keyString))) {
        if (Array.isArray(value)) {
          return processItems(value, `${parentPath}.${keyString}`);
        } else if (typeof value === "object" && value !== null) {
          const nestedEntries = Object.entries(value);
          if (nestedEntries.length > 0) {
            return processItems([value], `${parentPath}.${keyString}`);
          }
        }
        return String(value);
      }
      if (entries.length > 1) {
        console.warn(
          "Item has multiple keys, processing only the first:",
          keyString
        );
      }
      let selector;
      let attrsString;
      const firstSpaceIndex = keyString.indexOf(" ");
      if (firstSpaceIndex === -1) {
        selector = keyString;
        attrsString = "";
      } else {
        selector = keyString.substring(0, firstSpaceIndex);
        attrsString = keyString.substring(firstSpaceIndex + 1).trim();
      }
      const tagName2 = selector.split(/[.#]/)[0];
      const isWebComponent = tagName2.includes("-");
      const attrs = {};
      const props = {};
      if (attrsString) {
        const attrRegex = /(\S+?)=(?:\"([^\"]*)\"|\'([^\']*)\'|(\S+))/g;
        let match;
        while ((match = attrRegex.exec(attrsString)) !== null) {
          if (match[1].startsWith(".")) {
            const propName = match[1].substring(1);
            const valuePathName = match[4];
            props[propName] = lodashGet(viewData, valuePathName);
          } else {
            attrs[match[1]] = match[2] || match[3] || match[4];
          }
        }
      }
      const idMatchInSelector = selector.match(/#([^.#\s]+)/);
      if (idMatchInSelector && !Object.prototype.hasOwnProperty.call(attrs, "id")) {
        attrs.id = idMatchInSelector[1];
      }
      let elementIdForRefs = null;
      if (attrs.id) {
        elementIdForRefs = attrs.id;
      } else if (isWebComponent) {
        elementIdForRefs = tagName2;
      }
      const classObj = /* @__PURE__ */ Object.create(null);
      let elementId = null;
      if (!isWebComponent) {
        const classMatches = selector.match(/\.([^.#]+)/g);
        if (classMatches) {
          classMatches.forEach((classMatch) => {
            const className = classMatch.substring(1);
            classObj[className] = true;
          });
        }
        const idMatch = selector.match(/#([^.#\s]+)/);
        if (idMatch) {
          elementId = idMatch[1];
        }
      } else {
        elementId = tagName2;
      }
      let childrenOrText;
      if (typeof value === "string" || typeof value === "number") {
        childrenOrText = String(value);
      } else if (Array.isArray(value)) {
        childrenOrText = processItems(value, `${parentPath}.${keyString}`);
      } else {
        childrenOrText = [];
      }
      if (elementId && !isWebComponent) {
        attrs.id = elementId;
      }
      const eventHandlers = /* @__PURE__ */ Object.create(null);
      if (elementIdForRefs && refs) {
        const matchingRefKeys = [];
        Object.keys(refs).forEach((refKey) => {
          if (refKey.includes("*")) {
            const pattern = "^" + refKey.replace(/[.*+?^${}()|[\\\]\\]/g, "\\$&").replace(/\\\*/g, ".*") + "$";
            try {
              const regex = new RegExp(pattern);
              if (regex.test(elementIdForRefs)) {
                matchingRefKeys.push(refKey);
              }
            } catch (e) {
              console.warn(
                `[Parser] Invalid regex pattern created from refKey '${refKey}': ${pattern}`,
                e
              );
            }
          } else {
            if (elementIdForRefs === refKey) {
              matchingRefKeys.push(refKey);
            }
          }
        });
        if (matchingRefKeys.length > 0) {
          matchingRefKeys.sort((a, b) => {
            const aIsExact = !a.includes("*");
            const bIsExact = !b.includes("*");
            if (aIsExact && !bIsExact) return -1;
            if (!aIsExact && bIsExact) return 1;
            return b.length - a.length;
          });
          const bestMatchRefKey = matchingRefKeys[0];
          if (refs[bestMatchRefKey] && refs[bestMatchRefKey].eventListeners) {
            const eventListeners = refs[bestMatchRefKey].eventListeners;
            Object.entries(eventListeners).forEach(
              ([eventType, eventConfig]) => {
                if (eventConfig.handler && handlers[eventConfig.handler]) {
                  eventHandlers[eventType] = (event) => {
                    handlers[eventConfig.handler](event);
                  };
                } else if (eventConfig.handler) {
                  console.warn(
                    `[Parser] Handler '${eventConfig.handler}' for refKey '${bestMatchRefKey}' (matching elementId '${elementIdForRefs}') is referenced but not found in available handlers.`
                  );
                }
              }
            );
          }
        }
      }
      const snabbdomData = {};
      if (elementIdForRefs) {
        snabbdomData.key = elementIdForRefs;
      } else if (selector) {
        const itemPath = parentPath ? `${parentPath}.${index}` : String(index);
        snabbdomData.key = `${selector}-${itemPath}`;
        if (Object.keys(props).length > 0) {
          const propsHash = JSON.stringify(props).substring(0, 50);
          snabbdomData.key += `-${propsHash}`;
        }
      }
      if (Object.keys(attrs).length > 0) {
        snabbdomData.attrs = attrs;
      }
      if (Object.keys(classObj).length > 0) {
        snabbdomData.class = classObj;
      }
      if (Object.keys(eventHandlers).length > 0) {
        snabbdomData.on = eventHandlers;
      }
      if (Object.keys(props).length > 0) {
        snabbdomData.props = props;
        if (isWebComponent) {
          snabbdomData.hook = {
            update: (oldVnode, vnode2) => {
              const oldProps = oldVnode.data?.props || {};
              const newProps = vnode2.data?.props || {};
              const propsChanged = JSON.stringify(oldProps) !== JSON.stringify(newProps);
              if (propsChanged) {
                const element = vnode2.elm;
                if (element && element.render && typeof element.render === "function") {
                  element.setAttribute("isDirty", "true");
                  requestAnimationFrame(() => {
                    element.render();
                    element.removeAttribute("isDirty");
                  });
                }
              }
            }
          };
        }
      }
      try {
        if (isWebComponent) {
          return h2(tagName2, snabbdomData, childrenOrText);
        } else {
          return h2(tagName2, snabbdomData, childrenOrText);
        }
      } catch (error) {
        console.error("Error creating virtual node:", error, {
          tagName: tagName2,
          snabbdomData,
          childrenOrText
        });
        return h2("div", {}, ["Error creating element"]);
      }
    }).filter(Boolean);
  }
  return processItems(items);
};

// ../../packages/rettangoli-fe/src/createComponent.js
var yamlToCss = (elementName, styleObject) => {
  if (!styleObject || typeof styleObject !== "object") {
    return "";
  }
  let css = ``;
  const convertPropertiesToCss = (properties) => {
    return Object.entries(properties).map(([property, value]) => `  ${property}: ${value};`).join("\n");
  };
  const processSelector = (selector, rules) => {
    if (typeof rules !== "object" || rules === null) {
      return "";
    }
    if (selector.startsWith("@")) {
      const nestedCss = Object.entries(rules).map(([nestedSelector, nestedRules]) => {
        const nestedProperties = convertPropertiesToCss(nestedRules);
        return `  ${nestedSelector} {
${nestedProperties.split("\n").map((line) => line ? `  ${line}` : "").join("\n")}
  }`;
      }).join("\n");
      return `${selector} {
${nestedCss}
}`;
    } else {
      const properties = convertPropertiesToCss(rules);
      return `${selector} {
${properties}
}`;
    }
  };
  Object.entries(styleObject).forEach(([selector, rules]) => {
    const selectorCss = processSelector(selector, rules);
    if (selectorCss) {
      css += (css ? "\n\n" : "") + selectorCss;
    }
  });
  return css;
};
var subscribeAll = (observables) => {
  const subscriptions = observables.map((observable) => observable.subscribe());
  return () => {
    for (const subscription of subscriptions) {
      if (subscription && typeof subscription.unsubscribe === "function") {
        subscription.unsubscribe();
      }
    }
  };
};
function createAttrsProxy(source) {
  return new Proxy(
    {},
    {
      get(_, prop) {
        if (typeof prop === "string") {
          return source.getAttribute(prop);
        }
        return void 0;
      },
      set() {
        throw new Error("Cannot assign to read-only proxy");
      },
      defineProperty() {
        throw new Error("Cannot define properties on read-only proxy");
      },
      deleteProperty() {
        throw new Error("Cannot delete properties from read-only proxy");
      },
      has(_, prop) {
        return typeof prop === "string" && source.hasAttribute(prop);
      },
      ownKeys() {
        return source.getAttributeNames();
      },
      getOwnPropertyDescriptor(_, prop) {
        if (typeof prop === "string" && source.hasAttribute(prop)) {
          return {
            configurable: true,
            enumerable: true,
            get: () => source.getAttribute(prop)
          };
        }
        return void 0;
      }
    }
  );
}
function createPropsProxy(source, allowedKeys) {
  const allowed = new Set(allowedKeys);
  return new Proxy(
    {},
    {
      get(_, prop) {
        if (typeof prop === "string" && allowed.has(prop)) {
          return source[prop];
        }
        return void 0;
      },
      set() {
        throw new Error("Cannot assign to read-only proxy");
      },
      defineProperty() {
        throw new Error("Cannot define properties on read-only proxy");
      },
      deleteProperty() {
        throw new Error("Cannot delete properties from read-only proxy");
      },
      has(_, prop) {
        return typeof prop === "string" && allowed.has(prop);
      },
      ownKeys() {
        return [...allowed];
      },
      getOwnPropertyDescriptor(_, prop) {
        if (typeof prop === "string" && allowed.has(prop)) {
          return {
            configurable: true,
            enumerable: true,
            get: () => source[prop]
          };
        }
        return void 0;
      }
    }
  );
}
var BaseComponent = class extends HTMLElement {
  /**
   * @type {string}
   */
  elementName;
  /**
   * @type {Object}
   */
  styles;
  /**
   * @type {Function}
   */
  h;
  /**
   * @type {Object}
   */
  store;
  /**
   * @type {Object}
   */
  props;
  /**
   * @type {Object}
   */
  propsSchema;
  /**
   * @type {Object}
   */
  template;
  /**
   * @type {Object}
   */
  handlers;
  /**
   * @type {Object}
   */
  transformedHandlers = {};
  /**
   * @type {Object}
   */
  refs;
  refIds = {};
  patch;
  _unmountCallback;
  _oldVNode;
  deps;
  /**
   * @type {string}
   */
  cssText;
  get viewData() {
    const data = this.store.toViewData();
    return data;
  }
  connectedCallback() {
    this.shadow = this.attachShadow({ mode: "open" });
    const commonStyleSheet = new CSSStyleSheet();
    commonStyleSheet.replaceSync(`
      a, a:link, a:visited, a:hover, a:active {
        display: contents;
        color: inherit;
        text-decoration: none;
        background: none;
        border: none;
        padding: 0;
        margin: 0;
        font: inherit;
        cursor: pointer;
      }
    `);
    const adoptedStyleSheets = [commonStyleSheet];
    if (this.cssText) {
      const styleSheet = new CSSStyleSheet();
      styleSheet.replaceSync(this.cssText);
      adoptedStyleSheets.push(styleSheet);
    }
    this.shadow.adoptedStyleSheets = adoptedStyleSheets;
    this.renderTarget = document.createElement("div");
    this.renderTarget.style.cssText = "display: contents;";
    this.shadow.appendChild(this.renderTarget);
    this.transformedHandlers = {};
    if (!this.renderTarget.parentNode) {
      this.appendChild(this.renderTarget);
    }
    this.style.display = "contents";
    const deps2 = {
      ...this.deps,
      refIds: this.refIds,
      getRefIds: () => this.refIds,
      dispatchEvent: this.dispatchEvent.bind(this)
    };
    Object.keys(this.handlers || {}).forEach((key) => {
      this.transformedHandlers[key] = (payload) => {
        const result = this.handlers[key](payload, deps2);
        return result;
      };
    });
    if (this.handlers?.subscriptions) {
      this.unsubscribeAll = subscribeAll(this.handlers.subscriptions(deps2));
    }
    if (this.handlers?.handleOnMount) {
      this._unmountCallback = this.handlers?.handleOnMount(deps2);
    }
    this.render();
  }
  disconnectedCallback() {
    if (this._unmountCallback) {
      this._unmountCallback();
    }
    if (this.unsubscribeAll) {
      this.unsubscribeAll();
    }
  }
  render = () => {
    if (!this.patch) {
      console.error("Patch function is not defined!");
      return;
    }
    if (!this.template) {
      console.error("Template is not defined!");
      return;
    }
    try {
      const vDom = parseView({
        h: this.h,
        template: this.template,
        viewData: this.viewData,
        refs: this.refs,
        handlers: this.transformedHandlers
      });
      const ids = {};
      const findIds = (vDom2) => {
        if (vDom2.data?.attrs && vDom2.data.attrs.id) {
          ids[vDom2.data.attrs.id] = vDom2;
        }
        if (vDom2.children) {
          vDom2.children.forEach(findIds);
        }
      };
      findIds(vDom);
      this.refIds = ids;
      if (!this._oldVNode) {
        this._oldVNode = this.patch(this.renderTarget, vDom);
      } else {
        this._oldVNode = this.patch(this._oldVNode, vDom);
      }
    } catch (error) {
      console.error("Error during patching:", error);
    }
  };
};
var bindStore = (store, props, attrs) => {
  const { INITIAL_STATE: INITIAL_STATE2, toViewData: toViewData2, ...selectorsAndActions } = store;
  const selectors = {};
  const actions = {};
  let currentState = structuredClone(INITIAL_STATE2);
  Object.entries(selectorsAndActions).forEach(([key, fn]) => {
    if (key.startsWith("select")) {
      selectors[key] = (...args) => {
        return fn({ state: currentState, props, attrs }, ...args);
      };
    } else {
      actions[key] = (payload) => {
        currentState = produce(currentState, (draft) => {
          return fn(draft, payload);
        });
        return currentState;
      };
    }
  });
  return {
    toViewData: () => toViewData2({ state: currentState, props, attrs }),
    getState: () => currentState,
    ...actions,
    ...selectors
  };
};
var createComponent = ({ handlers, view, store, patch: patch2, h: h2 }, deps2) => {
  const { elementName, propsSchema, template, refs, styles } = view;
  if (!patch2) {
    throw new Error("Patch is not defined");
  }
  if (!h2) {
    throw new Error("h is not defined");
  }
  if (!view) {
    throw new Error("view is not defined");
  }
  class MyComponent extends BaseComponent {
    constructor() {
      super();
      const attrsProxy = createAttrsProxy(this);
      this.propsSchema = propsSchema;
      this.props = propsSchema ? createPropsProxy(this, Object.keys(propsSchema.properties)) : {};
      this.elementName = elementName;
      this.styles = styles;
      this.store = bindStore(store, this.props, attrsProxy);
      this.template = template;
      this.handlers = handlers;
      this.refs = refs;
      this.patch = patch2;
      this.deps = {
        ...deps2,
        store: this.store,
        render: this.render,
        handlers,
        attrs: attrsProxy,
        props: this.props
      };
      this.h = h2;
      this.cssText = yamlToCss(elementName, styles);
    }
  }
  return MyComponent;
};
var createComponent_default = createComponent;

// ../../node_modules/snabbdom/build/vnode.js
function vnode(sel, data, children, text, elm) {
  const key = data === void 0 ? void 0 : data.key;
  return { sel, data, children, text, elm, key };
}

// ../../node_modules/snabbdom/build/is.js
var array = Array.isArray;
function primitive(s) {
  return typeof s === "string" || typeof s === "number" || s instanceof String || s instanceof Number;
}

// ../../node_modules/snabbdom/build/htmldomapi.js
function createElement(tagName2, options) {
  return document.createElement(tagName2, options);
}
function createElementNS(namespaceURI, qualifiedName, options) {
  return document.createElementNS(namespaceURI, qualifiedName, options);
}
function createDocumentFragment() {
  return parseFragment(document.createDocumentFragment());
}
function createTextNode(text) {
  return document.createTextNode(text);
}
function createComment(text) {
  return document.createComment(text);
}
function insertBefore(parentNode2, newNode, referenceNode) {
  if (isDocumentFragment(parentNode2)) {
    let node = parentNode2;
    while (node && isDocumentFragment(node)) {
      const fragment = parseFragment(node);
      node = fragment.parent;
    }
    parentNode2 = node !== null && node !== void 0 ? node : parentNode2;
  }
  if (isDocumentFragment(newNode)) {
    newNode = parseFragment(newNode, parentNode2);
  }
  if (referenceNode && isDocumentFragment(referenceNode)) {
    referenceNode = parseFragment(referenceNode).firstChildNode;
  }
  parentNode2.insertBefore(newNode, referenceNode);
}
function removeChild(node, child) {
  node.removeChild(child);
}
function appendChild(node, child) {
  if (isDocumentFragment(child)) {
    child = parseFragment(child, node);
  }
  node.appendChild(child);
}
function parentNode(node) {
  if (isDocumentFragment(node)) {
    while (node && isDocumentFragment(node)) {
      const fragment = parseFragment(node);
      node = fragment.parent;
    }
    return node !== null && node !== void 0 ? node : null;
  }
  return node.parentNode;
}
function nextSibling(node) {
  var _a;
  if (isDocumentFragment(node)) {
    const fragment = parseFragment(node);
    const parent = parentNode(fragment);
    if (parent && fragment.lastChildNode) {
      const children = Array.from(parent.childNodes);
      const index = children.indexOf(fragment.lastChildNode);
      return (_a = children[index + 1]) !== null && _a !== void 0 ? _a : null;
    }
    return null;
  }
  return node.nextSibling;
}
function tagName(elm) {
  return elm.tagName;
}
function setTextContent(node, text) {
  node.textContent = text;
}
function getTextContent(node) {
  return node.textContent;
}
function isElement(node) {
  return node.nodeType === 1;
}
function isText(node) {
  return node.nodeType === 3;
}
function isComment(node) {
  return node.nodeType === 8;
}
function isDocumentFragment(node) {
  return node.nodeType === 11;
}
function parseFragment(fragmentNode, parentNode2) {
  var _a, _b, _c;
  const fragment = fragmentNode;
  (_a = fragment.parent) !== null && _a !== void 0 ? _a : fragment.parent = parentNode2 !== null && parentNode2 !== void 0 ? parentNode2 : null;
  (_b = fragment.firstChildNode) !== null && _b !== void 0 ? _b : fragment.firstChildNode = fragmentNode.firstChild;
  (_c = fragment.lastChildNode) !== null && _c !== void 0 ? _c : fragment.lastChildNode = fragmentNode.lastChild;
  return fragment;
}
var htmlDomApi = {
  createElement,
  createElementNS,
  createTextNode,
  createDocumentFragment,
  createComment,
  insertBefore,
  removeChild,
  appendChild,
  parentNode,
  nextSibling,
  tagName,
  setTextContent,
  getTextContent,
  isElement,
  isText,
  isComment,
  isDocumentFragment
};

// ../../node_modules/snabbdom/build/init.js
function isUndef(s) {
  return s === void 0;
}
function isDef(s) {
  return s !== void 0;
}
var emptyNode = vnode("", {}, [], void 0, void 0);
function sameVnode(vnode1, vnode2) {
  var _a, _b;
  const isSameKey = vnode1.key === vnode2.key;
  const isSameIs = ((_a = vnode1.data) === null || _a === void 0 ? void 0 : _a.is) === ((_b = vnode2.data) === null || _b === void 0 ? void 0 : _b.is);
  const isSameSel = vnode1.sel === vnode2.sel;
  const isSameTextOrFragment = !vnode1.sel && vnode1.sel === vnode2.sel ? typeof vnode1.text === typeof vnode2.text : true;
  return isSameSel && isSameKey && isSameIs && isSameTextOrFragment;
}
function documentFragmentIsNotSupported() {
  throw new Error("The document fragment is not supported on this platform.");
}
function isElement2(api, vnode2) {
  return api.isElement(vnode2);
}
function isDocumentFragment2(api, vnode2) {
  return api.isDocumentFragment(vnode2);
}
function createKeyToOldIdx(children, beginIdx, endIdx) {
  var _a;
  const map = {};
  for (let i = beginIdx; i <= endIdx; ++i) {
    const key = (_a = children[i]) === null || _a === void 0 ? void 0 : _a.key;
    if (key !== void 0) {
      map[key] = i;
    }
  }
  return map;
}
var hooks = [
  "create",
  "update",
  "remove",
  "destroy",
  "pre",
  "post"
];
function init(modules, domApi, options) {
  const cbs = {
    create: [],
    update: [],
    remove: [],
    destroy: [],
    pre: [],
    post: []
  };
  const api = domApi !== void 0 ? domApi : htmlDomApi;
  for (const hook of hooks) {
    for (const module of modules) {
      const currentHook = module[hook];
      if (currentHook !== void 0) {
        cbs[hook].push(currentHook);
      }
    }
  }
  function emptyNodeAt(elm) {
    const id = elm.id ? "#" + elm.id : "";
    const classes = elm.getAttribute("class");
    const c = classes ? "." + classes.split(" ").join(".") : "";
    return vnode(api.tagName(elm).toLowerCase() + id + c, {}, [], void 0, elm);
  }
  function emptyDocumentFragmentAt(frag) {
    return vnode(void 0, {}, [], void 0, frag);
  }
  function createRmCb(childElm, listeners) {
    return function rmCb() {
      if (--listeners === 0) {
        const parent = api.parentNode(childElm);
        if (parent !== null) {
          api.removeChild(parent, childElm);
        }
      }
    };
  }
  function createElm(vnode2, insertedVnodeQueue) {
    var _a, _b, _c, _d;
    let i;
    let data = vnode2.data;
    if (data !== void 0) {
      const init2 = (_a = data.hook) === null || _a === void 0 ? void 0 : _a.init;
      if (isDef(init2)) {
        init2(vnode2);
        data = vnode2.data;
      }
    }
    const children = vnode2.children;
    const sel = vnode2.sel;
    if (sel === "!") {
      if (isUndef(vnode2.text)) {
        vnode2.text = "";
      }
      vnode2.elm = api.createComment(vnode2.text);
    } else if (sel === "") {
      vnode2.elm = api.createTextNode(vnode2.text);
    } else if (sel !== void 0) {
      const hashIdx = sel.indexOf("#");
      const dotIdx = sel.indexOf(".", hashIdx);
      const hash = hashIdx > 0 ? hashIdx : sel.length;
      const dot = dotIdx > 0 ? dotIdx : sel.length;
      const tag = hashIdx !== -1 || dotIdx !== -1 ? sel.slice(0, Math.min(hash, dot)) : sel;
      const elm = vnode2.elm = isDef(data) && isDef(i = data.ns) ? api.createElementNS(i, tag, data) : api.createElement(tag, data);
      if (hash < dot)
        elm.setAttribute("id", sel.slice(hash + 1, dot));
      if (dotIdx > 0)
        elm.setAttribute("class", sel.slice(dot + 1).replace(/\./g, " "));
      for (i = 0; i < cbs.create.length; ++i)
        cbs.create[i](emptyNode, vnode2);
      if (primitive(vnode2.text) && (!array(children) || children.length === 0)) {
        api.appendChild(elm, api.createTextNode(vnode2.text));
      }
      if (array(children)) {
        for (i = 0; i < children.length; ++i) {
          const ch = children[i];
          if (ch != null) {
            api.appendChild(elm, createElm(ch, insertedVnodeQueue));
          }
        }
      }
      const hook = vnode2.data.hook;
      if (isDef(hook)) {
        (_b = hook.create) === null || _b === void 0 ? void 0 : _b.call(hook, emptyNode, vnode2);
        if (hook.insert) {
          insertedVnodeQueue.push(vnode2);
        }
      }
    } else if (((_c = options === null || options === void 0 ? void 0 : options.experimental) === null || _c === void 0 ? void 0 : _c.fragments) && vnode2.children) {
      vnode2.elm = ((_d = api.createDocumentFragment) !== null && _d !== void 0 ? _d : documentFragmentIsNotSupported)();
      for (i = 0; i < cbs.create.length; ++i)
        cbs.create[i](emptyNode, vnode2);
      for (i = 0; i < vnode2.children.length; ++i) {
        const ch = vnode2.children[i];
        if (ch != null) {
          api.appendChild(vnode2.elm, createElm(ch, insertedVnodeQueue));
        }
      }
    } else {
      vnode2.elm = api.createTextNode(vnode2.text);
    }
    return vnode2.elm;
  }
  function addVnodes(parentElm, before, vnodes, startIdx, endIdx, insertedVnodeQueue) {
    for (; startIdx <= endIdx; ++startIdx) {
      const ch = vnodes[startIdx];
      if (ch != null) {
        api.insertBefore(parentElm, createElm(ch, insertedVnodeQueue), before);
      }
    }
  }
  function invokeDestroyHook(vnode2) {
    var _a, _b;
    const data = vnode2.data;
    if (data !== void 0) {
      (_b = (_a = data === null || data === void 0 ? void 0 : data.hook) === null || _a === void 0 ? void 0 : _a.destroy) === null || _b === void 0 ? void 0 : _b.call(_a, vnode2);
      for (let i = 0; i < cbs.destroy.length; ++i)
        cbs.destroy[i](vnode2);
      if (vnode2.children !== void 0) {
        for (let j = 0; j < vnode2.children.length; ++j) {
          const child = vnode2.children[j];
          if (child != null && typeof child !== "string") {
            invokeDestroyHook(child);
          }
        }
      }
    }
  }
  function removeVnodes(parentElm, vnodes, startIdx, endIdx) {
    var _a, _b;
    for (; startIdx <= endIdx; ++startIdx) {
      let listeners;
      let rm;
      const ch = vnodes[startIdx];
      if (ch != null) {
        if (isDef(ch.sel)) {
          invokeDestroyHook(ch);
          listeners = cbs.remove.length + 1;
          rm = createRmCb(ch.elm, listeners);
          for (let i = 0; i < cbs.remove.length; ++i)
            cbs.remove[i](ch, rm);
          const removeHook = (_b = (_a = ch === null || ch === void 0 ? void 0 : ch.data) === null || _a === void 0 ? void 0 : _a.hook) === null || _b === void 0 ? void 0 : _b.remove;
          if (isDef(removeHook)) {
            removeHook(ch, rm);
          } else {
            rm();
          }
        } else if (ch.children) {
          invokeDestroyHook(ch);
          removeVnodes(parentElm, ch.children, 0, ch.children.length - 1);
        } else {
          api.removeChild(parentElm, ch.elm);
        }
      }
    }
  }
  function updateChildren(parentElm, oldCh, newCh, insertedVnodeQueue) {
    let oldStartIdx = 0;
    let newStartIdx = 0;
    let oldEndIdx = oldCh.length - 1;
    let oldStartVnode = oldCh[0];
    let oldEndVnode = oldCh[oldEndIdx];
    let newEndIdx = newCh.length - 1;
    let newStartVnode = newCh[0];
    let newEndVnode = newCh[newEndIdx];
    let oldKeyToIdx;
    let idxInOld;
    let elmToMove;
    let before;
    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
      if (oldStartVnode == null) {
        oldStartVnode = oldCh[++oldStartIdx];
      } else if (oldEndVnode == null) {
        oldEndVnode = oldCh[--oldEndIdx];
      } else if (newStartVnode == null) {
        newStartVnode = newCh[++newStartIdx];
      } else if (newEndVnode == null) {
        newEndVnode = newCh[--newEndIdx];
      } else if (sameVnode(oldStartVnode, newStartVnode)) {
        patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue);
        oldStartVnode = oldCh[++oldStartIdx];
        newStartVnode = newCh[++newStartIdx];
      } else if (sameVnode(oldEndVnode, newEndVnode)) {
        patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue);
        oldEndVnode = oldCh[--oldEndIdx];
        newEndVnode = newCh[--newEndIdx];
      } else if (sameVnode(oldStartVnode, newEndVnode)) {
        patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue);
        api.insertBefore(parentElm, oldStartVnode.elm, api.nextSibling(oldEndVnode.elm));
        oldStartVnode = oldCh[++oldStartIdx];
        newEndVnode = newCh[--newEndIdx];
      } else if (sameVnode(oldEndVnode, newStartVnode)) {
        patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue);
        api.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm);
        oldEndVnode = oldCh[--oldEndIdx];
        newStartVnode = newCh[++newStartIdx];
      } else {
        if (oldKeyToIdx === void 0) {
          oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx);
        }
        idxInOld = oldKeyToIdx[newStartVnode.key];
        if (isUndef(idxInOld)) {
          api.insertBefore(parentElm, createElm(newStartVnode, insertedVnodeQueue), oldStartVnode.elm);
          newStartVnode = newCh[++newStartIdx];
        } else if (isUndef(oldKeyToIdx[newEndVnode.key])) {
          api.insertBefore(parentElm, createElm(newEndVnode, insertedVnodeQueue), api.nextSibling(oldEndVnode.elm));
          newEndVnode = newCh[--newEndIdx];
        } else {
          elmToMove = oldCh[idxInOld];
          if (elmToMove.sel !== newStartVnode.sel) {
            api.insertBefore(parentElm, createElm(newStartVnode, insertedVnodeQueue), oldStartVnode.elm);
          } else {
            patchVnode(elmToMove, newStartVnode, insertedVnodeQueue);
            oldCh[idxInOld] = void 0;
            api.insertBefore(parentElm, elmToMove.elm, oldStartVnode.elm);
          }
          newStartVnode = newCh[++newStartIdx];
        }
      }
    }
    if (newStartIdx <= newEndIdx) {
      before = newCh[newEndIdx + 1] == null ? null : newCh[newEndIdx + 1].elm;
      addVnodes(parentElm, before, newCh, newStartIdx, newEndIdx, insertedVnodeQueue);
    }
    if (oldStartIdx <= oldEndIdx) {
      removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx);
    }
  }
  function patchVnode(oldVnode, vnode2, insertedVnodeQueue) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const hook = (_a = vnode2.data) === null || _a === void 0 ? void 0 : _a.hook;
    (_b = hook === null || hook === void 0 ? void 0 : hook.prepatch) === null || _b === void 0 ? void 0 : _b.call(hook, oldVnode, vnode2);
    const elm = vnode2.elm = oldVnode.elm;
    if (oldVnode === vnode2)
      return;
    if (vnode2.data !== void 0 || isDef(vnode2.text) && vnode2.text !== oldVnode.text) {
      (_c = vnode2.data) !== null && _c !== void 0 ? _c : vnode2.data = {};
      (_d = oldVnode.data) !== null && _d !== void 0 ? _d : oldVnode.data = {};
      for (let i = 0; i < cbs.update.length; ++i)
        cbs.update[i](oldVnode, vnode2);
      (_g = (_f = (_e = vnode2.data) === null || _e === void 0 ? void 0 : _e.hook) === null || _f === void 0 ? void 0 : _f.update) === null || _g === void 0 ? void 0 : _g.call(_f, oldVnode, vnode2);
    }
    const oldCh = oldVnode.children;
    const ch = vnode2.children;
    if (isUndef(vnode2.text)) {
      if (isDef(oldCh) && isDef(ch)) {
        if (oldCh !== ch)
          updateChildren(elm, oldCh, ch, insertedVnodeQueue);
      } else if (isDef(ch)) {
        if (isDef(oldVnode.text))
          api.setTextContent(elm, "");
        addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue);
      } else if (isDef(oldCh)) {
        removeVnodes(elm, oldCh, 0, oldCh.length - 1);
      } else if (isDef(oldVnode.text)) {
        api.setTextContent(elm, "");
      }
    } else if (oldVnode.text !== vnode2.text) {
      if (isDef(oldCh)) {
        removeVnodes(elm, oldCh, 0, oldCh.length - 1);
      }
      api.setTextContent(elm, vnode2.text);
    }
    (_h = hook === null || hook === void 0 ? void 0 : hook.postpatch) === null || _h === void 0 ? void 0 : _h.call(hook, oldVnode, vnode2);
  }
  return function patch2(oldVnode, vnode2) {
    let i, elm, parent;
    const insertedVnodeQueue = [];
    for (i = 0; i < cbs.pre.length; ++i)
      cbs.pre[i]();
    if (isElement2(api, oldVnode)) {
      oldVnode = emptyNodeAt(oldVnode);
    } else if (isDocumentFragment2(api, oldVnode)) {
      oldVnode = emptyDocumentFragmentAt(oldVnode);
    }
    if (sameVnode(oldVnode, vnode2)) {
      patchVnode(oldVnode, vnode2, insertedVnodeQueue);
    } else {
      elm = oldVnode.elm;
      parent = api.parentNode(elm);
      createElm(vnode2, insertedVnodeQueue);
      if (parent !== null) {
        api.insertBefore(parent, vnode2.elm, api.nextSibling(elm));
        removeVnodes(parent, [oldVnode], 0, 0);
      }
    }
    for (i = 0; i < insertedVnodeQueue.length; ++i) {
      insertedVnodeQueue[i].data.hook.insert(insertedVnodeQueue[i]);
    }
    for (i = 0; i < cbs.post.length; ++i)
      cbs.post[i]();
    return vnode2;
  };
}

// ../../node_modules/snabbdom/build/modules/class.js
function updateClass(oldVnode, vnode2) {
  let cur;
  let name;
  const elm = vnode2.elm;
  let oldClass = oldVnode.data.class;
  let klass = vnode2.data.class;
  if (!oldClass && !klass)
    return;
  if (oldClass === klass)
    return;
  oldClass = oldClass || {};
  klass = klass || {};
  for (name in oldClass) {
    if (oldClass[name] && !Object.prototype.hasOwnProperty.call(klass, name)) {
      elm.classList.remove(name);
    }
  }
  for (name in klass) {
    cur = klass[name];
    if (cur !== oldClass[name]) {
      elm.classList[cur ? "add" : "remove"](name);
    }
  }
}
var classModule = { create: updateClass, update: updateClass };

// ../../node_modules/snabbdom/build/modules/props.js
function updateProps(oldVnode, vnode2) {
  let key;
  let cur;
  let old;
  const elm = vnode2.elm;
  let oldProps = oldVnode.data.props;
  let props = vnode2.data.props;
  if (!oldProps && !props)
    return;
  if (oldProps === props)
    return;
  oldProps = oldProps || {};
  props = props || {};
  for (key in props) {
    cur = props[key];
    old = oldProps[key];
    if (old !== cur && (key !== "value" || elm[key] !== cur)) {
      elm[key] = cur;
    }
  }
}
var propsModule = { create: updateProps, update: updateProps };

// ../../node_modules/snabbdom/build/modules/attributes.js
var xlinkNS = "http://www.w3.org/1999/xlink";
var xmlnsNS = "http://www.w3.org/2000/xmlns/";
var xmlNS = "http://www.w3.org/XML/1998/namespace";
var colonChar = 58;
var xChar = 120;
var mChar = 109;
function updateAttrs(oldVnode, vnode2) {
  let key;
  const elm = vnode2.elm;
  let oldAttrs = oldVnode.data.attrs;
  let attrs = vnode2.data.attrs;
  if (!oldAttrs && !attrs)
    return;
  if (oldAttrs === attrs)
    return;
  oldAttrs = oldAttrs || {};
  attrs = attrs || {};
  for (key in attrs) {
    const cur = attrs[key];
    const old = oldAttrs[key];
    if (old !== cur) {
      if (cur === true) {
        elm.setAttribute(key, "");
      } else if (cur === false) {
        elm.removeAttribute(key);
      } else {
        if (key.charCodeAt(0) !== xChar) {
          elm.setAttribute(key, cur);
        } else if (key.charCodeAt(3) === colonChar) {
          elm.setAttributeNS(xmlNS, key, cur);
        } else if (key.charCodeAt(5) === colonChar) {
          key.charCodeAt(1) === mChar ? elm.setAttributeNS(xmlnsNS, key, cur) : elm.setAttributeNS(xlinkNS, key, cur);
        } else {
          elm.setAttribute(key, cur);
        }
      }
    }
  }
  for (key in oldAttrs) {
    if (!(key in attrs)) {
      elm.removeAttribute(key);
    }
  }
}
var attributesModule = {
  create: updateAttrs,
  update: updateAttrs
};

// ../../node_modules/snabbdom/build/modules/style.js
var raf = typeof (window === null || window === void 0 ? void 0 : window.requestAnimationFrame) === "function" ? window.requestAnimationFrame.bind(window) : setTimeout;
var nextFrame = function(fn) {
  raf(function() {
    raf(fn);
  });
};
var reflowForced = false;
function setNextFrame(obj, prop, val) {
  nextFrame(function() {
    obj[prop] = val;
  });
}
function updateStyle(oldVnode, vnode2) {
  let cur;
  let name;
  const elm = vnode2.elm;
  let oldStyle = oldVnode.data.style;
  let style = vnode2.data.style;
  if (!oldStyle && !style)
    return;
  if (oldStyle === style)
    return;
  oldStyle = oldStyle || {};
  style = style || {};
  const oldHasDel = "delayed" in oldStyle;
  for (name in oldStyle) {
    if (!(name in style)) {
      if (name[0] === "-" && name[1] === "-") {
        elm.style.removeProperty(name);
      } else {
        elm.style[name] = "";
      }
    }
  }
  for (name in style) {
    cur = style[name];
    if (name === "delayed" && style.delayed) {
      for (const name2 in style.delayed) {
        cur = style.delayed[name2];
        if (!oldHasDel || cur !== oldStyle.delayed[name2]) {
          setNextFrame(elm.style, name2, cur);
        }
      }
    } else if (name !== "remove" && cur !== oldStyle[name]) {
      if (name[0] === "-" && name[1] === "-") {
        elm.style.setProperty(name, cur);
      } else {
        elm.style[name] = cur;
      }
    }
  }
}
function applyDestroyStyle(vnode2) {
  let style;
  let name;
  const elm = vnode2.elm;
  const s = vnode2.data.style;
  if (!s || !(style = s.destroy))
    return;
  for (name in style) {
    elm.style[name] = style[name];
  }
}
function applyRemoveStyle(vnode2, rm) {
  const s = vnode2.data.style;
  if (!s || !s.remove) {
    rm();
    return;
  }
  if (!reflowForced) {
    vnode2.elm.offsetLeft;
    reflowForced = true;
  }
  let name;
  const elm = vnode2.elm;
  let i = 0;
  const style = s.remove;
  let amount = 0;
  const applied = [];
  for (name in style) {
    applied.push(name);
    elm.style[name] = style[name];
  }
  const compStyle = getComputedStyle(elm);
  const props = compStyle["transition-property"].split(", ");
  for (; i < props.length; ++i) {
    if (applied.indexOf(props[i]) !== -1)
      amount++;
  }
  elm.addEventListener("transitionend", function(ev) {
    if (ev.target === elm)
      --amount;
    if (amount === 0)
      rm();
  });
}
function forceReflow() {
  reflowForced = false;
}
var styleModule = {
  pre: forceReflow,
  create: updateStyle,
  update: updateStyle,
  destroy: applyDestroyStyle,
  remove: applyRemoveStyle
};

// ../../node_modules/snabbdom/build/modules/eventlisteners.js
function invokeHandler(handler, vnode2, event) {
  if (typeof handler === "function") {
    handler.call(vnode2, event, vnode2);
  } else if (typeof handler === "object") {
    for (let i = 0; i < handler.length; i++) {
      invokeHandler(handler[i], vnode2, event);
    }
  }
}
function handleEvent(event, vnode2) {
  const name = event.type;
  const on = vnode2.data.on;
  if (on && on[name]) {
    invokeHandler(on[name], vnode2, event);
  }
}
function createListener() {
  return function handler(event) {
    handleEvent(event, handler.vnode);
  };
}
function updateEventListeners(oldVnode, vnode2) {
  const oldOn = oldVnode.data.on;
  const oldListener = oldVnode.listener;
  const oldElm = oldVnode.elm;
  const on = vnode2 && vnode2.data.on;
  const elm = vnode2 && vnode2.elm;
  let name;
  if (oldOn === on) {
    return;
  }
  if (oldOn && oldListener) {
    if (!on) {
      for (name in oldOn) {
        oldElm.removeEventListener(name, oldListener, false);
      }
    } else {
      for (name in oldOn) {
        if (!on[name]) {
          oldElm.removeEventListener(name, oldListener, false);
        }
      }
    }
  }
  if (on) {
    const listener = vnode2.listener = oldVnode.listener || createListener();
    listener.vnode = vnode2;
    if (!oldOn) {
      for (name in on) {
        elm.addEventListener(name, listener, false);
      }
    } else {
      for (name in on) {
        if (!oldOn[name]) {
          elm.addEventListener(name, listener, false);
        }
      }
    }
  }
}
var eventListenersModule = {
  create: updateEventListeners,
  update: updateEventListeners,
  destroy: updateEventListeners
};

// ../../packages/rettangoli-fe/src/createWebPatch.js
var createWebPatch = () => {
  return init([
    classModule,
    propsModule,
    attributesModule,
    styleModule,
    eventListenersModule
  ]);
};
var createWebPatch_default = createWebPatch;

// ../../node_modules/snabbdom/build/h.js
function addNS(data, children, sel) {
  data.ns = "http://www.w3.org/2000/svg";
  if (sel !== "foreignObject" && children !== void 0) {
    for (let i = 0; i < children.length; ++i) {
      const child = children[i];
      if (typeof child === "string")
        continue;
      const childData = child.data;
      if (childData !== void 0) {
        addNS(childData, child.children, child.sel);
      }
    }
  }
}
function h(sel, b, c) {
  let data = {};
  let children;
  let text;
  let i;
  if (c !== void 0) {
    if (b !== null) {
      data = b;
    }
    if (array(c)) {
      children = c;
    } else if (primitive(c)) {
      text = c.toString();
    } else if (c && c.sel) {
      children = [c];
    }
  } else if (b !== void 0 && b !== null) {
    if (array(b)) {
      children = b;
    } else if (primitive(b)) {
      text = b.toString();
    } else if (b && b.sel) {
      children = [b];
    } else {
      data = b;
    }
  }
  if (children !== void 0) {
    for (i = 0; i < children.length; ++i) {
      if (primitive(children[i]))
        children[i] = vnode(void 0, void 0, void 0, children[i], void 0);
    }
  }
  if (sel.startsWith("svg") && (sel.length === 3 || sel[3] === "." || sel[3] === "#")) {
    addNS(data, children, sel);
  }
  return vnode(sel, data, children, text, void 0);
}

// fe/setup.js
var componentDependencies = {};
var pageDependencies = {};
var deps = {
  components: componentDependencies,
  pages: pageDependencies
};
var patch = createWebPatch_default();

// .temp/dynamicImport.js
var imports = {
  "fe": {
    "todos": {
      "handlers": todos_handlers_exports,
      "store": todos_store_exports,
      "view": todos_view_default
    }
  }
};
Object.keys(imports).forEach((category) => {
  Object.keys(imports[category]).forEach((component) => {
    const webComponent = createComponent_default({ ...imports[category][component], patch, h }, deps[category]);
    customElements.define(imports[category][component].view.elementName, webComponent);
  });
});
//# sourceMappingURL=main.js.map
