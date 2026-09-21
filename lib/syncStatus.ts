import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_KEY = 'agrisoft.sync.pendingPush';

type SyncSnapshot = {
  lastRefreshAt: string | null;
  lastError: string | null;
  isOffline: boolean;
  pendingPush: boolean;
  customerCount: number | null;
  productCount: number | null;
  saleCount: number | null;
};

let snapshot: SyncSnapshot = {
  lastRefreshAt: null,
  lastError: null,
  isOffline: false,
  pendingPush: false,
  customerCount: null,
  productCount: null,
  saleCount: null,
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function persistPending(pending: boolean) {
  void (pending ? AsyncStorage.setItem(PENDING_KEY, '1') : AsyncStorage.removeItem(PENDING_KEY));
}

export function getSyncStatus(): SyncSnapshot {
  return snapshot;
}

export async function hydrateSyncStatus() {
  const pending = await AsyncStorage.getItem(PENDING_KEY);
  if (pending === '1') {
    snapshot = { ...snapshot, pendingPush: true };
  }
}

export function markPendingPush() {
  snapshot = { ...snapshot, pendingPush: true };
  persistPending(true);
  emit();
}

export function markOffline() {
  snapshot = {
    ...snapshot,
    isOffline: true,
    lastError: null,
  };
  emit();
}

export function markRefreshSuccess(update: {
  customerCount?: number;
  productCount?: number;
  saleCount?: number;
}) {
  snapshot = {
    lastRefreshAt: new Date().toISOString(),
    lastError: null,
    isOffline: false,
    pendingPush: false,
    customerCount: update.customerCount ?? snapshot.customerCount,
    productCount: update.productCount ?? snapshot.productCount,
    saleCount: update.saleCount ?? snapshot.saleCount,
  };
  persistPending(false);
  emit();
}

export function markRefreshError(message: string) {
  const offline = /offline/i.test(message);
  snapshot = {
    ...snapshot,
    isOffline: offline || snapshot.isOffline,
    lastError: offline ? null : message,
  };
  emit();
}

export function subscribeSyncStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
