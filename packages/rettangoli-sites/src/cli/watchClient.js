function runWatchClient({
  reloadMode,
  initialRevision,
  initialSessionId,
  transport = 'websocket',
}) {
  const WATCH_CLIENT_SELECTOR = 'script[data-rtgl-watch-client]';
  const WATCH_ERROR_ID = 'rettangoli-watch-error';
  const KEY_ATTRIBUTES = ['data-rtgl-key', 'data-key', 'id'];
  const ASSET_CACHE_KEY = '__rtgl_watch_asset';
  const HTML_CACHE_KEY = '__rtgl_watch';
  const PENDING_LINK_REFRESH_ATTRIBUTE = 'data-rtgl-watch-asset-pending';

  const requestFullReload = (reason) => {
    const event = new CustomEvent('rettangoli:watch-full-reload', {
      cancelable: true,
      detail: { reason },
    });
    if (window.dispatchEvent(event)) window.location.reload();
  };

  const isElement = (node) => node?.nodeType === 1;
  const isWatchClientNode = (node) =>
    isElement(node) && node.matches(WATCH_CLIENT_SELECTOR);
  const isInPreservedSubtree = (node) =>
    isElement(node) && node.closest('[data-rtgl-preserve]') !== null;

  const getNodeKey = (node) => {
    if (!isElement(node)) return null;
    for (const attributeName of KEY_ATTRIBUTES) {
      const value = node.getAttribute(attributeName);
      if (value) return `${attributeName}:${value}`;
    }
    return null;
  };

  const isSameNodeKind = (currentNode, nextNode) => {
    if (!currentNode || !nextNode || currentNode.nodeType !== nextNode.nodeType) {
      return false;
    }
    if (!isElement(currentNode)) return true;
    return currentNode.localName === nextNode.localName &&
      currentNode.namespaceURI === nextNode.namespaceURI;
  };

  const collectKeyedElements = (root) => {
    const keyed = new Map();
    const duplicates = new Set();
    for (const element of root.querySelectorAll('[data-rtgl-key], [data-key], [id]')) {
      if (isWatchClientNode(element)) continue;
      const preservedRoot = element.closest('[data-rtgl-preserve]');
      if (preservedRoot && preservedRoot !== element) continue;
      const key = getNodeKey(element);
      if (!key || duplicates.has(key)) continue;
      if (keyed.has(key)) {
        keyed.delete(key);
        duplicates.add(key);
      } else {
        keyed.set(key, element);
      }
    }
    return keyed;
  };

  const collectKeys = (root) => {
    const keys = new Set();
    for (const element of root.querySelectorAll('[data-rtgl-key], [data-key], [id]')) {
      if (!isWatchClientNode(element)) {
        const preservedRoot = element.closest('[data-rtgl-preserve]');
        if (preservedRoot && preservedRoot !== element) continue;
        const key = getNodeKey(element);
        if (key) keys.add(key);
      }
    }
    return keys;
  };

  const syncAttributes = (currentElement, nextElement) => {
    for (const attribute of Array.from(currentElement.attributes)) {
      if (!nextElement.hasAttributeNS(attribute.namespaceURI, attribute.localName)) {
        currentElement.removeAttributeNS(attribute.namespaceURI, attribute.localName);
      }
    }
    for (const attribute of Array.from(nextElement.attributes)) {
      if (currentElement.getAttributeNS(attribute.namespaceURI, attribute.localName) !== attribute.value) {
        currentElement.setAttributeNS(attribute.namespaceURI, attribute.name, attribute.value);
      }
    }
  };

  const getNextMorphableSibling = (node) => {
    let candidate = node;
    while (candidate && isWatchClientNode(candidate)) {
      candidate = candidate.nextSibling;
    }
    return candidate;
  };

  const captureUserState = (root) => {
    const controls = [];
    const selector = 'input, textarea, select, details, dialog, [popover]';
    const elements = [
      ...(root.matches?.(selector) ? [root] : []),
      ...root.querySelectorAll(selector),
    ];

    for (const element of elements) {
      const state = { element, localName: element.localName };
      if (element.localName === 'input') {
        state.type = element.type;
        if (element.type !== 'file') state.value = element.value;
        state.checked = element.checked;
      } else if (element.localName === 'textarea') {
        state.value = element.value;
      } else if (element.localName === 'select') {
        const occurrences = new Map();
        state.selectedOptions = [];
        Array.from(element.options).forEach((option, index) => {
          const occurrence = occurrences.get(option.value) || 0;
          occurrences.set(option.value, occurrence + 1);
          if (option.selected) {
            state.selectedOptions.push({
              index,
              occurrence,
              value: option.value,
            });
          }
        });
      } else if (element.localName === 'details') {
        state.open = element.open;
      } else if (element.localName === 'dialog') {
        state.open = element.open;
        try {
          state.modal = element.matches(':modal');
        } catch {
          state.modal = false;
        }
      }
      if (element.hasAttribute('popover')) {
        try {
          state.popoverOpen = element.matches(':popover-open');
        } catch {
          state.popoverOpen = false;
        }
      }
      controls.push(state);
    }

    const scrollPositions = [];
    for (const element of [root, ...root.querySelectorAll('*')]) {
      if (element.scrollTop !== 0 || element.scrollLeft !== 0) {
        scrollPositions.push({
          element,
          top: element.scrollTop,
          left: element.scrollLeft,
        });
      }
    }

    let activeElement = document.activeElement;
    while (activeElement?.shadowRoot?.activeElement) {
      activeElement = activeElement.shadowRoot.activeElement;
    }

    let selectionStart = null;
    let selectionEnd = null;
    let selectionDirection = null;
    try {
      selectionStart = activeElement?.selectionStart ?? null;
      selectionEnd = activeElement?.selectionEnd ?? null;
      selectionDirection = activeElement?.selectionDirection ?? null;
    } catch {
      // Some input types do not expose text selection.
    }

    let documentRange = null;
    const selection = document.getSelection?.();
    if (selection?.rangeCount) {
      try {
        documentRange = selection.getRangeAt(0).cloneRange();
      } catch {
        documentRange = null;
      }
    }

    return {
      activeElement,
      controls,
      documentRange,
      scrollPositions,
      selectionDirection,
      selectionEnd,
      selectionStart,
      windowScrollX: window.scrollX,
      windowScrollY: window.scrollY,
    };
  };

  const restoreUserState = (state) => {
    for (const control of state.controls) {
      const { element } = control;
      if (!element.isConnected) continue;
      if (control.localName === 'input') {
        try {
          if (control.type !== 'file' && element.type !== 'file') {
            element.value = control.value;
          }
          element.checked = control.checked;
        } catch {
          // Incompatible input type changes cannot retain the old live value.
        }
      } else if (control.localName === 'textarea') {
        try {
          element.value = control.value;
        } catch {
          // Continue restoring the rest of the page state.
        }
      } else if (control.localName === 'select') {
        const options = Array.from(element.options);
        const optionsByValue = new Map();
        for (const option of options) {
          const matchingOptions = optionsByValue.get(option.value) || [];
          matchingOptions.push(option);
          optionsByValue.set(option.value, matchingOptions);
          option.selected = false;
        }

        const restoredOptions = new Set();
        for (const selectedOption of control.selectedOptions) {
          const matchingOptions = optionsByValue.get(selectedOption.value) || [];
          let option = matchingOptions[selectedOption.occurrence];
          if (option && restoredOptions.has(option)) option = null;
          if (!option) {
            option = matchingOptions.find((candidate) => !restoredOptions.has(candidate));
          }
          if (!option) {
            const indexedOption = options[selectedOption.index];
            if (indexedOption && !restoredOptions.has(indexedOption)) {
              option = indexedOption;
            }
          }
          if (option) {
            option.selected = true;
            restoredOptions.add(option);
          }
        }
        if (control.selectedOptions.length === 0) element.selectedIndex = -1;
      } else if (control.localName === 'details') {
        element.open = control.open;
      } else if (control.localName === 'dialog') {
        if (control.modal && typeof element.showModal === 'function') {
          try {
            if (element.open) element.close();
            element.showModal();
          } catch {
            element.open = control.open;
          }
        } else {
          element.open = control.open;
        }
      }
      if (control.popoverOpen && typeof element.showPopover === 'function') {
        try {
          element.showPopover();
        } catch {
          // The popover may no longer be valid after the source update.
        }
      }
    }

    let restoredControlSelection = false;
    if (state.activeElement?.isConnected) {
      try {
        state.activeElement.focus({ preventScroll: true });
      } catch {
        state.activeElement.focus?.();
      }
      if (state.selectionStart !== null && typeof state.activeElement.setSelectionRange === 'function') {
        try {
          state.activeElement.setSelectionRange(
            state.selectionStart,
            state.selectionEnd,
            state.selectionDirection,
          );
          restoredControlSelection = true;
        } catch {
          // Ignore controls that stopped supporting text selection.
        }
      }
    }

    if (
      !restoredControlSelection &&
      state.documentRange?.startContainer?.isConnected &&
      state.documentRange?.endContainer?.isConnected
    ) {
      const selection = document.getSelection?.();
      try {
        selection?.removeAllRanges();
        selection?.addRange(state.documentRange);
      } catch {
        // The edited subtree may have invalidated the old range.
      }
    }

    for (const position of state.scrollPositions) {
      if (position.element.isConnected) {
        position.element.scrollTop = position.top;
        position.element.scrollLeft = position.left;
      }
    }
    window.scrollTo(state.windowScrollX, state.windowScrollY);
  };

  const morphBody = (nextBody) => {
    const currentBody = document.body;
    const currentKeyed = collectKeyedElements(currentBody);
    const nextKeys = collectKeys(nextBody);
    const usedNodes = new WeakSet();
    const preservedRoots = [];

    const morphNode = (currentNode, nextNode) => {
      if (currentNode.nodeType === 3 || currentNode.nodeType === 8) {
        if (currentNode.nodeValue !== nextNode.nodeValue) {
          currentNode.nodeValue = nextNode.nodeValue;
        }
        return;
      }
      if (!isElement(currentNode)) return;

      if (nextNode.hasAttribute('data-rtgl-preserve')) {
        if (!currentNode.hasAttribute('data-rtgl-preserve')) {
          currentNode.setAttribute('data-rtgl-preserve', '');
        }
        preservedRoots.push(currentNode);
        return;
      }
      syncAttributes(currentNode, nextNode);
      if (
        currentNode.localName === 'template' &&
        currentNode.content &&
        nextNode.content
      ) {
        morphChildren(currentNode.content, nextNode.content);
      } else {
        morphChildren(currentNode, nextNode);
      }
    };

    const morphChildren = (currentParent, nextParent) => {
      let cursor = getNextMorphableSibling(currentParent.firstChild);
      const nextChildren = Array.from(nextParent.childNodes).filter(
        (node) => !isWatchClientNode(node),
      );

      for (const nextChild of nextChildren) {
        const nextKey = getNodeKey(nextChild);
        let target = null;

        if (nextKey) {
          const keyedTarget = currentKeyed.get(nextKey);
          if (
            keyedTarget &&
            !usedNodes.has(keyedTarget) &&
            isSameNodeKind(keyedTarget, nextChild) &&
            !keyedTarget.contains(currentParent)
          ) {
            target = keyedTarget;
          }
        } else if (
          cursor &&
          !getNodeKey(cursor) &&
          !usedNodes.has(cursor) &&
          isSameNodeKind(cursor, nextChild)
        ) {
          target = cursor;
        }

        if (!target && !nextKey) {
          let candidate = cursor?.nextSibling || null;
          while (candidate) {
            if (
              !isWatchClientNode(candidate) &&
              !getNodeKey(candidate) &&
              !usedNodes.has(candidate) &&
              isSameNodeKind(candidate, nextChild)
            ) {
              target = candidate;
              break;
            }
            candidate = candidate.nextSibling;
          }
        }

        if (!target) {
          target = nextChild.cloneNode(
            isElement(nextChild) && nextChild.hasAttribute('data-rtgl-preserve'),
          );
        }

        if (target.parentNode !== currentParent || target !== cursor) {
          currentParent.insertBefore(target, cursor);
        }
        usedNodes.add(target);
        morphNode(target, nextChild);
        cursor = getNextMorphableSibling(target.nextSibling);
      }

      let leftover = cursor;
      while (leftover) {
        const nextLeftover = leftover.nextSibling;
        if (!isWatchClientNode(leftover)) {
          const key = getNodeKey(leftover);
          if (!key || !nextKeys.has(key)) leftover.remove();
        }
        leftover = nextLeftover;
      }
    };

    const userState = captureUserState(currentBody);
    try {
      syncAttributes(document.documentElement, nextBody.ownerDocument.documentElement);
      syncAttributes(currentBody, nextBody);
      morphChildren(currentBody, nextBody);
      for (const element of currentKeyed.values()) {
        const isPreserved = preservedRoots.some((root) =>
          root === element || root.contains(element),
        );
        if (!usedNodes.has(element) && !isPreserved && element.isConnected) {
          element.remove();
        }
      }
    } finally {
      restoreUserState(userState);
    }
  };

  let htmlUpdateSequence = 0;
  let htmlUpdateController = null;
  let needsHtmlSync = false;

  const applyHtmlUpdate = async ({
    assetPaths = [],
    refreshAllAssets = false,
  } = {}) => {
    const sequence = ++htmlUpdateSequence;
    needsHtmlSync = true;
    htmlUpdateController?.abort();
    htmlUpdateController = new AbortController();

    const url = new URL(window.location.href);
    url.hash = '';
    url.searchParams.set(HTML_CACHE_KEY, String(Date.now()));

    try {
      const response = await fetch(url, {
        cache: 'no-store',
        signal: htmlUpdateController.signal,
      });
      if (!response.ok) {
        if (response.status === 404 || response.status === 410) {
          requestFullReload('route-unavailable');
          return false;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      const html = await response.text();
      if (sequence !== htmlUpdateSequence) return false;

      const nextDocument = new DOMParser().parseFromString(html, 'text/html');
      nextDocument.querySelectorAll(WATCH_CLIENT_SELECTOR).forEach((node) => node.remove());

      if (initialDocumentTypeSignature !== documentTypeSignature(nextDocument)) {
        requestFullReload('doctype-change');
        return false;
      }
      if (initialScriptSignature !== scriptSignature(nextDocument)) {
        requestFullReload('script-change');
        return false;
      }

      const interruptedRefreshes = syncHead(nextDocument);
      morphBody(nextDocument.body);
      const interruptedAssetPaths = interruptedRefreshes
        .filter(({ link, path }) =>
          link.isConnected && normalizeAssetPath(link.href) === path,
        )
        .map(({ path }) => path);
      const pathsToRefresh = [
        ...new Set([
          ...assetPaths,
          ...interruptedAssetPaths,
        ]),
      ];
      if (pathsToRefresh.length > 0 || refreshAllAssets) {
        refreshAssets(pathsToRefresh, { refreshAll: refreshAllAssets });
      }
      window.dispatchEvent(new CustomEvent('rettangoli:watch-html-update'));
      needsHtmlSync = false;
      return true;
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.error('[Rettangoli Watch] HTML update failed; keeping the current page state.', error);
      }
      return false;
    }
  };

  const cancelHtmlUpdate = () => {
    htmlUpdateSequence += 1;
    htmlUpdateController?.abort();
    htmlUpdateController = null;
  };

  const normalizeAssetPath = (value) => {
    try {
      const url = new URL(value, window.location.href);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
      url.searchParams.delete(ASSET_CACHE_KEY);
      return `${url.origin}${url.pathname}`;
    } catch {
      return null;
    }
  };

  const isSameOriginAsset = (value) => {
    try {
      if (typeof value !== 'string' || value.trim().startsWith('#')) {
        return false;
      }
      const url = new URL(value, window.location.href);
      return (
        (url.protocol === 'http:' || url.protocol === 'https:') &&
        url.origin === window.location.origin
      );
    } catch {
      return false;
    }
  };

  const isExecutableScript = (script) => {
    const type = (script.getAttribute('type') || '').trim().toLowerCase();
    return type === '' ||
      type === 'module' ||
      type === 'importmap' ||
      type === 'speculationrules' ||
      type === 'text/javascript' ||
      type === 'application/javascript' ||
      type.endsWith('/ecmascript') ||
      type.endsWith('/javascript');
  };

  const collectScripts = (root, parentPath = []) => {
    const scripts = [];
    const childElements = Array.from(root.children || [])
      .filter((element) => !isWatchClientNode(element));
    const unkeyedSiblingOrdinals = new Map();
    let executableScriptOrdinal = 0;

    const childDescriptors = childElements.map((element) => {
      const namespace = element.namespaceURI || '';
      const siblingKind = `${namespace}:${element.localName}`;
      const key = getNodeKey(element);
      const unkeyedOrdinal = unkeyedSiblingOrdinals.get(siblingKind) || 0;
      if (!key) {
        unkeyedSiblingOrdinals.set(siblingKind, unkeyedOrdinal + 1);
      }
      return [
        namespace,
        element.localName,
        key,
        key ? null : unkeyedOrdinal,
      ];
    });

    childElements.forEach((element, index) => {
      const path = [...parentPath, childDescriptors[index]];

      if (element.localName === 'script' && isExecutableScript(element)) {
        scripts.push({
          path: [
            ...parentPath,
            [
              '#executable-script',
              executableScriptOrdinal,
              '#previous-element',
              childDescriptors[index - 1] || null,
              '#next-element',
              childDescriptors[index + 1] || null,
            ],
          ],
          script: element,
        });
        executableScriptOrdinal += 1;
      }
      if (element.localName === 'template') {
        scripts.push(...collectScripts(element.content, [...path, '#content']));
      } else if (element.localName !== 'script') {
        scripts.push(...collectScripts(element, path));
      }
    });

    return scripts;
  };

  const getDocumentBaseUrl = (sourceDocument) => {
    const baseHref = sourceDocument?.querySelector('base[href]')?.getAttribute('href');
    try {
      return new URL(baseHref || window.location.href, window.location.href).href;
    } catch {
      return window.location.href;
    }
  };

  const getScriptAttributes = (script) => Array.from(script.attributes, (attribute) => [
    attribute.namespaceURI || '',
    attribute.name,
    attribute.localName === 'nonce' && script.nonce
      ? script.nonce
      : attribute.value,
  ]).sort((left, right) => {
    for (let index = 0; index < left.length; index += 1) {
      const comparison = left[index].localeCompare(right[index]);
      if (comparison !== 0) return comparison;
    }
    return 0;
  });

  const getEffectiveScriptSrc = (script) => {
    const rawSrc = script.getAttribute('src');
    if (rawSrc === null) return null;
    try {
      return new URL(rawSrc, getDocumentBaseUrl(script.ownerDocument)).href;
    } catch {
      return rawSrc;
    }
  };

  const documentTypeSignature = (sourceDocument) => {
    const documentType = sourceDocument.doctype;
    if (!documentType) return null;
    return JSON.stringify({
      name: documentType.name,
      publicId: documentType.publicId,
      systemId: documentType.systemId,
    });
  };

  const scriptSignature = (root) => {
    const scripts = collectScripts(root);
    if (scripts.length === 0) return '';
    const sourceDocument = root.nodeType === 9 ? root : root.ownerDocument;
    return JSON.stringify({
      baseUrl: getDocumentBaseUrl(sourceDocument),
      scripts: scripts.map(({ path, script }) => ({
        attributes: getScriptAttributes(script),
        effectiveSrc: getEffectiveScriptSrc(script),
        path,
        text: script.textContent,
      })),
    });
  };

  const initialScriptSignature = scriptSignature(document);
  const initialDocumentTypeSignature = documentTypeSignature(document);
  let managedHeadElements = new Set(
    Array.from(document.head.children).filter((element) =>
      element.localName !== 'title' &&
      !isInPreservedSubtree(element) &&
      !(element.localName === 'script' && isExecutableScript(element)),
    ),
  );
  const pendingLinkRefreshes = new Map();
  let assetRefreshSequence = 0;

  const cancelPendingLinkRefreshes = () => {
    const interruptedRefreshes = [];
    for (const [link, { replacement }] of pendingLinkRefreshes) {
      const path = normalizeAssetPath(link.href);
      if (path) interruptedRefreshes.push({ link, path });
      replacement.remove();
    }
    pendingLinkRefreshes.clear();
    return interruptedRefreshes;
  };

  const getHeadKey = (element) => {
    const explicitKey = getNodeKey(element);
    if (explicitKey) return explicitKey;
    if (element.localName === 'meta') {
      for (const name of ['charset', 'name', 'property', 'http-equiv', 'itemprop']) {
        if (element.hasAttribute(name)) return `meta:${name}:${element.getAttribute(name)}`;
      }
    }
    if (element.localName === 'link') {
      return `link:${element.getAttribute('rel') || ''}:${normalizeAssetPath(element.getAttribute('href') || '')}`;
    }
    if (element.localName === 'base') return 'base';
    return null;
  };

  const syncHead = (nextDocument) => {
    const interruptedRefreshes = cancelPendingLinkRefreshes();
    const nextHeadElements = Array.from(nextDocument.head.children).filter((element) =>
      element.localName !== 'title' &&
      !isInPreservedSubtree(element) &&
      !(element.localName === 'script' && isExecutableScript(element)),
    );
    const keyedCurrent = new Map();
    for (const element of managedHeadElements) {
      const key = getHeadKey(element);
      if (key && !keyedCurrent.has(key)) keyedCurrent.set(key, element);
    }

    const unusedCurrent = new Set(managedHeadElements);
    const nextManaged = new Set();
    let previousManaged = null;

    for (const nextElement of nextHeadElements) {
      const key = getHeadKey(nextElement);
      let currentElement = key ? keyedCurrent.get(key) : null;
      if (!currentElement || !unusedCurrent.has(currentElement) || !isSameNodeKind(currentElement, nextElement)) {
        currentElement = Array.from(unusedCurrent).find((candidate) =>
          !getHeadKey(candidate) && isSameNodeKind(candidate, nextElement),
        ) || null;
      }
      if (!currentElement) currentElement = nextElement.cloneNode(false);

      if (!currentElement.isConnected) {
        document.head.append(currentElement);
      } else if (previousManaged && previousManaged.nextSibling !== currentElement) {
        previousManaged.after(currentElement);
      }

      syncAttributes(currentElement, nextElement);
      if (currentElement.textContent !== nextElement.textContent) {
        currentElement.textContent = nextElement.textContent;
      }
      unusedCurrent.delete(currentElement);
      nextManaged.add(currentElement);
      previousManaged = currentElement;
    }

    for (const element of unusedCurrent) element.remove();
    managedHeadElements = nextManaged;
    if (nextDocument.title !== document.title) document.title = nextDocument.title;
    return interruptedRefreshes;
  };

  const refreshAssets = (rawPaths, { refreshAll = false } = {}) => {
    const paths = new Set(
      (rawPaths || []).map(normalizeAssetPath).filter(Boolean),
    );
    const hasStylesheetChange = [...paths].some((assetPath) =>
      /\.css$/i.test(new URL(assetPath).pathname),
    );
    const shouldRefresh = (value) => {
      if (!isSameOriginAsset(value)) return false;
      return refreshAll || paths.has(normalizeAssetPath(value));
    };
    const cacheBust = (value) => {
      const url = new URL(value, window.location.href);
      url.searchParams.set(
        ASSET_CACHE_KEY,
        `${Date.now()}-${++assetRefreshSequence}`,
      );
      return url.href;
    };

    const refreshableLinks = Array.from(document.querySelectorAll(
      'link[rel~="stylesheet"][href], link[rel~="icon"][href]',
    )).filter((link) =>
      !isInPreservedSubtree(link) &&
      !link.hasAttribute(PENDING_LINK_REFRESH_ATTRIBUTE),
    );
    const refreshableStylesheets = refreshableLinks.filter((link) =>
      link.relList.contains('stylesheet') && isSameOriginAsset(link.href),
    );
    const hasInlineStylesheetImport = Array.from(
      document.querySelectorAll('style'),
    ).some((style) =>
      !isInPreservedSubtree(style) && /@import\b/i.test(style.textContent),
    );
    if (
      (
        hasStylesheetChange &&
        refreshableStylesheets.length === 0
      ) ||
      (
        (hasStylesheetChange || refreshAll) &&
        hasInlineStylesheetImport
      )
    ) {
      requestFullReload('stylesheet-unreachable');
      return false;
    }

    for (const link of refreshableLinks) {
      const refreshForStylesheetDependency =
        hasStylesheetChange &&
        link.relList.contains('stylesheet') &&
        isSameOriginAsset(link.href);
      if (!refreshForStylesheetDependency && !shouldRefresh(link.href)) continue;

      const previousRefresh = pendingLinkRefreshes.get(link);
      if (previousRefresh) {
        pendingLinkRefreshes.delete(link);
        previousRefresh.replacement.remove();
      }

      const replacement = link.cloneNode(true);
      replacement.setAttribute(PENDING_LINK_REFRESH_ATTRIBUTE, '');
      replacement.href = cacheBust(link.href);
      const refresh = { replacement };
      pendingLinkRefreshes.set(link, refresh);
      replacement.addEventListener('load', () => {
        if (pendingLinkRefreshes.get(link) !== refresh) {
          replacement.remove();
          return;
        }
        pendingLinkRefreshes.delete(link);
        replacement.removeAttribute(PENDING_LINK_REFRESH_ATTRIBUTE);
        if (managedHeadElements.has(link)) {
          managedHeadElements.delete(link);
          managedHeadElements.add(replacement);
        }
        link.remove();
      }, { once: true });
      replacement.addEventListener('error', () => {
        if (pendingLinkRefreshes.get(link) !== refresh) {
          replacement.remove();
          return;
        }
        pendingLinkRefreshes.delete(link);
        replacement.remove();
      }, { once: true });
      link.after(replacement);
    }

    const assetAttributes = [
      ['audio[src]', 'src'],
      ['embed[src]', 'src'],
      ['img[src]', 'src'],
      ['input[type="image"][src]', 'src'],
      ['object[data]', 'data'],
      ['source[src]', 'src'],
      ['track[src]', 'src'],
      ['video[poster]', 'poster'],
      ['video[src]', 'src'],
      ['image[href]', 'href'],
      ['use[href]', 'href'],
    ];
    for (const [selector, attributeName] of assetAttributes) {
      for (const element of document.querySelectorAll(selector)) {
        if (isInPreservedSubtree(element)) continue;
        const value = element.getAttribute(attributeName);
        if (!value || !shouldRefresh(value)) continue;
        element.setAttribute(attributeName, cacheBust(value));
      }
    }

    for (const element of document.querySelectorAll('img[srcset], source[srcset]')) {
      if (isInPreservedSubtree(element)) continue;
      const value = element.getAttribute('srcset');
      let changed = false;
      const nextValue = value.split(',').map((rawCandidate) => {
        const candidate = rawCandidate.trim();
        const match = candidate.match(/^(\S+)([\s\S]*)$/);
        if (!match || !shouldRefresh(match[1])) return candidate;
        changed = true;
        return `${cacheBust(match[1])}${match[2]}`;
      }).join(', ');
      if (changed) element.setAttribute('srcset', nextValue);
    }

    window.dispatchEvent(new CustomEvent('rettangoli:watch-asset-update', {
      detail: { paths: [...(rawPaths || [])], refreshAll },
    }));
    return true;
  };

  const normalizeRevision = (value) =>
    Number.isSafeInteger(value) && value >= 0 ? value : null;
  const normalizeSessionId = (value) =>
    typeof value === 'string' && value.length > 0 ? value : null;
  let currentRevision = normalizeRevision(initialRevision) ?? 0;
  let currentSessionId = normalizeSessionId(initialSessionId);
  let shouldSyncAfterConnect = false;

  const advanceRevision = (revision) => {
    const normalizedRevision = normalizeRevision(revision);
    if (normalizedRevision !== null && normalizedRevision > currentRevision) {
      currentRevision = normalizedRevision;
    }
  };

  const clearWatchError = () => {
    document.getElementById(WATCH_ERROR_ID)?.remove();
  };

  const showWatchError = (data) => {
    const message = typeof data?.message === 'string'
      ? data.message
      : 'The latest source change could not be generated.';
    console.error('[Rettangoli Watch] Generation failed; keeping the current page state.', message);

    let errorElement = document.getElementById(WATCH_ERROR_ID);
    if (!errorElement) {
      errorElement = document.createElement('pre');
      errorElement.id = WATCH_ERROR_ID;
      errorElement.setAttribute('data-rtgl-preserve', '');
      Object.assign(errorElement.style, {
        background: '#2b0d12',
        border: '1px solid #ff667a',
        borderRadius: '6px',
        boxShadow: '0 8px 32px rgb(0 0 0 / 40%)',
        color: '#ffd9de',
        font: '12px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        left: '16px',
        margin: '0',
        maxHeight: '40vh',
        maxWidth: 'min(720px, calc(100vw - 32px))',
        overflow: 'auto',
        padding: '12px',
        position: 'fixed',
        right: '16px',
        top: '16px',
        whiteSpace: 'pre-wrap',
        zIndex: '2147483647',
      });
      document.body.append(errorElement);
    }
    errorElement.textContent = `[Rettangoli Watch] Generation failed\n\n${message}`;
    window.dispatchEvent(new CustomEvent('rettangoli:watch-error', {
      detail: data,
    }));
  };

  const handleWatchState = async (data) => {
    const serverSessionId = normalizeSessionId(data.sessionId);
    const serverRevision = normalizeRevision(data.revision);
    const fullReloadRevision = normalizeRevision(data.fullReloadRevision);
    const missedFullReload = fullReloadRevision !== null &&
      fullReloadRevision > currentRevision;
    const hasNewerRevision = serverRevision !== null &&
      serverRevision > currentRevision;
    const shouldSync = shouldSyncAfterConnect || hasNewerRevision || needsHtmlSync;
    shouldSyncAfterConnect = false;

    if (
      currentSessionId !== null &&
      serverSessionId !== null &&
      serverSessionId !== currentSessionId
    ) {
      requestFullReload('watcher-restarted');
      return;
    }
    if (missedFullReload) {
      requestFullReload('missed-full-update');
      return;
    }
    if (reloadMode === 'full' && shouldSync) {
      requestFullReload('reconnected-update');
      return;
    }
    if (reloadMode === 'body' && shouldSync) {
      const updated = await applyHtmlUpdate({ refreshAllAssets: true });
      if (!updated) return;
      clearWatchError();
    }
    if (serverSessionId !== null) currentSessionId = serverSessionId;
    advanceRevision(serverRevision);
  };

  const handleMessageData = async (data) => {
    if (!data || typeof data !== 'object') return;
    if (data.type === 'watch-error') {
      cancelHtmlUpdate();
      showWatchError(data);
      return;
    }
    if (data.type === 'watch-state') {
      await handleWatchState(data);
      return;
    }
    if (data.type !== 'reload-current') return;

    const messageSessionId = normalizeSessionId(data.sessionId);
    if (
      currentSessionId !== null &&
      messageSessionId !== null &&
      messageSessionId !== currentSessionId
    ) {
      requestFullReload('watcher-restarted');
      return;
    }
    if (messageSessionId !== null) currentSessionId = messageSessionId;

    if (reloadMode === 'full' || data.updateKind === 'full') {
      requestFullReload(data.updateKind === 'full' ? 'asset-script-change' : 'full-mode');
      return;
    }
    if (data.updateKind === 'assets') {
      refreshAssets(data.paths);
      advanceRevision(data.revision);
      return;
    }
    const updated = await applyHtmlUpdate({ assetPaths: data.paths || [] });
    if (updated) {
      clearWatchError();
      advanceRevision(data.revision);
    }
  };

  const handleMessage = async (event) => {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch {
      return;
    }
    await handleMessageData(data);
  };

  const wsProtocol = location.protocol === 'https:' ? 'wss://' : 'ws://';
  const connect = () => {
    const socket = new WebSocket(wsProtocol + location.host);
    socket.onmessage = (event) => {
      void handleMessage(event);
    };
    socket.onclose = () => {
      if (reloadMode === 'full') {
        setTimeout(() => requestFullReload('socket-disconnect'), 1000);
      } else {
        shouldSyncAfterConnect = true;
        setTimeout(connect, 1000);
      }
    };
  };
  if (transport !== 'external') connect();
  return { handleMessageData };
}

export function createWatchClientScript(
  reloadMode = 'body',
  initialRevision = 0,
  initialSessionId = null,
) {
  return `<script data-rtgl-watch-client>\n(${runWatchClient.toString()})(${JSON.stringify({ reloadMode, initialRevision, initialSessionId })});\n</script>\n`;
}

export function createViteWatchClientModuleSource({
  eventName = 'rettangoli:vt-watch',
  reloadMode = 'body',
} = {}) {
  return `
const rettangoliWatchClient = (${runWatchClient.toString()})(${JSON.stringify({
    reloadMode,
    initialRevision: 0,
    initialSessionId: null,
    transport: 'external',
  })});
if (import.meta.hot) {
  let initialLoadComplete = document.readyState === 'complete';
  const requestWatchState = () => {
    import.meta.hot.send(${JSON.stringify(`${eventName}:state-request`)});
  };
  import.meta.hot.on(${JSON.stringify(eventName)}, (data) => {
    void rettangoliWatchClient.handleMessageData(data);
  });
  import.meta.hot.on('vite:ws:connect', () => {
    if (initialLoadComplete) requestWatchState();
  });
  if (initialLoadComplete) {
    queueMicrotask(requestWatchState);
  } else {
    window.addEventListener('load', () => {
      initialLoadComplete = true;
      requestWatchState();
    }, { once: true });
  }
}
`;
}
