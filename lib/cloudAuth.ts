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
      return 'Confirm your email, then sign in.';
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
    if (/unknown shop/i.test(message) || /not found/i.test(message) || /not valid/i.test(message)) {
      throw new Error('That shop code was not found.');
    }
    throw new Error(describeAuthError(error, "Couldn't join that shop."));
  }
  const tenantId = typeof data === 'string' && data.trim() ? data.trim() : code;
  const { resetLocalShopBooks } = await import('@/lib/erp');
  const { resetCloudPullState } = await import('@/lib/cloudSync');
  const { clearTombstones } = await import('@/lib/tombstones');
  await resetLocalShopBooks();
  await resetCloudPullState();
  await clearTombstones();
  await rememberTenant(tenantId);
  return tenantId;
}

export async function loadMembership(): Promise<string> {
  const client = requireClient();
  const { data: userData } = await client.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return '';
  const { data, error } = await client
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);
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
      'Account created. Confirm your email if asked, then sign in.',
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

  const code = input.shopCode?.trim() || '';
  if (!code) throw new Error('Enter the shop code.');
  const tenantId = await joinShop(code);
  await startCloudShopSession(email);
  return tenantId;
}

export async function signOutCloud() {
  setMemberTenantId('');
  await AsyncStorage.removeItem(TENANT_KEY);
  try {
    const { resetLocalShopBooks } = await import('@/lib/erp');
    const { resetCloudPullState } = await import('@/lib/cloudSync');
    const { clearTombstones } = await import('@/lib/tombstones');
    await resetLocalShopBooks();
    await resetCloudPullState();
    await clearTombstones();
  } catch {
    /* local wipe is best-effort */
  }
  const client = getSupabase();
  if (client) await client.auth.signOut();
}
