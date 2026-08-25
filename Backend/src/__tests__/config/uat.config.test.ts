import { validateUatRuntimeConfig } from '../../config/uat.config';
describe('UAT runtime configuration', () => {
  it('does not require UAT controller data when signup is disabled', () => { expect(() => validateUatRuntimeConfig({ NODE_ENV: 'production', ALLOW_PUBLIC_REGISTRATION: 'false' })).not.toThrow(); });
  it('fails closed when production signup lacks required configuration', () => { expect(() => validateUatRuntimeConfig({ NODE_ENV: 'production', ALLOW_PUBLIC_REGISTRATION: 'true' })).toThrow(/PRIVACY_CONTROLLER_NAME/); });
  it('accepts complete production UAT configuration', () => { expect(() => validateUatRuntimeConfig({ NODE_ENV: 'production', ALLOW_PUBLIC_REGISTRATION: 'true', PRIVACY_CONTROLLER_NAME: 'Owner', PRIVACY_CONTROLLER_EMAIL: 'owner@example.com', PRIVACY_CONTROLLER_ADDRESS: 'Bangkok', PRIVACY_POLICY_EFFECTIVE_DATE: '2026-08-25', TURNSTILE_SECRET_KEY: 'secret', PROFILE_ANALYTICS_SALT: 'salt', SENDGRID_API_KEY: 'key' })).not.toThrow(); });
});
