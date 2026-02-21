export const createOtpService = ({ env }) => {
  if (!env?.OTP_SECRET) {
    throw new Error('createOtpService: env.OTP_SECRET is required');
  }

  return {
    generate: ({ identifier }) => {
      if (!identifier) throw new Error('createOtpService.generate: identifier is required');
      return `${identifier}-${Date.now()}`;
    },
  };
};
