export type ActionSheetOption = {
  label: string;
  onPress: () => void;
  danger?: boolean;
};

export type ActionSheetState = {
  title: string;
  message?: string;
  options: ActionSheetOption[];
} | null;

let current: ActionSheetState = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function getActionSheet(): ActionSheetState {
  return current;
}

export function showActionSheet(next: Exclude<ActionSheetState, null>) {
  current = next;
  emit();
}

export function hideActionSheet() {
  current = null;
  emit();
}

export function subscribeActionSheet(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
