export const requiredUatVariables = [
  'PRIVACY_CONTROLLER_NAME', 'PRIVACY_CONTROLLER_EMAIL', 'PRIVACY_CONTROLLER_ADDRESS',
  'PRIVACY_POLICY_EFFECTIVE_DATE', 'TURNSTILE_SECRET_KEY', 'PROFILE_ANALYTICS_SALT',
] as const;

export const validateUatRuntimeConfig = (env: NodeJS.ProcessEnv): void => {
  if (env.NODE_ENV !== 'production' || env.ALLOW_PUBLIC_REGISTRATION !== 'true') return;
  const missing = requiredUatVariables.filter(key => !env[key]?.trim());
  const emailConfigured = Boolean(env.SENDGRID_API_KEY?.trim() || (env.SMTP_HOST?.trim() && env.SMTP_USER?.trim() && env.SMTP_PASS?.trim()));
  if (!emailConfigured) missing.push('SENDGRID_API_KEY' as typeof requiredUatVariables[number]);
  if (missing.length) throw new Error(`UAT public registration requires deployment configuration: ${[...new Set(missing)].join(', ')}`);
};
