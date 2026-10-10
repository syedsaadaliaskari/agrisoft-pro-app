import AsyncStorage from '@react-native-async-storage/async-storage';
import bcrypt from 'bcryptjs';

import { newId } from '@/lib/id';
import {
  ACCOUNTANT_CODES,
  CASHIER_CODES,
  hasPermission,
  isShopPermission,
  isSuperAdminUser,
  PERMISSION_CATALOG,
  type SessionUser,
} from '@/lib/permissions';

export type RoleRow = {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissionCodes: string[];
};

export type UserRow = {
  id: string;
  username: string;
  passwordHash: string;
  fullName: string;
  roleId: string;
  isActive: boolean;
  email?: string | null;
  updatedAt?: string;
  fromCloud?: boolean;
  passwordPending?: boolean;
};

type Store = {
  roles: RoleRow[];
  users: UserRow[];
};

const STORAGE_KEY = 'agrisoft.rbac';
const SESSION_KEY = 'agrisoft.session';

let store: Store = { roles: [], users: [] };
let session: SessionUser | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

async function persist() {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function shopAdminCodes(): string[] {
  return PERMISSION_CATALOG.filter((row) => isShopPermission(row.code)).map((row) => row.code);
}

function allCodes(): string[] {
  return PERMISSION_CATALOG.map((row) => row.code);
}

function seedStore(): Store {
  const superId = newId();
  const adminId = newId();
  const cashierId = newId();
  const accountantId = newId();
  return {
    roles: [
      {
        id: superId,
        name: 'Super Admin',
        description: 'Vendor console — companies, licenses, users',
        isSystem: true,
        permissionCodes: allCodes(),
      },
      {
        id: adminId,
        name: 'Admin',
        description: 'Full shop ops',
        isSystem: true,
        permissionCodes: shopAdminCodes(),
      },
      {
        id: cashierId,
        name: 'Cashier',
        description: 'Sales and basic views',
        isSystem: true,
        permissionCodes: [...CASHIER_CODES],
      },
      {
        id: accountantId,
        name: 'Accountant',
        description: 'Ledgers and reports',
        isSystem: true,
        permissionCodes: [...ACCOUNTANT_CODES],
      },
    ],
    users: [],
  };
}

async function ensureVendorRbac(): Promise<void> {
  let changed = false;
  if (!store.roles.some((role) => role.name === 'Super Admin')) {
    store.roles.unshift({
      id: newId(),
      name: 'Super Admin',
      description: 'Vendor console — companies, licenses, users',
      isSystem: true,
      permissionCodes: allCodes(),
    });
    changed = true;
  }
  for (const role of store.roles) {
    if (role.name === 'Super Admin') {
      const next = allCodes();
      if (role.permissionCodes.join() !== next.join()) {
        role.permissionCodes = next;
        changed = true;
      }
      continue;
    }
    const next = role.permissionCodes.filter(isShopPermission);
    if (next.length !== role.permissionCodes.length) {
      role.permissionCodes = next;
      changed = true;
    }
  }
  const adminRole = store.roles.find((role) => role.name === 'Admin');
  if (adminRole && adminRole.permissionCodes.length === 0) {
    adminRole.permissionCodes = shopAdminCodes();
    changed = true;
  }
  const cashierRole = store.roles.find((role) => role.name === 'Cashier');
  if (cashierRole && cashierRole.permissionCodes.length === 0) {
    cashierRole.permissionCodes = [...CASHIER_CODES];
    changed = true;
  }
  const accountantRole = store.roles.find((role) => role.name === 'Accountant');
  if (accountantRole && accountantRole.permissionCodes.length === 0) {
    accountantRole.permissionCodes = [...ACCOUNTANT_CODES];
    changed = true;
  }
  const { isVendorUnlocked } = await import('@/lib/vendorUnlock');
  const superRole = store.roles.find((role) => role.name === 'Super Admin');
  const adminRoleForDemote = store.roles.find((role) => role.name === 'Admin');
  const adminUser = store.users.find((user) => user.username === 'admin');
  if (superRole && adminRoleForDemote && adminUser && adminUser.roleId === superRole.id && !isVendorUnlocked()) {
    adminUser.roleId = adminRoleForDemote.id;
    changed = true;
  }
  if (adminRole && !store.users.some((user) => user.username === 'shop')) {
    store.users.push({
      id: newId(),
      username: 'shop',
      passwordHash: await bcrypt.hash('admin123', 10),
      fullName: 'Shop Administrator',
      roleId: adminRole.id,
      isActive: true,
    });
    changed = true;
  }
  if (session && !session.id.startsWith('cloud:')) {
    const current = store.users.find((user) => user.id === session?.id);
    if (current) session = toSession(current);
  }
  if (changed) await persist();
}

export async function applyVendorConsoleSession(): Promise<void> {
  if (!session) throw new Error("Couldn't unlock.");
  const superRole = store.roles.find((role) => role.name === 'Super Admin');
  if (!superRole) throw new Error("Couldn't unlock.");
  session = {
    ...session,
    roleId: superRole.id,
    roleName: superRole.name,
    permissions: superRole.permissionCodes,
  };
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  emit();
}

export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSession(): SessionUser | null {
  return session;
}

export function needsAdminSetup(): boolean {
  return store.users.filter((user) => user.isActive).length === 0;
}

export async function hydrateRbac(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    store = raw ? (JSON.parse(raw) as Store) : seedStore();
    if (!store.roles?.length) store = seedStore();
    if (!raw) await persist();
    const sessionRaw = await AsyncStorage.getItem(SESSION_KEY);
    session = sessionRaw ? (JSON.parse(sessionRaw) as SessionUser) : null;
    if (session && !session.id.startsWith('cloud:') && !store.users.some((user) => user.id === session?.id && user.isActive)) {
      session = null;
      await AsyncStorage.removeItem(SESSION_KEY);
    }
    await ensureVendorRbac();
    const { isVendorUnlocked } = await import('@/lib/vendorUnlock');
    if (isVendorUnlocked() && session) {
      await applyVendorConsoleSession();
    }
    emit();
  } catch {
    store = seedStore();
    session = null;
    try {
      await ensureVendorRbac();
    } catch {
      /* keep empty */
    }
    emit();
  }
}

