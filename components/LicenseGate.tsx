import { usePathname, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { shopLicenseAllowed, subscribeDeviceLicense } from '@/lib/deviceLicense';
import { endShopSession, getSession, subscribeSession } from '@/lib/rbac';
import { isVendorUnlocked, subscribeVendorUnlock } from '@/lib/vendorUnlock';

/** Shop admin and staff leave the app when the trial ends. Super Admin does not. */
export function LicenseGate() {
  const pathname = usePathname();
  const router = useRouter();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const stopLicense = subscribeDeviceLicense(() => setTick((n) => n + 1));
    const stopVendor = subscribeVendorUnlock(() => setTick((n) => n + 1));
    const stopSession = subscribeSession(() => setTick((n) => n + 1));
    return () => {
      stopLicense();
      stopVendor();
      stopSession();
    };
  }, []);

  useEffect(() => {
    let cancel = false;
    const onActivate = pathname === '/activate';
    void (async () => {
      if (isVendorUnlocked()) {
        if (onActivate && !cancel) router.replace(getSession() ? '/' : '/login');
        return;
      }
      if (!shopLicenseAllowed()) {
        if (getSession()) await endShopSession();
        if (!onActivate && !cancel) router.replace('/activate');
        return;
      }
      if (onActivate && !cancel) router.replace(getSession() ? '/' : '/login');
    })();
    return () => {
      cancel = true;
    };
  }, [pathname, router, tick]);

  return null;
}
