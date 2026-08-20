import { NamedMaster } from '@/components/NamedMaster';
import { listUnits, upsertNamed } from '@/lib/erp';

export default function UnitsScreen() {
  return (
    <NamedMaster
      permission="products.view"
      managePermission="products.manage"
      title="Unit"
      load={async () => listUnits().map((r) => ({ id: r.id, name: r.name, short_name: r.shortName, is_active: r.isActive }))}
      onCreate={(name) => upsertNamed('units', { name, shortName: name.slice(0, 6) })}
      subtitle={(row) => row.short_name || ''}
    />
  );
}
