import { useLocalSearchParams } from 'expo-router';

import { ProductForm } from '@/components/ProductForm';

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ProductForm productId={id} />;
}
