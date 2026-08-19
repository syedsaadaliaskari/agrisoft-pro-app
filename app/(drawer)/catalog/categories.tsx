import { NamedMaster } from '@/components/NamedMaster';
import { createCategory, fetchCategories } from '@/lib/shopData';

export default function CategoriesScreen() {
  return (
    <NamedMaster
      permission="products.view"
      managePermission="products.manage"
      title="Category"
      load={fetchCategories}
      onCreate={createCategory}
    />
  );
}
