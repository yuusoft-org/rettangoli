export const createHealthPingMethod = ({ now }) => {
  if (!now) throw new Error('createHealthPingMethod: now is required');

  return {
    'health.ping': async ({ params, context }) => {
      return {
        ok: true,
        echo: params.echo,
        ts: now(),
        requestId: context.requestId,
      };
    },
  };
};
