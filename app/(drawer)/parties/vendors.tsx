import { NamedMaster } from '@/components/NamedMaster';
import { createVendor, fetchVendors } from '@/lib/shopData';

export default function VendorsScreen() {
  return (
    <NamedMaster
      permission="vendors.view"
      managePermission="vendors.manage"
      title="Vendor"
      load={fetchVendors}
      onCreate={createVendor}
      subtitle={(row) => row.phone || row.city || ''}
    />
  );
}
