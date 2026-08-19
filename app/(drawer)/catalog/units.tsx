import { NamedMaster } from '@/components/NamedMaster';
import { createUnit, fetchUnits } from '@/lib/shopData';

export default function UnitsScreen() {
  return (
    <NamedMaster
      permission="products.view"
      managePermission="products.manage"
      title="Unit"
      load={fetchUnits}
      onCreate={(name) => createUnit(name, name.slice(0, 6))}
      subtitle={(row) => row.short_name || ''}
    />
  );
}
