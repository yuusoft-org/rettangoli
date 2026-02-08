const removeExtension = (filePath) => filePath.replace(/\.[^/.]+$/, "");

const toHtmlPath = (filePath) => {
  if (filePath.endsWith(".html")) {
    return filePath;
  }
  return `${removeExtension(filePath)}.html`;
};

function normalizePathForUrl(filePath) {
  return filePath.replace(/\\/g, "/");
}

function toAbsoluteUrl(rawUrl, serverUrl) {
  if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
    return rawUrl;
  }
  return new URL(rawUrl, serverUrl).href;
}

function resolveWaitStrategy(frontMatter, defaults) {
  if (frontMatter.waitStrategy) {
    return frontMatter.waitStrategy;
  }
  if (frontMatter.waitEvent) {
    return "event";
  }
  if (frontMatter.waitSelector) {
    return "selector";
  }
  if (defaults.waitStrategy) {
    return defaults.waitStrategy;
  }
  if (defaults.waitEvent) {
    return "event";
  }
  if (defaults.waitSelector) {
    return "selector";
  }
  return "networkidle";
}

function estimateTaskCost(steps, resolvedWaitStrategy) {
  const strategyBase = {
    networkidle: 30,
    load: 10,
    event: 20,
    selector: 15,
  };
  const stepCost = Array.isArray(steps) ? steps.length * 25 : 0;
  return 100 + stepCost + (strategyBase[resolvedWaitStrategy] ?? 0);
}

export function createCaptureTasks(generatedFiles, options) {
  const {
    serverUrl,
    configUrl,
    waitEvent,
    waitSelector,
    waitStrategy,
  } = options;

  return generatedFiles.map((file, index) => {
    const frontMatter = file.frontMatter || {};
    const normalizedPath = normalizePathForUrl(file.path);
    const constructedUrl = toHtmlPath(`${serverUrl}/candidate/${normalizedPath}`);
    const rawUrl = frontMatter.url ?? configUrl ?? constructedUrl;
    const url = toAbsoluteUrl(rawUrl, serverUrl);
    const resolvedWaitEvent = frontMatter.waitEvent ?? waitEvent;
    const resolvedWaitSelector = frontMatter.waitSelector ?? waitSelector;

    const resolvedWaitStrategy = resolveWaitStrategy(frontMatter, {
      waitEvent,
      waitSelector,
      waitStrategy,
    });

    const task = {
      id: `${index}:${file.path}`,
      index,
      path: file.path,
      url,
      baseName: removeExtension(file.path),
      frontMatter,
      steps: frontMatter.steps || [],
      waitStrategy: resolvedWaitStrategy,
      estimatedCost: estimateTaskCost(frontMatter.steps || [], resolvedWaitStrategy),
    };

    if (resolvedWaitEvent !== undefined && resolvedWaitEvent !== null) {
      task.waitEvent = resolvedWaitEvent;
    }
    if (resolvedWaitSelector !== undefined && resolvedWaitSelector !== null) {
      task.waitSelector = resolvedWaitSelector;
    }

    return task;
  });
}
