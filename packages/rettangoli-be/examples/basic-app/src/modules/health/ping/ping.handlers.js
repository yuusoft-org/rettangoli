export const healthPingMethod = async ({ payload, context, deps }) => {
  if (!deps?.now) throw new Error('healthPingMethod: deps.now is required');

  return {
    ok: true,
    echo: payload.echo,
    ts: deps.now(),
    requestId: context.requestId,
  };
};
