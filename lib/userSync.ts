import { getMemberTenantId } from '@/lib/config';
import {
  listPasswordPushes,
  markPasswordsPushed,
  mergeCloudShopUsers,
  type CloudShopUser,
} from '@/lib/rbac';
import { getSupabase } from '@/lib/supabase';

/** Pull shop users and send pending password hashes. Shop books are not part of this. */
export async function syncShopUsers(): Promise<void> {
  const tenantId = getMemberTenantId();
  const client = getSupabase();
  if (!tenantId || !client) return;

  const pending = listPasswordPushes();
  const pushed: string[] = [];
  for (const row of pending) {
    const { error } = await client
      .from('users')
      .update({ password_hash: row.passwordHash, updated_at: row.updatedAt })
      .eq('id', row.id)
      .eq('tenant_id', tenantId);
    if (!error) pushed.push(row.id);
  }
  if (pushed.length) await markPasswordsPushed(pushed);

  const roles = await client.from('roles').select('id,name').eq('tenant_id', tenantId).is('deleted_at', null);
  const users = await client
    .from('users')
    .select('id,username,password_hash,full_name,email,role_id,is_active,updated_at')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null);
  if (roles.error || users.error) return;

  await mergeCloudShopUsers({
    roles: (roles.data ?? []) as { id: string; name: string }[],
    users: (users.data ?? []) as CloudShopUser[],
  });
}
