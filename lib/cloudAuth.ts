import AsyncStorage from '@react-native-async-storage/async-storage';

import { setMemberTenantId } from '@/lib/config';
import { syncShopLicense } from '@/lib/deviceLicense';
import { startCloudShopSession } from '@/lib/rbac';
import { getSupabase } from '@/lib/supabase';

const TENANT_KEY = 'agrisoft.cloud.memberTenant';
const JOIN_CODE_KEY = 'agrisoft.cloud.joinCode';

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
  const { localShopHasWork, resetLocalShopBooks } = await import('@/lib/erp');
  const { resetCloudPullState } = await import('@/lib/cloudSync');
  const { clearTombstones } = await import('@/lib/tombstones');
  const current = (await AsyncStorage.getItem(TENANT_KEY))?.trim() || '';
  const hasWork = localShopHasWork();
  if (current && current !== tenantId && hasWork) {
    throw new Error('This phone already has shop data. Leave the shop code empty to keep it.');
  }
  const sameShop = Boolean(current) && current === tenantId;
  if (!(sameShop || (!current && hasWork))) {
    await resetLocalShopBooks();
    await resetCloudPullState();
    await clearTombstones();
  }
  await rememberTenant(tenantId);
  await syncShopLicense();
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
  if (tenantId) {
    await rememberTenant(tenantId);
    await syncShopLicense();
  }
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
    await syncShopLicense();
  }
}

export async function getStoredJoinCode() {
  const raw = (await AsyncStorage.getItem(JOIN_CODE_KEY))?.trim() || '';
  const code = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== 8) return '';
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/** Start an empty shop on this phone. Does not join or change an existing shop. */
export async function startOwnShop(input: { email: string; password: string; shopName: string }) {
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const shopName = input.shopName.trim();
  if (!email.includes('@')) throw new Error('Enter a valid email.');
  if (password.length < 6) throw new Error('Password must be at least 6 characters.');
  if (!shopName) throw new Error('Enter the shop name.');

  const { localShopHasWork } = await import('@/lib/erp');
  if (localShopHasWork()) {
    throw new Error('This phone already has shop data. Sign in to keep it.');
  }

  const client = requireClient();
  const signedUp = await client.auth.signUp({ email, password });
  let session = signedUp.data?.session ?? null;
  if (signedUp.error && /already registered/i.test(signedUp.error.message || '')) {
    const signedIn = await client.auth.signInWithPassword({ email, password });
    if (signedIn.error) throw new Error(describeAuthError(signedIn.error, "Couldn't sign in."));
    session = signedIn.data.session;
  } else if (signedUp.error) {
    throw new Error(describeAuthError(signedUp.error, "Couldn't create the account."));
  } else {
    session = signedUp.data?.session ?? null;
  }
  if (!session) {
    throw new Error('Account created. Confirm your email if asked, then sign in.');
  }

  const created = await client.rpc('create_shop', { shop_name: shopName });
  if (created.error) {
    const message = created.error.message || '';
    if (/already belongs/i.test(message)) {
      throw new Error('This account already has a shop. Sign in and leave the shop code empty.');
    }
    if (/create_shop|schema cache|function/i.test(message)) {
      throw new Error("Couldn't start a new shop yet.");
    }
    throw new Error(describeAuthError(created.error, "Couldn't start the shop."));
  }

  const payload = created.data as { tenant_id?: string; join_code?: string } | null;
  const tenantId = payload?.tenant_id?.trim() || '';
  const joinCode = payload?.join_code?.trim() || '';
  if (!tenantId || !joinCode) throw new Error("Couldn't start the shop.");

  const { resetLocalShopBooks, saveSettings } = await import('@/lib/erp');
  const { resetCloudPullState } = await import('@/lib/cloudSync');
  const { clearTombstones } = await import('@/lib/tombstones');
  await resetLocalShopBooks();
  await resetCloudPullState();
  await clearTombstones();
  await saveSettings({ shop_name: shopName });
  await rememberTenant(tenantId);
  await AsyncStorage.setItem(JOIN_CODE_KEY, joinCode.toUpperCase());
  await syncShopLicense();
  await startCloudShopSession(email);
  return { tenantId, joinCode };
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
  const tenantId = code ? await joinShop(code) : await loadMembership();
  if (!tenantId) throw new Error('Enter the shop code.');
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
