import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  addMonthsIso,
  buildActivationCode,
  todayIsoDate,
  type LicensePlan,
  type LicenseRow,
} from '@/lib/activation';
import { newId } from '@/lib/id';
import { getSupabase } from '@/lib/supabase';

export type ClientCompany = {
  id: string;
  companyName: string;
  area: string;
  joinedAt: string;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CompaniesDemandSummary = {
  totalCompanies: number;
  activeCompanies: number;
  areaDemand: { area: string; companyCount: number }[];
};

export type ClientCompanyInput = {
  companyName: string;
  area: string;
  joinedAt: string;
  notes?: string | null;
  isActive?: boolean;
};

type Store = {
  companies: ClientCompany[];
  licenses: Omit<LicenseRow, 'activationCode'>[];
};

const STORAGE_KEY = 'agrisoft.vendor';

let store: Store = { companies: [], licenses: [] };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

async function persist() {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function subscribeVendor(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function hydrateVendor(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Store;
      store = {
        companies: parsed.companies ?? [],
        licenses: parsed.licenses ?? [],
      };
    }
  } catch {
    store = { companies: [], licenses: [] };
  }
  await pullCloud();
  emit();
}

function demandFrom(companies: ClientCompany[]): CompaniesDemandSummary {
  const byArea = new Map<string, number>();
  let active = 0;
  for (const row of companies) {
    if (row.isActive) active += 1;
    const key = row.area.trim() || 'Unknown';
    byArea.set(key, (byArea.get(key) ?? 0) + 1);
  }
  const areaDemand = [...byArea.entries()]
    .map(([area, companyCount]) => ({ area, companyCount }))
    .sort((a, b) => b.companyCount - a.companyCount || a.area.localeCompare(b.area));
  return {
    totalCompanies: companies.length,
    activeCompanies: active,
    areaDemand,
  };
}

export function listClientCompanies(): ClientCompany[] {
  return [...store.companies].sort((a, b) => a.companyName.localeCompare(b.companyName));
}

export function getCompaniesDemand(): CompaniesDemandSummary {
  return demandFrom(store.companies);
}

export async function createClientCompany(input: ClientCompanyInput): Promise<ClientCompany> {
  const companyName = input.companyName.trim();
  const area = input.area.trim();
  const joinedAt = input.joinedAt.trim();
  if (!companyName) throw new Error('Company name is required');
  if (!area) throw new Error('Area / city is required');
  if (!joinedAt) throw new Error('Joined date is required');
  const now = new Date().toISOString();
  const row: ClientCompany = {
    id: newId(),
    companyName,
    area,
    joinedAt,
    notes: input.notes?.trim() || null,
    isActive: input.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };
  store.companies.push(row);
  await persist();
  emit();
  void pushCompany(row);
  return row;
}

export async function updateClientCompany(id: string, input: ClientCompanyInput): Promise<ClientCompany> {
  const current = store.companies.find((row) => row.id === id);
  if (!current) throw new Error('Company not found');
  const companyName = input.companyName.trim();
  const area = input.area.trim();
  const joinedAt = input.joinedAt.trim();
  if (!companyName) throw new Error('Company name is required');
  if (!area) throw new Error('Area / city is required');
  if (!joinedAt) throw new Error('Joined date is required');
  current.companyName = companyName;
  current.area = area;
  current.joinedAt = joinedAt;
  current.notes = input.notes === undefined ? current.notes : input.notes?.trim() || null;
  current.isActive = input.isActive ?? current.isActive;
  current.updatedAt = new Date().toISOString();
  await persist();
  emit();
  void pushCompany(current);
  return current;
}

export async function deleteClientCompany(id: string): Promise<void> {
  store.companies = store.companies.filter((row) => row.id !== id);
  await persist();
  emit();
  const client = getSupabase();
  if (!client) return;
  await client.from('client_companies').update({ deleted_at: new Date().toISOString() }).eq('id', id);
}

function resolveTenantForInstall(installId: string): string {
  const prior = [...store.licenses]
    .filter((row) => row.installId === installId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  for (const row of prior) {
    const tid = row.tenantId?.trim();
    if (tid) return tid;
  }
  return newId();
}

export async function listLicenses(): Promise<LicenseRow[]> {
  const rows = [...store.licenses].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      activationCode: await buildActivationCode(row),
    })),
  );
}

