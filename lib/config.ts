const DEFAULT_URL = 'https://vbyqlfxcfxijmrvilupp.supabase.co';
const DEFAULT_TENANT_ID = 'tenant-dev-001';

function readEnv(name: string): string {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

export type AppConfig = {
  supabaseUrl: string;
  anonKey: string;
  tenantId: string;
  hasAnonKey: boolean;
  isReady: boolean;
};

export function getAppConfig(): AppConfig {
  const supabaseUrl = readEnv('EXPO_PUBLIC_SUPABASE_URL') || DEFAULT_URL;
  const anonKey = readEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  const tenantId = readEnv('EXPO_PUBLIC_TENANT_ID') || DEFAULT_TENANT_ID;

  return {
    supabaseUrl,
    anonKey,
    tenantId,
    hasAnonKey: anonKey.length > 0,
    isReady: supabaseUrl.length > 0 && anonKey.length > 0 && tenantId.length > 0,
  };
}