function toSession(user: UserRow): SessionUser {
  const role = store.roles.find((row) => row.id === user.roleId);
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    roleId: user.roleId,
    roleName: role?.name ?? 'Staff',
    permissions: role?.permissionCodes ?? [],
  };
}

export async function createFirstAdmin(input: {
  fullName: string;
  username: string;
  password: string;
}): Promise<void> {
  if (!needsAdminSetup()) {
    throw new Error('An admin already exists.');
  }
  const username = input.username.trim().toLowerCase();
  const fullName = input.fullName.trim();
  if (!username || !fullName || input.password.length < 4) {
    throw new Error('Name, username, and a password are required.');
  }
  const adminRole = store.roles.find((role) => role.name === 'Admin');
  if (!adminRole) throw new Error('Admin role is missing.');
  const user: UserRow = {
    id: newId(),
    username,
    passwordHash: await bcrypt.hash(input.password, 10),
    fullName,
    roleId: adminRole.id,
    isActive: true,
  };
  store.users.push(user);
  await persist();
  session = toSession(user);
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  emit();
}

export async function signInWithPassword(username: string, password: string): Promise<void> {
  const found = store.users.find(
    (user) => user.username === username.trim().toLowerCase() && user.isActive,
  );
  if (!found) {
    throw new Error('Wrong username or password.');
  }
  const ok = await bcrypt.compare(password, found.passwordHash);
  if (!ok) {
    throw new Error('Wrong username or password.');
  }
  session = toSession(found);
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  const { isVendorUnlocked } = await import('@/lib/vendorUnlock');
  if (isVendorUnlocked()) await applyVendorConsoleSession();
  else emit();
}

/** Shop staff who signed in with cloud email — Admin menus on this phone. */
export async function startCloudShopSession(email: string) {
  const adminRole = store.roles.find((role) => role.name === 'Admin');
  if (!adminRole) throw new Error('Admin role is missing.');
  const name = email.split('@')[0] || email;
  session = {
    id: `cloud:${email.trim().toLowerCase()}`,
    username: email.trim().toLowerCase(),
    fullName: nameFromEmail(name),
    roleId: adminRole.id,
    roleName: adminRole.name,
    permissions: adminRole.permissionCodes,
  };
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  const { isVendorUnlocked } = await import('@/lib/vendorUnlock');
  if (isVendorUnlocked()) await applyVendorConsoleSession();
  else emit();
}

function nameFromEmail(local: string) {
  return local.replace(/[._-]+/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase()) || 'Staff';
}

export async function signOut(): Promise<void> {
  session = null;
  await AsyncStorage.removeItem(SESSION_KEY);
  emit();
  try {
    const { signOutCloud } = await import('@/lib/cloudAuth');
    await signOutCloud();
  } catch {
    /* cloud sign-out is best-effort */
  }
}

