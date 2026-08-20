import { NamedMaster } from '@/components/NamedMaster';
import { listCategories, upsertNamed } from '@/lib/erp';

export default function CategoriesScreen() {
  return (
    <NamedMaster
      permission="products.view"
      managePermission="products.manage"
      title="Category"
      load={async () => listCategories().map((r) => ({ id: r.id, name: r.name, is_active: r.isActive }))}
      onCreate={(name) => upsertNamed('categories', { name })}
    />
  );
}
