import { appendViewportToBaseName, resolveViewports } from "../viewport.js";
import { removeExtension, toCandidateUrlPath } from "../spec-files.js";

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
  const specPathByBaseName = new Map();
  let taskIndex = 0;

  generatedFiles.forEach((file, fileIndex) => {
    const frontMatter = file.frontMatter || {};
    const constructedUrl = `${serverUrl}${toCandidateUrlPath(file.path)}`;
    const resolvedConfigUrl = configUrl ? toAbsoluteUrl(configUrl, serverUrl) : null;
    // Only the page VT generated must exist: a 4xx/5xx answer fails the task (see navigateToReadyState).
    const vtOwnedUrl = (frontMatter.url ?? resolvedConfigUrl) == null;
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
      const baseName = appendViewportToBaseName(removeExtension(file.path), viewportId);
      const otherSpecPath = specPathByBaseName.get(baseName);
      if (otherSpecPath !== undefined && otherSpecPath !== file.path) {
        throw new Error(
          `Screenshot name collision: "${otherSpecPath}" and "${file.path}" both produce "${baseName}-NN.webp".`,
        );
      }
      specPathByBaseName.set(baseName, file.path);
      const task = {
        id: `${fileIndex}:${file.path}:${viewportId ?? "default"}`,
        index: taskIndex,
        path: file.path,
        url,
        baseName,
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

      if (vtOwnedUrl) {
        task.vtOwnedUrl = true;
      }
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
