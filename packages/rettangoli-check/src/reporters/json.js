export const formatJsonReport = ({ result, warnAsError = false }) => {
  const effectiveErrors = result.summary.bySeverity.error
    + (warnAsError ? result.summary.bySeverity.warn : 0);

  return JSON.stringify({
    ok: effectiveErrors === 0,
    componentCount: result.componentCount,
    registryTagCount: result.registryTagCount,
    summary: result.summary,
    warnAsError,
    diagnostics: result.diagnostics,
  }, null, 2);
};
