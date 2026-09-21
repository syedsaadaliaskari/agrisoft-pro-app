const DEFAULT_URL = 'https://vbyqlfxcfxijmrvilupp.supabase.co';

function readEnv(value: string | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

let memberTenantId = '';

export function setMemberTenantId(id: string) {
  memberTenantId = id.trim();
}

export function getMemberTenantId() {
  return memberTenantId;
}

export type AppConfig = {
  supabaseUrl: string;
  anonKey: string;
  tenantId: string;
  hasAnonKey: boolean;
  isReady: boolean;
};

export function getAppConfig(): AppConfig {
  // Expo inlines only static process.env.EXPO_PUBLIC_* names in release APKs.
  const supabaseUrl = readEnv(process.env.EXPO_PUBLIC_SUPABASE_URL) || DEFAULT_URL;
  const anonKey = readEnv(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
  const tenantId = memberTenantId || readEnv(process.env.EXPO_PUBLIC_TENANT_ID);

  return {
    supabaseUrl,
    anonKey,
    tenantId,
    hasAnonKey: anonKey.length > 0,
    isReady: supabaseUrl.length > 0 && anonKey.length > 0 && tenantId.length > 0,
  };
}