/** Leave the shop screens when the trial ends. Shop books stay on the phone. */
export async function endShopSession(): Promise<void> {
  session = null;
  await AsyncStorage.removeItem(SESSION_KEY);
  emit();
  try {
    const { getSupabase } = await import('@/lib/supabase');
    const client = getSupabase();
    if (client) await client.auth.signOut();
  } catch {
    /* the lock still holds if cloud sign-out fails */
  }
}

export function listRoles(): RoleRow[] {
  return store.roles;
}

export function listUsers(): UserRow[] {
  return store.users;
}

export function rolesForEditor(): RoleRow[] {
  if (isSuperAdminUser(session)) return store.roles;
  return store.roles.filter((role) => role.name !== 'Super Admin');
}

export async function createUser(input: {
  fullName: string;
  username: string;
  password: string;
  roleId: string;
}): Promise<void> {
  const username = input.username.trim().toLowerCase();
  if (store.users.some((user) => user.username === username)) {
    throw new Error('That username is already used.');
  }
  const role = store.roles.find((row) => row.id === input.roleId);
  if (!role) {
    throw new Error('Choose a role.');
  }
  if (role.name === 'Super Admin' && !isSuperAdminUser(session)) {
    throw new Error('Only Super Admin can create Super Admin users.');
  }
  store.users.push({
    id: newId(),
    username,
    passwordHash: await bcrypt.hash(input.password, 10),
    fullName: input.fullName.trim(),
    roleId: input.roleId,
    isActive: true,
  });
  await persist();
  emit();
}

export async function setUserActive(userId: string, isActive: boolean): Promise<void> {
  const user = store.users.find((row) => row.id === userId);
  if (!user) return;
  const role = store.roles.find((row) => row.id === user.roleId);
  if (!isActive && role?.name === 'Super Admin' && !isSuperAdminUser(session)) {
    throw new Error('Only Super Admin can disable Super Admin users.');
  }
  if (!isActive && store.users.filter((row) => row.isActive).length <= 1) {
    throw new Error('Keep at least one active user.');
  }
  user.isActive = isActive;
  await persist();
  emit();
}

export async function setRolePermissions(roleId: string, permissionCodes: string[]): Promise<void> {
  const role = store.roles.find((row) => row.id === roleId);
  if (!role) return;
  if (role.name === 'Super Admin') {
    role.permissionCodes = allCodes();
  } else {
    const allowed = isSuperAdminUser(session)
      ? permissionCodes
      : permissionCodes.filter(isShopPermission);
    role.permissionCodes = allowed.filter((code) =>
      PERMISSION_CATALOG.some((row) => row.code === code),
    );
  }
  await persist();
  if (session?.roleId === roleId) {
    session = { ...session, permissions: role.permissionCodes };
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
  emit();
}

export async function changePassword(currentPassword: string, nextPassword: string): Promise<void> {
  if (!session) throw new Error('Sign in first.');
  if (nextPassword.length < 4) throw new Error('New password is too short.');
  const user = store.users.find((row) => row.id === session?.id);
  if (!user) throw new Error('User not found.');
  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) throw new Error('Current password is wrong.');
  user.passwordHash = await bcrypt.hash(nextPassword, 10);
  user.updatedAt = new Date().toISOString();
  if (user.fromCloud) user.passwordPending = true;
  await persist();
  emit();
}

function roleNameOf(user: UserRow) {
  return store.roles.find((role) => role.id === user.roleId)?.name ?? '';
}

async function replacePassword(user: UserRow, nextPassword: string) {
  user.passwordHash = await bcrypt.hash(nextPassword, 10);
  user.updatedAt = new Date().toISOString();
  if (user.fromCloud) user.passwordPending = true;
  await persist();
  emit();
}

/** Logged-out reset for one typed username. Does not return the old password. */
export async function resetForgottenPassword(input: {
  username: string;
  email?: string | null;
  newPassword: string;
}): Promise<void> {
  const username = input.username.trim().toLowerCase();
  const email = input.email?.trim().toLowerCase() || '';
  const newPassword = input.newPassword ?? '';
  if (!username) throw new Error('Enter the username');
  if (newPassword.length < 4) throw new Error('New password must be at least 4 characters');

  const user = store.users.find((row) => row.username === username && row.isActive);
  if (!user) throw new Error('No active account with that username');

  const roleName = roleNameOf(user);
  if (roleName === 'Super Admin') {
    throw new Error('This account cannot be reset from the login screen');
  }

  const savedEmail = user.email?.trim().toLowerCase() || '';
  if (roleName === 'Admin') {
    if (!savedEmail) {
      throw new Error(
        'This admin account has no email saved. A signed-in admin must add that email in Users before forgot password can be used.',
      );
    }
    if (email !== savedEmail) throw new Error('Email does not match this admin account');
  } else if (savedEmail && email !== savedEmail) {
    throw new Error('Email does not match this account');
  }

  await replacePassword(user, newPassword);
}

