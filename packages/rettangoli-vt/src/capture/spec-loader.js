import { appendViewportToBaseName, resolveViewports } from "../viewport.js";

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
    viewport,
  } = options;

  const tasks = [];
  let taskIndex = 0;

  generatedFiles.forEach((file, fileIndex) => {
    const frontMatter = file.frontMatter || {};
    const normalizedPath = normalizePathForUrl(file.path);
    const constructedUrl = toHtmlPath(`${serverUrl}/candidate/${normalizedPath}`);
    const resolvedConfigUrl = configUrl ? toAbsoluteUrl(configUrl, serverUrl) : null;
    const urlResolutionBase = resolvedConfigUrl || serverUrl;
    const rawUrl = frontMatter.url ?? resolvedConfigUrl ?? constructedUrl;
    const url = toAbsoluteUrl(rawUrl, urlResolutionBase);
    const resolvedWaitEvent = frontMatter.waitEvent ?? waitEvent;
    const resolvedWaitSelector = frontMatter.waitSelector ?? waitSelector;

    const resolvedWaitStrategy = resolveWaitStrategy(frontMatter, {
      waitEvent,
      waitSelector,
      waitStrategy,
    });

    const resolvedViewports = resolveViewports(frontMatter.viewport, viewport);
    resolvedViewports.forEach((resolvedViewport) => {
      const viewportId = resolvedViewport.id;
      const task = {
        id: `${fileIndex}:${file.path}:${viewportId ?? "default"}`,
        index: taskIndex,
        path: file.path,
        url,
        baseName: appendViewportToBaseName(removeExtension(file.path), viewportId),
        frontMatter,
        steps: frontMatter.steps || [],
        waitStrategy: resolvedWaitStrategy,
        estimatedCost: estimateTaskCost(frontMatter.steps || [], resolvedWaitStrategy),
        viewport: {
          id: viewportId,
          width: resolvedViewport.width,
          height: resolvedViewport.height,
        },
      };

      if (resolvedWaitEvent !== undefined && resolvedWaitEvent !== null) {
        task.waitEvent = resolvedWaitEvent;
      }
      if (resolvedWaitSelector !== undefined && resolvedWaitSelector !== null) {
        task.waitSelector = resolvedWaitSelector;
      }

      tasks.push(task);
      taskIndex += 1;
    });
  });

  return tasks;
}
