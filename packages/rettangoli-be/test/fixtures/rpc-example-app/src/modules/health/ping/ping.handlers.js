export const healthPingMethod = ({ payload, context }) => ({
  ok: true,
  echo: payload.echo,
  requestId: context.requestId,
});
