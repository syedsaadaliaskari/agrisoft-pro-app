import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getAppConfig } from '@/lib/config';

let client: SupabaseClient | null = null;
let clientKey: string | null = null;

export function getSupabase(): SupabaseClient | null {
  const { supabaseUrl, anonKey, hasAnonKey } = getAppConfig();
  if (!hasAnonKey || !supabaseUrl) {
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
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  clientKey = cacheKey;
  return client;
}

export function missingKeysMessage(): string {
  return "Couldn't load this data.";
}
