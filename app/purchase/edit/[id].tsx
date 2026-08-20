import { useLocalSearchParams } from 'expo-router';

import { LineDocScreen } from '@/components/LineDocScreen';

export default function Screen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <LineDocScreen kind="purchase" editId={id} />;
}
