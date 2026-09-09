import AsyncStorage from '@react-native-async-storage/async-storage';

import { setMemberTenantId } from '@/lib/config';
import { startCloudShopSession } from '@/lib/rbac';
import { getSupabase } from '@/lib/supabase';

const TENANT_KEY = 'agrisoft.cloud.memberTenant';

function requireClient() {
  const client = getSupabase();
  if (!client) throw new Error("Couldn't reach the cloud.");
  return client;
}

function describeAuthError(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: string }).message ?? '');
    if (/email not confirmed/i.test(message)) {
      return 'Confirm your email, or in Supabase turn off Confirm email under Authentication → Providers → Email.';
    }
    if (/invalid login/i.test(message)) return 'Wrong email or password.';
    if (/already registered/i.test(message)) return 'That email already has an account. Sign in instead.';
    if (message) return message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export async function joinShop(shopCode: string) {
  const client = requireClient();
  const code = shopCode.trim();
  if (!code) throw new Error('Shop code is required.');
  const { data, error } = await client.rpc('join_shop', { shop_code: code });
  if (error) {
    const message = error.message || '';
    if (/unknown shop/i.test(message) || /not found/i.test(message)) {
      throw new Error('That shop code was not found. Ask the shop owner for the code from the PC.');
    }
    throw new Error(describeAuthError(error, "Couldn't join that shop."));
  }
  const tenantId = typeof data === 'string' ? data : code;
  await rememberTenant(tenantId);
  return tenantId;
}

export async function loadMembership(): Promise<string> {
  const client = requireClient();
  const { data: userData } = await client.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return '';
  const { data, error } = await client.from('tenant_members').select('tenant_id').eq('user_id', userId).limit(1);
  if (error) throw new Error(describeAuthError(error, "Couldn't load your shop."));
  const tenantId = data?.[0]?.tenant_id ? String(data[0].tenant_id) : '';
  if (tenantId) await rememberTenant(tenantId);
  return tenantId;
}

async function rememberTenant(tenantId: string) {
  setMemberTenantId(tenantId);
  await AsyncStorage.setItem(TENANT_KEY, tenantId);
}

export async function hydrateCloudAuth() {
  const stored = (await AsyncStorage.getItem(TENANT_KEY))?.trim() || '';
  if (stored) setMemberTenantId(stored);
  const client = getSupabase();
  if (!client) return;
  const { data } = await client.auth.getSession();
  if (!data.session) return;
  const tenantId = (await loadMembership()) || stored;
  if (tenantId && data.session.user.email) {
    await startCloudShopSession(data.session.user.email);
  }
}

export async function createShopAccount(input: { email: string; password: string; shopCode: string }) {
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const shopCode = input.shopCode.trim();
  if (!email.includes('@')) throw new Error('Enter a valid email.');
  if (password.length < 6) throw new Error('Password must be at least 6 characters.');
  if (!shopCode) throw new Error('Shop code is required.');

  const client = requireClient();
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw new Error(describeAuthError(error, "Couldn't create the account."));
  if (!data.session) {
    throw new Error(
      'Account created. In Supabase: Authentication → Providers → Email → turn off Confirm email. Then Sign in and enter the shop code.',
    );
  }
  await joinShop(shopCode);
  await startCloudShopSession(email);
}

export async function signInShopAccount(input: { email: string; password: string; shopCode?: string }) {
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  if (!email.includes('@')) throw new Error('Enter a valid email.');
  if (!password) throw new Error('Password is required.');

  const client = requireClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(describeAuthError(error, "Couldn't sign in."));

  let tenantId = await loadMembership();
  const code = input.shopCode?.trim() || '';
  if (!tenantId) {
    if (!code) throw new Error('First time on this phone: enter the shop code the owner gave you.');
    tenantId = await joinShop(code);
  }
  await startCloudShopSession(email);
  return tenantId;
}

export async function signOutCloud() {
  setMemberTenantId('');
  await AsyncStorage.removeItem(TENANT_KEY);
  const client = getSupabase();
  if (client) await client.auth.signOut();
}
