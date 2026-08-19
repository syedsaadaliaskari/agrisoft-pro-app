export const PERMISSION_CATALOG = [
  { code: 'dashboard.view', module: 'dashboard', description: 'View dashboard' },
  { code: 'products.view', module: 'products', description: 'View products' },
  { code: 'products.manage', module: 'products', description: 'Create/edit products' },
  { code: 'inventory.view', module: 'inventory', description: 'View inventory' },
  { code: 'inventory.manage', module: 'inventory', description: 'Adjust inventory' },
  { code: 'customers.view', module: 'customers', description: 'View customers' },
  { code: 'customers.manage', module: 'customers', description: 'Manage customers' },
  { code: 'vendors.view', module: 'vendors', description: 'View vendors' },
  { code: 'vendors.manage', module: 'vendors', description: 'Manage vendors' },
  { code: 'sales.view', module: 'sales', description: 'View sales' },
  { code: 'sales.create', module: 'sales', description: 'Create sales' },
  { code: 'sales.return', module: 'sales', description: 'Sale returns' },
  { code: 'purchases.view', module: 'purchases', description: 'View purchases' },
  { code: 'purchases.create', module: 'purchases', description: 'Create purchases' },
  { code: 'purchases.return', module: 'purchases', description: 'Purchase returns' },
  { code: 'ledgers.view', module: 'ledgers', description: 'View ledgers' },
  { code: 'reports.view', module: 'reports', description: 'View reports' },
  { code: 'settings.manage', module: 'settings', description: 'Manage settings' },
  { code: 'users.manage', module: 'users', description: 'Manage users & roles' },
  { code: 'license.manage', module: 'license', description: 'Activate Pro licenses' },
  { code: 'license.view', module: 'license', description: 'See activated companies' },
  { code: 'platform.view', module: 'platform', description: 'Client companies and area demand' },
] as const;

export type PermissionCode = (typeof PERMISSION_CATALOG)[number]['code'];

export type SessionUser = {
  id: string;
  username: string;
  fullName: string;
  roleId: string;
  roleName: string;
  permissions: string[];
};

const VENDOR_ONLY = new Set(['license.manage', 'license.view', 'platform.view']);

export function isShopPermission(code: string): boolean {
  return !VENDOR_ONLY.has(code);
}

export function isSuperAdminUser(user: SessionUser | null | undefined): boolean {
  return user?.roleName === 'Super Admin';
}

export const VENDOR_CONSOLE_PERMISSIONS = new Set([
  'dashboard.view',
  'license.manage',
  'license.view',
  'platform.view',
  'settings.manage',
  'users.manage',
]);

export function hasPermission(user: SessionUser | null | undefined, code: string): boolean {
  if (!user) return false;
  if (isSuperAdminUser(user)) return true;
  if (user.permissions.includes('*')) return true;
  return user.permissions.includes(code);
}

export function hasAnyPermission(user: SessionUser | null | undefined, codes: string[]): boolean {
  return codes.some((code) => hasPermission(user, code));
}

export function canAccessScreen(user: SessionUser | null | undefined, permission?: string): boolean {
  if (!user) return false;
  if (!permission) return true;
  if (isSuperAdminUser(user)) {
    return VENDOR_CONSOLE_PERMISSIONS.has(permission);
  }
  if (hasPermission(user, permission)) return true;
  if (permission === 'license.manage' && hasAnyPermission(user, ['license.manage', 'platform.view'])) {
    return true;
  }
  if (
    permission === 'license.view' &&
    hasAnyPermission(user, ['license.view', 'platform.view', 'license.manage'])
  ) {
    return true;
  }
  return false;
}

export const CASHIER_CODES = new Set([
  'dashboard.view',
  'products.view',
  'inventory.view',
  'customers.view',
  'customers.manage',
  'sales.view',
  'sales.create',
  'sales.return',
  'ledgers.view',
  'reports.view',
]);

export const ACCOUNTANT_CODES = new Set([
  'dashboard.view',
  'products.view',
  'inventory.view',
  'customers.view',
  'vendors.view',
  'sales.view',
  'purchases.view',
  'ledgers.view',
  'reports.view',
  'settings.manage',
]);
