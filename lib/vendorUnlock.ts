import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'agrisoft.vendor_unlocked';
const EXPECTED = 'ASP-VENDOR-ONLY-316';

let unlocked = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

export function isVendorUnlocked() {
  return unlocked;
}

export function subscribeVendorUnlock(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function hydrateVendorUnlock() {
  unlocked = (await AsyncStorage.getItem(KEY)) === '1';
}

export async function unlockVendor(code: string) {
  if (code.trim() !== EXPECTED) {
    throw new Error("Couldn't unlock.");
  }
  unlocked = true;
  await AsyncStorage.setItem(KEY, '1');
  const { applyVendorConsoleSession } = await import('@/lib/rbac');
  await applyVendorConsoleSession();
  emit();
}
