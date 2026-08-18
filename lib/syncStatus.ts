type SyncSnapshot = {
  lastRefreshAt: string | null;
  lastError: string | null;
  customerCount: number | null;
};

let snapshot: SyncSnapshot = {
  lastRefreshAt: null,
  lastError: null,
  customerCount: null,
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function getSyncStatus(): SyncSnapshot {
  return snapshot;
}

export function markRefreshSuccess(customerCount: number) {
  snapshot = {
    lastRefreshAt: new Date().toISOString(),
    lastError: null,
    customerCount,
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
  return () => listeners.delete(listener);
}
