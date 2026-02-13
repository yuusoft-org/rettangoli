const toLine = ({ level, message, payload }) => {
  return JSON.stringify({
    level,
    message,
    payload,
    ts: Date.now(),
  });
};

export const createLogger = ({ level = 'info' } = {}) => {
  const log = (kind, message, payload) => {
    if (kind === 'debug' && level !== 'debug') return;
    console.log(toLine({ level: kind, message, payload }));
  };

  const createChild = (basePayload) => {
    return {
      info: (message, payload) => log('info', message, { ...basePayload, ...payload }),
      warn: (message, payload) => log('warn', message, { ...basePayload, ...payload }),
      error: (message, payload) => log('error', message, { ...basePayload, ...payload }),
      debug: (message, payload) => log('debug', message, { ...basePayload, ...payload }),
      child: (nextPayload) => createChild({ ...basePayload, ...nextPayload }),
    };
  };

  return createChild({});
};
