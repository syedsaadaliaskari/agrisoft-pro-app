import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getAppConfig } from '@/lib/config';

let client: SupabaseClient | null = null;
let clientKey: string | null = null;

export function getSupabase(): SupabaseClient | null {
  const { supabaseUrl, anonKey, isReady } = getAppConfig();
  if (!isReady) {
    client = null;
    clientKey = null;
    return null;
  }

  const cacheKey = `${supabaseUrl}:${anonKey}`;
  if (client && clientKey === cacheKey) {
    return client;
  }

  client = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  clientKey = cacheKey;
  return client;
}

export function missingKeysMessage(): string {
  return "Couldn't load this data.";
}