export async function createLicense(input: {
  name: string;
  installId: string;
  plan: LicensePlan;
  notes?: string | null;
  phone?: string | null;
}): Promise<LicenseRow> {
  const name = input.name.trim();
  const installId = input.installId.trim().toUpperCase();
  if (!name) throw new Error('Name is required');
  if (!installId) throw new Error('Install ID is required');
  if (!['monthly', 'yearly', 'forever'].includes(input.plan)) {
    throw new Error('Invalid plan');
  }
  const activatedAt = todayIsoDate();
  let expiresAt: string | null = null;
  if (input.plan === 'monthly') expiresAt = addMonthsIso(activatedAt, 1);
  if (input.plan === 'yearly') expiresAt = addMonthsIso(activatedAt, 12);
  const now = new Date().toISOString();
  const row: Omit<LicenseRow, 'activationCode'> = {
    id: newId(),
    name,
    installId,
    plan: input.plan,
    activatedAt,
    expiresAt,
    notes: input.notes?.trim() || null,
    phone: input.phone?.trim() || null,
    tenantId: resolveTenantForInstall(installId),
    createdAt: now,
  };
  store.licenses.unshift(row);
  await persist();
  emit();
  void pushLicense(row);
  return { ...row, activationCode: await buildActivationCode(row) };
}

export async function deleteLicense(id: string): Promise<void> {
  store.licenses = store.licenses.filter((row) => row.id !== id);
  await persist();
  emit();
  const client = getSupabase();
  if (!client) return;
  await client.from('licenses').update({ deleted_at: new Date().toISOString() }).eq('id', id);
}

async function pullCloud(): Promise<void> {
  const client = getSupabase();
  if (!client) return;
  try {
    const { data: companies } = await client
      .from('client_companies')
      .select('id, company_name, area, joined_at, notes, is_active, created_at, updated_at')
      .is('deleted_at', null)
      .order('company_name');
    if (companies?.length) {
      store.companies = companies.map((row) => ({
        id: String(row.id),
        companyName: String(row.company_name),
        area: String(row.area),
        joinedAt: String(row.joined_at),
        notes: row.notes ? String(row.notes) : null,
        isActive: Boolean(row.is_active),
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      }));
    }
    const { data: licenses } = await client
      .from('licenses')
      .select('id, name, install_id, plan, activated_at, expires_at, notes, phone, created_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (licenses?.length) {
      store.licenses = licenses.map((row) => ({
        id: String(row.id),
        name: String(row.name),
        installId: String(row.install_id),
        plan: row.plan as LicensePlan,
        activatedAt: String(row.activated_at),
        expiresAt: row.expires_at ? String(row.expires_at) : null,
        notes: row.notes ? String(row.notes) : null,
        phone: row.phone ? String(row.phone) : null,
        tenantId: null,
        createdAt: String(row.created_at),
      }));
    }
    if (companies?.length || licenses?.length) {
      await persist();
    }
  } catch {
    /* keep local */
  }
}

async function pushCompany(row: ClientCompany): Promise<void> {
  const client = getSupabase();
  if (!client) return;
  await client.from('client_companies').upsert({
    id: row.id,
    company_name: row.companyName,
    area: row.area,
    joined_at: row.joinedAt,
    notes: row.notes,
    is_active: row.isActive,
    deleted_at: null,
    updated_at: row.updatedAt,
  });
}

async function pushLicense(row: Omit<LicenseRow, 'activationCode'>): Promise<void> {
  const client = getSupabase();
  if (!client) return;
  await client.from('licenses').upsert({
    id: row.id,
    name: row.name,
    install_id: row.installId,
    plan: row.plan,
    activated_at: row.activatedAt,
    expires_at: row.expiresAt,
    notes: row.notes,
    phone: row.phone,
    deleted_at: null,
  });
}
