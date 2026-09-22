import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';

export type Locale = 'en' | 'ur';

type Dict = Record<string, string>;

const KEY = 'agrisoft.locale';

const en: Dict = {
  'lang.english': 'English',
  'lang.urdu': 'Urdu',
  'lang.switch': 'Language',
  'brand.name': 'Agri Soft Pro',
  'topbar.logout': 'Logout',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.view': 'View',
  'common.export': 'Export',
  'common.search': 'Search',
  'common.share': 'Share',
  'common.notes': 'Notes',
  'nav.overview': 'Overview',
  'nav.sales': 'Sales',
  'nav.purchases': 'Purchases',
  'nav.catalog': 'Catalog',
  'nav.parties': 'Parties',
  'nav.transactions': 'Transactions',
  'nav.ledgers': 'Ledgers',
  'nav.reports': 'Reports',
  'nav.setup': 'Setup',
  'nav.dashboard': 'Dashboard',
  'nav.sale': 'Sale',
  'nav.saleReturn': 'Sale return',
  'nav.purchase': 'Purchase',
  'nav.purchaseReturn': 'Purchase return',
  'nav.units': 'Units',
  'nav.categories': 'Categories',
  'nav.products': 'Products',
  'nav.inventory': 'Inventory',
  'nav.customers': 'Customers',
  'nav.vendors': 'Vendors',
  'nav.receivePayment': 'Receive payment',
  'nav.makePayment': 'Make payment',
  'nav.expense': 'Expense',
  'nav.ownerDraw': 'Owner draw',
  'nav.income': 'Income',
  'nav.accountsLedger': 'Accounts ledger',
  'nav.customerLedger': 'Customer ledger',
  'nav.vendorLedger': 'Vendor ledger',
  'nav.expenseLedger': 'Expense ledger',
  'nav.incomeLedger': 'Income ledger',
  'nav.salesReport': 'Sales report',
  'nav.purchaseReport': 'Purchase report',
  'nav.profitLoss': 'Profit & loss',
  'nav.stockReport': 'Stock report',
  'nav.taxReport': 'Tax report',
  'nav.deletedData': 'Deleted',
  'nav.taxes': 'Taxes',
  'nav.discounts': 'Discounts',
  'nav.additions': 'Additions',
  'nav.users': 'Users & roles',
  'nav.changePassword': 'Update password',
  'nav.licenseInfo': 'License',
  'nav.backup': 'Backup',
  'nav.audit': 'Audit',
  'nav.settings': 'Settings',
  'nav.shop': 'Shop',
  'nav.licenses': 'Activated list',
  'nav.messages': 'Messages',
  'home.cash': 'Cash',
  'home.bank': 'Bank',
  'home.todaySales': 'Today sales',
  'home.todayPurchases': 'Today purchases',
  'home.customers': 'Customers',
  'home.lowStock': 'Low stock',
  'home.invoices': 'invoices',
  'home.bills': 'bills',
  'home.offline': 'Offline. Sales stay on this phone until the cloud is back.',
  'home.pending': 'Saved on this phone. Waiting to sync.',
  'home.synced': 'Synced',
  'login.signIn': 'Sign in',
  'login.create': 'Create account',
  'login.haveAccount': 'Already have an account? Sign in',
  'login.newPhone': 'New on this phone? Create account',
  'login.email': 'Email',
  'login.password': 'Password',
  'login.shopCode': 'Shop code',
  'login.wait': 'Please wait…',
  'settings.shop': 'Shop',
  'settings.sync': 'Sync',
  'settings.language': 'Language',
  'settings.save': 'Save settings',
  'settings.syncNow': 'Sync now',
  'settings.syncing': 'Syncing…',
  'payment.cash': 'Cash',
  'payment.bank': 'Bank',
  'payment.credit': 'Credit',
  'payment.split': 'Cash + Bank',
};

