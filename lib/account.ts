import AsyncStorage from '@react-native-async-storage/async-storage';

type AccountState = {
  signedIn: boolean;
  name: string;
};

const STORAGE_KEY = 'agrisoft.account';

let state: AccountState = {
  signedIn: false,
  name: 'Shop staff',
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function persist() {
  void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export async function hydrateAccount(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<AccountState>;
    state = {
      signedIn: Boolean(parsed.signedIn),
      name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : 'Shop staff',
    };
    emit();
  } catch {
    /* keep defaults */
  }
}

export function getAccount(): AccountState {
  return state;
}

export function signIn(name: string) {
  const trimmed = name.trim() || 'Shop staff';
  state = { signedIn: true, name: trimmed };
  persist();
  emit();
}

export function signOut() {
  state = { ...state, signedIn: false };
  persist();
  emit();
}

export function subscribeAccount(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
