import AsyncStorage from '@react-native-async-storage/async-storage';

import { readActivationPayload, todayIsoDate, type LicensePlan } from '@/lib/activation';
import { getMemberTenantId } from '@/lib/config';
import { getSupabase } from '@/lib/supabase';
import { isVendorUnlocked } from '@/lib/vendorUnlock';

const INSTALL_KEY = 'agrisoft.license.installId';
const INSTALLED_AT_KEY = 'agrisoft.license.installedAt';
const RECORD_KEY = 'agrisoft.license.record';
const TRIAL_DAYS = 7;
const VENDOR_WHATSAPP = '923168762618';

type StoredLicense = {
  name: string;
  plan: LicensePlan;
  activatedAt: string;
  expiresAt: string | null;
};

export type DeviceLicenseStatus = {
  installId: string;
  installedAt: string;
  trialEndsAt: string;
  trialDaysLeft: number;
  mode: 'trial' | 'pro' | 'locked';
  allowed: boolean;
  plan: LicensePlan | null;
  expiresAt: string | null;
};

let current: DeviceLicenseStatus | null = null;
let shopLicenseClosed = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribeDeviceLicense(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDeviceLicense() {
  return current;
}

/** Super Admin stays open. Admin and every other shop user follow the 7-day trial. */
export function shopLicenseAllowed() {
  if (isVendorUnlocked()) return true;
  return current?.allowed === true;
}

/** True only after the shop row says this phone is locked. Until then, show login. */
export function isShopLicenseClosed() {
  if (isVendorUnlocked()) return false;
  return shopLicenseClosed && !shopLicenseAllowed();
}

function addDaysIso(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(fromIso: string, toIso: string) {
  const from = new Date(`${fromIso}T12:00:00`).getTime();
  const to = new Date(`${toIso}T12:00:00`).getTime();
  return Math.floor((to - from) / (24 * 60 * 60 * 1000));
}

function makeInstallId() {
  const part = () => {
    const cryptoApi = globalThis.crypto;
    if (cryptoApi?.getRandomValues) {
      const bytes = new Uint8Array(2);
      cryptoApi.getRandomValues(bytes);
      return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
    }
    return Math.floor(Math.random() * 0x10000)
      .toString(16)
      .padStart(4, '0')
      .toUpperCase();
  };
  return `ASP-${part()}-${part()}-${part()}`;
}

async function ensureIdentity() {
  let installId = (await AsyncStorage.getItem(INSTALL_KEY))?.trim() || '';
  let installedAt = (await AsyncStorage.getItem(INSTALLED_AT_KEY))?.trim() || '';
  if (!installId) {
    installId = makeInstallId();
    await AsyncStorage.setItem(INSTALL_KEY, installId);
  }
  if (!installedAt) {
    installedAt = todayIsoDate();
    await AsyncStorage.setItem(INSTALLED_AT_KEY, installedAt);
  }
  return { installId, installedAt };
}

function licenseIsLive(row: StoredLicense, today: string) {
  if (row.plan === 'forever' || !row.expiresAt) return true;
  return row.expiresAt >= today;
}

function statusFrom(identity: { installId: string; installedAt: string }, row: StoredLicense | null): DeviceLicenseStatus {
  const today = todayIsoDate();
  const trialEndsAt = addDaysIso(identity.installedAt, TRIAL_DAYS);
  const trialDaysLeft = Math.max(0, TRIAL_DAYS - daysBetween(identity.installedAt, today));
  if (row && licenseIsLive(row, today)) {
    return {
      ...identity,
      trialEndsAt,
      trialDaysLeft,
      mode: 'pro',
      allowed: true,
      plan: row.plan,
      expiresAt: row.plan === 'forever' ? null : row.expiresAt,
    };
  }
  if (trialDaysLeft > 0) {
    return {
      ...identity,
      trialEndsAt,
      trialDaysLeft,
      mode: 'trial',
      allowed: true,
      plan: null,
      expiresAt: null,
    };
  }
  return {
    ...identity,
    trialEndsAt,
    trialDaysLeft: 0,
    mode: 'locked',
    allowed: false,
    plan: null,
    expiresAt: null,
  };
}

export async function hydrateDeviceLicense() {
  const identity = await ensureIdentity();
  const raw = await AsyncStorage.getItem(RECORD_KEY);
  let row: StoredLicense | null = null;
  if (raw) {
    try {
      row = JSON.parse(raw) as StoredLicense;
    } catch {
      row = null;
    }
  }
  current = statusFrom(identity, row);
  emit();
  return current;
}

export async function applyDeviceActivation(rawCode: string) {
  const payload = await readActivationPayload(rawCode);
  const identity = await ensureIdentity();
  if (payload.installId.trim().toUpperCase() !== identity.installId) {
    throw new Error(`This code is for ${payload.installId}, but this phone is ${identity.installId}`);
  }
  const today = todayIsoDate();
  if (payload.plan !== 'forever' && payload.expiresAt && payload.expiresAt < today) {
    throw new Error('This activation code has expired');
  }
  const row: StoredLicense = {
    name: payload.name?.trim() || 'Activated',
    plan: payload.plan,
    activatedAt: payload.activatedAt || today,
    expiresAt: payload.plan === 'forever' ? null : payload.expiresAt,
  };
  await AsyncStorage.setItem(RECORD_KEY, JSON.stringify(row));
  current = statusFrom(identity, row);
  shopLicenseClosed = false;
  emit();
  await syncShopLicense();
  return current;
}

type ShopLicenseRow = {
  install_id?: string | null;
  trial_started_at?: string | null;
  plan?: string | null;
  license_expires_at?: string | null;
  license_name?: string | null;
};

/** Pull the shop Install ID and activation. Sales sync is not part of this. */
export async function syncShopLicense() {
  if (isVendorUnlocked()) return current;
  const tenantId = getMemberTenantId();
  if (!tenantId) return current;
  const client = getSupabase();
  if (!client) return current;
  const identity = await ensureIdentity();
  const raw = await AsyncStorage.getItem(RECORD_KEY);
  let saved: StoredLicense | null = null;
  if (raw) {
    try {
      saved = JSON.parse(raw) as StoredLicense;
    } catch {
      saved = null;
    }
  }
  const { data, error } = await client.rpc('sync_shop_license', {
    p_tenant_id: tenantId,
    p_install_id: identity.installId,
    p_trial_started_at: identity.installedAt,
    p_plan: saved?.plan ?? null,
    p_expires_at: saved?.expiresAt ?? null,
    p_license_name: saved?.name ?? null,
    p_source: 'phone',
  });
  if (error || !data || typeof data !== 'object') {
    if (!shopLicenseAllowed()) {
      shopLicenseClosed = true;
      emit();
    }
    return current;
  }
  const shop = data as ShopLicenseRow;
  const installId = shop.install_id?.trim();
  const installedAt = shop.trial_started_at?.trim();
  if (!installId || !installedAt) {
    if (!shopLicenseAllowed()) {
      shopLicenseClosed = true;
      emit();
    }
    return current;
  }
  await AsyncStorage.setItem(INSTALL_KEY, installId);
  await AsyncStorage.setItem(INSTALLED_AT_KEY, installedAt);
  const plan = shop.plan?.trim();
  if (plan === 'monthly' || plan === 'yearly' || plan === 'forever') {
    const row: StoredLicense = {
      name: shop.license_name?.trim() || 'Activated',
      plan,
      activatedAt: installedAt,
      expiresAt: plan === 'forever' ? null : shop.license_expires_at?.trim() || null,
    };
    await AsyncStorage.setItem(RECORD_KEY, JSON.stringify(row));
    current = statusFrom({ installId, installedAt }, row);
  } else {
    await AsyncStorage.removeItem(RECORD_KEY);
    current = statusFrom({ installId, installedAt }, null);
  }
  shopLicenseClosed = current.allowed !== true;
  emit();
  return current;
}

export function whatsappActivationUrl(installId: string) {
  const text = [
    'Hello, I need Agri Soft Pro activation.',
    `Install ID: ${installId}`,
    'Plan: (Monthly / Yearly / Forever)',
  ].join('\n');
  return `https://wa.me/${VENDOR_WHATSAPP}?text=${encodeURIComponent(text)}`;
}
