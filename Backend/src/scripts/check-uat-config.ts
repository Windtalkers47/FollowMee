import { validateUatRuntimeConfig } from '../config/uat.config';
const database = String(process.env.DB_NAME || '').trim().toLowerCase();
if (!database || database === 'followmee') throw new Error('UAT deployment refuses DB_NAME=followmee. Configure an isolated disposable UAT database.');
if (process.env.PROFILE_CUSTOM_DOMAINS_ENABLED !== 'false') throw new Error('Custom domains must remain disabled during closed UAT.');
validateUatRuntimeConfig(process.env);
console.log(`[UAT Doctor] Configuration accepted for isolated database "${database}". Secrets were not printed.`);
