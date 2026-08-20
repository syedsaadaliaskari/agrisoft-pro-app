type SyncSnapshot = {
  lastRefreshAt: string | null;
  lastError: string | null;
  customerCount: number | null;
  productCount: number | null;
  saleCount: number | null;
};

let snapshot: SyncSnapshot = {
  lastRefreshAt: null,
  lastError: null,
  customerCount: null,
  productCount: null,
  saleCount: null,
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function getSyncStatus(): SyncSnapshot {
  return snapshot;
}

export function markRefreshSuccess(update: {
  customerCount?: number;
  productCount?: number;
  saleCount?: number;
}) {
  snapshot = {
    lastRefreshAt: new Date().toISOString(),
    lastError: null,
    customerCount: update.customerCount ?? snapshot.customerCount,
    productCount: update.productCount ?? snapshot.productCount,
    saleCount: update.saleCount ?? snapshot.saleCount,
  };
  emit();
}

export function markRefreshError(message: string) {
  snapshot = {
    ...snapshot,
    lastError: message,
  };
  emit();
}

export function subscribeSyncStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
