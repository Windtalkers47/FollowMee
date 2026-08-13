export const canUsePublicRegistration = (isDevelopment: boolean, featureEnabled: boolean): boolean =>
  isDevelopment && featureEnabled;