const ur: Dict = {
  'lang.english': 'English',
  'lang.urdu': 'اردو',
  'lang.switch': 'زبان',
  'brand.name': 'ایگری سوفٹ پرو',
  'topbar.logout': 'لاگ آؤٹ',
  'common.save': 'محفوظ کریں',
  'common.cancel': 'منسوخ',
  'common.delete': 'حذف',
  'common.edit': 'ترمیم',
  'common.view': 'دیکھیں',
  'common.export': 'ایکسپورٹ',
  'common.search': 'تلاش',
  'common.share': 'شیئر',
  'common.notes': 'نوٹس',
  'nav.overview': 'جائزہ',
  'nav.sales': 'فروخت',
  'nav.purchases': 'خریداری',
  'nav.catalog': 'کیٹلاگ',
  'nav.parties': 'پارٹیز',
  'nav.transactions': 'لین دین',
  'nav.ledgers': 'کھاتہ',
  'nav.reports': 'رپورٹس',
  'nav.setup': 'سیٹ اپ',
  'nav.dashboard': 'ڈیش بورڈ',
  'nav.sale': 'سیل',
  'nav.saleReturn': 'سیل واپسی',
  'nav.purchase': 'پرچیز',
  'nav.purchaseReturn': 'پرچیز واپسی',
  'nav.units': 'یونٹس',
  'nav.categories': 'کیٹگریز',
  'nav.products': 'پروڈکٹس',
  'nav.inventory': 'انوینٹری',
  'nav.customers': 'کسٹمرز',
  'nav.vendors': 'وینڈرز',
  'nav.receivePayment': 'رقم وصولی',
  'nav.makePayment': 'رقم ادائیگی',
  'nav.expense': 'خرچہ',
  'nav.ownerDraw': 'مالک کی رقم',
  'nav.income': 'آمدنی',
  'nav.accountsLedger': 'اکاؤنٹس لیجر',
  'nav.customerLedger': 'کسٹمر لیجر',
  'nav.vendorLedger': 'وینڈر لیجر',
  'nav.expenseLedger': 'خرچہ لیجر',
  'nav.incomeLedger': 'آمدنی لیجر',
  'nav.salesReport': 'سیل رپورٹ',
  'nav.purchaseReport': 'پرچیز رپورٹ',
  'nav.profitLoss': 'منافع و نقصان',
  'nav.stockReport': 'اسٹاک رپورٹ',
  'nav.taxReport': 'ٹیکس رپورٹ',
  'nav.deletedData': 'حذف شدہ',
  'nav.taxes': 'ٹیکسز',
  'nav.discounts': 'ڈسکاؤنٹس',
  'nav.additions': 'اضافات',
  'nav.users': 'صارفین',
  'nav.changePassword': 'پاس ورڈ تبدیل کریں',
  'nav.licenseInfo': 'لائسنس',
  'nav.backup': 'بیک اپ',
  'nav.audit': 'آڈٹ',
  'nav.settings': 'ترتیبات',
  'nav.shop': 'دکان',
  'nav.licenses': 'فعال فہرست',
  'nav.messages': 'پیغامات',
  'home.cash': 'نقد',
  'home.bank': 'بینک',
  'home.todaySales': 'آج کی فروخت',
  'home.todayPurchases': 'آج کی خریداری',
  'home.customers': 'کسٹمرز',
  'home.lowStock': 'کم اسٹاک',
  'home.invoices': 'انوائس',
  'home.bills': 'بل',
  'home.offline': 'آف لائن۔ سیل اس فون پر رہیں گی جب تک کلاؤڈ واپس نہ آئے۔',
  'home.pending': 'اس فون پر محفوظ۔ سنک کا انتظار۔',
  'home.synced': 'سنک ہو گیا',
  'login.signIn': 'سائن ان',
  'login.create': 'اکاؤنٹ بنائیں',
  'login.haveAccount': 'اکاؤنٹ ہے؟ سائن ان',
  'login.newPhone': 'اس فون پر نئے ہیں؟ اکاؤنٹ بنائیں',
  'login.email': 'ای میل',
  'login.password': 'پاس ورڈ',
  'login.shopCode': 'شاپ کوڈ',
  'login.wait': 'انتظار کریں…',
  'settings.shop': 'دکان',
  'settings.sync': 'سنک',
  'settings.language': 'زبان',
  'settings.save': 'ترتیبات محفوظ کریں',
  'settings.syncNow': 'ابھی سنک',
  'settings.syncing': 'سنک ہو رہا ہے…',
  'payment.cash': 'نقد',
  'payment.bank': 'بینک',
  'payment.credit': 'ادھار',
  'payment.split': 'نقد + بینک',
};

const dicts: Record<Locale, Dict> = { en, ur };

const NAV_KEYS: Record<string, string> = {
  Overview: 'nav.overview',
  Sales: 'nav.sales',
  Purchases: 'nav.purchases',
  Catalog: 'nav.catalog',
  Parties: 'nav.parties',
  Transactions: 'nav.transactions',
  Ledgers: 'nav.ledgers',
  Reports: 'nav.reports',
  Settings: 'nav.settings',
  Dashboard: 'nav.dashboard',
  Sale: 'nav.sale',
  'Sale return': 'nav.saleReturn',
  Purchase: 'nav.purchase',
  'Purchase return': 'nav.purchaseReturn',
  Units: 'nav.units',
  Categories: 'nav.categories',
  Products: 'nav.products',
  Inventory: 'nav.inventory',
  Customers: 'nav.customers',
  Customer: 'nav.customers',
  Product: 'nav.products',
  Vendors: 'nav.vendors',
  'Receive payment': 'nav.receivePayment',
  'Make payment': 'nav.makePayment',
  Expense: 'nav.expense',
  'Owner draw': 'nav.ownerDraw',
  Income: 'nav.income',
  Accounts: 'nav.accountsLedger',
  'Sales report': 'nav.salesReport',
  'Purchase report': 'nav.purchaseReport',
  'Profit & loss': 'nav.profitLoss',
  'Stock report': 'nav.stockReport',
  'Tax report': 'nav.taxReport',
  Deleted: 'nav.deletedData',
  Taxes: 'nav.taxes',
  Discounts: 'nav.discounts',
  Additions: 'nav.additions',
  'Users & roles': 'nav.users',
  'Update password': 'nav.changePassword',
  License: 'nav.licenseInfo',
  Backup: 'nav.backup',
  Audit: 'nav.audit',
  Shop: 'nav.shop',
  'Activated list': 'nav.licenses',
  Messages: 'nav.messages',
  'Accounts ledger': 'nav.accountsLedger',
  'Customer ledger': 'nav.customerLedger',
  'Vendor ledger': 'nav.vendorLedger',
  'Expense ledger': 'nav.expenseLedger',
  'Income ledger': 'nav.incomeLedger',
};

let locale: Locale = 'en';
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

export function getLocale() {
  return locale;
}

export function t(key: string) {
  return dicts[locale][key] ?? dicts.en[key] ?? key;
}

export function tNav(label: string) {
  const key = NAV_KEYS[label];
  return key ? t(key) : label;
}

export function isUrdu() {
  return locale === 'ur';
}

export async function hydrateLocale() {
  const saved = await AsyncStorage.getItem(KEY);
  if (saved === 'ur' || saved === 'en') locale = saved;
  I18nManager.allowRTL(locale === 'ur');
}

export async function setLocale(next: Locale) {
  locale = next;
  await AsyncStorage.setItem(KEY, next);
  I18nManager.allowRTL(next === 'ur');
  emit();
}

export function subscribeLocale(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
