import healthPingSchema from './ping/ping.schema.yaml';
import { createHealthPingMethod } from './ping/ping.handlers.js';

export const registerHealthModule = ({ deps }) => {
  if (!deps?.clock?.now) throw new Error('registerHealthModule: deps.clock.now is required');

  return {
    name: 'health',
    methods: {
      ...createHealthPingMethod({ now: deps.clock.now }),
    },
    contracts: {
      'health.ping': {
        paramsSchema: healthPingSchema.paramsSchema,
        resultSchema: healthPingSchema.resultSchema,
      },
    },
  };
};
