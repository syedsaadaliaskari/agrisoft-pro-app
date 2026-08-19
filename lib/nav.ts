import { canAccessScreen, isSuperAdminUser, type SessionUser } from '@/lib/permissions';

export type NavAudience = 'shop' | 'platform' | 'both';

export type NavLeaf = {
  label: string;
  href: string;
  icon: string;
  permission?: string;
  audience?: NavAudience;
};

export type NavGroup = {
  title: string;
  icon: string;
  items: NavLeaf[];
};

export const shopNavigation: NavGroup[] = [
  {
    title: 'Overview',
    icon: 'grid-outline',
    items: [
      { label: 'Dashboard', href: '/', icon: 'grid-outline', permission: 'dashboard.view', audience: 'both' },
      {
        label: 'Activated list',
        href: '/platform/licenses',
        icon: 'key-outline',
        permission: 'license.view',
        audience: 'platform',
      },
    ],
  },
  {
    title: 'Sales',
    icon: 'cart-outline',
    items: [
      { label: 'Sale', href: '/sales', icon: 'cart-outline', permission: 'sales.view', audience: 'shop' },
      { label: 'Sale return', href: '/sales/returns', icon: 'return-down-back-outline', permission: 'sales.return', audience: 'shop' },
    ],
  },
  {
    title: 'Purchases',
    icon: 'bag-add-outline',
    items: [
      { label: 'Purchase', href: '/purchases', icon: 'bag-add-outline', permission: 'purchases.view', audience: 'shop' },
      { label: 'Purchase return', href: '/purchases/returns', icon: 'bag-remove-outline', permission: 'purchases.return', audience: 'shop' },
    ],
  },
  {
    title: 'Parties',
    icon: 'people-outline',
    items: [
      { label: 'Customers', href: '/parties/customers', icon: 'people-outline', permission: 'customers.view', audience: 'shop' },
      { label: 'Vendors', href: '/parties/vendors', icon: 'business-outline', permission: 'vendors.view', audience: 'shop' },
    ],
  },
  {
    title: 'Catalog',
    icon: 'cube-outline',
    items: [
      { label: 'Units', href: '/catalog/units', icon: 'resize-outline', permission: 'products.view', audience: 'shop' },
      { label: 'Categories', href: '/catalog/categories', icon: 'pricetags-outline', permission: 'products.view', audience: 'shop' },
      { label: 'Products', href: '/catalog/products', icon: 'cube-outline', permission: 'products.view', audience: 'shop' },
      { label: 'Inventory', href: '/catalog/inventory', icon: 'file-tray-stacked-outline', permission: 'inventory.view', audience: 'shop' },
    ],
  },
  {
    title: 'Ledgers',
    icon: 'book-outline',
    items: [
      { label: 'Accounts', href: '/ledgers/accounts', icon: 'book-outline', permission: 'ledgers.view', audience: 'shop' },
      { label: 'Customers', href: '/ledgers/customers', icon: 'person-outline', permission: 'ledgers.view', audience: 'shop' },
      { label: 'Vendors', href: '/ledgers/vendors', icon: 'business-outline', permission: 'ledgers.view', audience: 'shop' },
      { label: 'Expenses', href: '/ledgers/expenses', icon: 'wallet-outline', permission: 'ledgers.view', audience: 'shop' },
      { label: 'Income', href: '/ledgers/income', icon: 'trending-up-outline', permission: 'ledgers.view', audience: 'shop' },
    ],
  },
  {
    title: 'Reports',
    icon: 'stats-chart-outline',
    items: [
      { label: 'Sales report', href: '/reports/sales', icon: 'stats-chart-outline', permission: 'reports.view', audience: 'shop' },
      { label: 'Purchase report', href: '/reports/purchases', icon: 'stats-chart-outline', permission: 'reports.view', audience: 'shop' },
      { label: 'Profit & loss', href: '/reports/profit', icon: 'trending-up-outline', permission: 'reports.view', audience: 'shop' },
      { label: 'Stock report', href: '/reports/stock', icon: 'file-tray-stacked-outline', permission: 'reports.view', audience: 'shop' },
      { label: 'Tax report', href: '/reports/tax', icon: 'receipt-outline', permission: 'reports.view', audience: 'shop' },
      { label: 'Deleted', href: '/reports/deleted', icon: 'trash-outline', permission: 'reports.view', audience: 'shop' },
    ],
  },
  {
    title: 'Settings',
    icon: 'settings-outline',
    items: [
      {
        label: 'License',
        href: '/settings/license',
        icon: 'key-outline',
        permission: 'license.manage',
        audience: 'platform',
      },
      { label: 'Users & roles', href: '/settings/users', icon: 'shield-checkmark-outline', permission: 'users.manage', audience: 'both' },
      { label: 'Update password', href: '/settings/password', icon: 'lock-closed-outline', audience: 'both' },
      { label: 'Settings', href: '/settings', icon: 'settings-outline', permission: 'settings.manage', audience: 'platform' },
      { label: 'Shop', href: '/settings', icon: 'settings-outline', permission: 'settings.manage', audience: 'shop' },
    ],
  },
];

export function filterNavForUser(user: SessionUser | null): NavGroup[] {
  return shopNavigation
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        const audience = item.audience ?? 'shop';
        if (isSuperAdminUser(user)) {
          if (audience === 'shop') return false;
        } else if (audience === 'platform') {
          return false;
        }
        return canAccessScreen(user, item.permission);
      }),
    }))
    .filter((group) => group.items.length > 0);
}
