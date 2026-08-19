import AsyncStorage from '@react-native-async-storage/async-storage';
import bcrypt from 'bcryptjs';

import { newId } from '@/lib/id';
import {
  ACCOUNTANT_CODES,
  CASHIER_CODES,
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
  if (adminRole) {
    const missing = shopAdminCodes().filter((code) => !adminRole.permissionCodes.includes(code));
    if (missing.length) {
      adminRole.permissionCodes = [...adminRole.permissionCodes, ...missing];
      changed = true;
    }
  }
  const superRole = store.roles.find((role) => role.name === 'Super Admin');
  const adminUser = store.users.find((user) => user.username === 'admin');
  if (superRole && adminUser && adminUser.roleId !== superRole.id) {
    adminUser.roleId = superRole.id;
    adminUser.isActive = true;
    changed = true;
  }
  if (superRole && !adminUser) {
    store.users.push({
      id: newId(),
      username: 'admin',
      passwordHash: await bcrypt.hash('admin123', 10),
      fullName: 'Super Admin',
      roleId: superRole.id,
      isActive: true,
    });
    changed = true;
  }
  if (session) {
    const current = store.users.find((user) => user.id === session?.id);
    session = current ? toSession(current) : null;
  }
  if (changed) await persist();
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
    if (session && !store.users.some((user) => user.id === session?.id && user.isActive)) {
      session = null;
      await AsyncStorage.removeItem(SESSION_KEY);
    }
    await ensureVendorRbac();
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
  emit();
}

export async function signOut(): Promise<void> {
  session = null;
  await AsyncStorage.removeItem(SESSION_KEY);
  emit();
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
  await persist();
  emit();
}