/** Signed-in admin sets one shop user's password. Cashier and accountant cannot call this. */
export async function setShopUserPassword(userId: string, newPassword: string): Promise<void> {
  if (!hasPermission(session, 'users.manage')) throw new Error('You cannot change that password.');
  if (newPassword.length < 4) throw new Error('New password must be at least 4 characters');
  const user = store.users.find((row) => row.id === userId);
  if (!user) throw new Error('User not found.');
  if (roleNameOf(user) === 'Super Admin') {
    throw new Error('This account cannot be reset from the login screen');
  }
  await replacePassword(user, newPassword);
}

export type CloudShopUser = {
  id: string;
  username: string;
  password_hash: string;
  full_name: string;
  email: string | null;
  role_id: string;
  is_active: boolean;
  updated_at: string;
};

function codesForRoleName(name: string): string[] {
  if (name === 'Cashier') return [...CASHIER_CODES];
  if (name === 'Accountant') return [...ACCOUNTANT_CODES];
  if (name === 'Super Admin') return allCodes();
  return shopAdminCodes();
}

function cloudIsOlder(localIso: string | undefined, cloudIso: string | undefined) {
  if (!localIso) return false;
  const local = Date.parse(localIso);
  const cloud = cloudIso ? Date.parse(cloudIso) : 0;
  if (Number.isNaN(local)) return false;
  if (Number.isNaN(cloud)) return true;
  return local >= cloud;
}

/** Pull shop users into this phone. A newer local password reset is kept. */
export async function mergeCloudShopUsers(input: {
  roles: { id: string; name: string }[];
  users: CloudShopUser[];
}): Promise<void> {
  for (const role of input.roles) {
    const name = role.name?.trim() || '';
    if (!name || name.toLowerCase() === 'super admin') continue;
    const sameName = store.roles.find((row) => row.name === name);
    if (sameName && sameName.id !== role.id) {
      for (const user of store.users) {
        if (user.roleId === sameName.id) user.roleId = role.id;
      }
      if (session?.roleId === sameName.id) session = { ...session, roleId: role.id };
      sameName.id = role.id;
    } else if (!store.roles.some((row) => row.id === role.id)) {
      store.roles.push({
        id: role.id,
        name,
        description: '',
        isSystem: true,
        permissionCodes: codesForRoleName(name),
      });
    }
  }

  for (const row of input.users) {
    const role = store.roles.find((item) => item.id === row.role_id);
    if (role?.name === 'Super Admin') continue;
    const username = row.username.trim().toLowerCase();
    if (!username || !row.password_hash) continue;
    let local = store.users.find((user) => user.id === row.id) ?? store.users.find((user) => user.username === username);
    if (!local) {
      store.users.push({
        id: row.id,
        username,
        passwordHash: row.password_hash,
        fullName: row.full_name?.trim() || username,
        roleId: row.role_id,
        isActive: Boolean(row.is_active),
        email: row.email,
        updatedAt: row.updated_at,
        fromCloud: true,
        passwordPending: false,
      });
      continue;
    }
    if (local.id !== row.id) {
      if (session?.id === local.id) session = session ? { ...session, id: row.id } : session;
      local.id = row.id;
    }
    const keepPassword = Boolean(local.passwordPending) && cloudIsOlder(local.updatedAt, row.updated_at);
    local.username = username;
    local.fullName = row.full_name?.trim() || local.fullName;
    local.email = row.email;
    local.roleId = row.role_id;
    local.isActive = Boolean(row.is_active);
    local.fromCloud = true;
    if (!keepPassword) {
      local.passwordHash = row.password_hash;
      local.updatedAt = row.updated_at;
      local.passwordPending = false;
    }
  }

  if (session && !session.id.startsWith('cloud:')) {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
  await persist();
  emit();
}

export function listPasswordPushes(): { id: string; passwordHash: string; updatedAt: string }[] {
  return store.users
    .filter((user) => user.fromCloud && user.passwordPending && user.passwordHash && user.updatedAt)
    .filter((user) => roleNameOf(user) !== 'Super Admin')
    .map((user) => ({
      id: user.id,
      passwordHash: user.passwordHash,
      updatedAt: user.updatedAt as string,
    }));
}

export async function markPasswordsPushed(ids: string[]): Promise<void> {
  const done = new Set(ids);
  let changed = false;
  for (const user of store.users) {
    if (done.has(user.id) && user.passwordPending) {
      user.passwordPending = false;
      changed = true;
    }
  }
  if (changed) await persist();
}
