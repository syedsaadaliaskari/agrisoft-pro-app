export type Tenant = {
  id: string;
  name: string;
  slug: string | null;
  is_active: boolean | null;
};

export type Customer = {
  id: string;
  tenant_id: string;
  code: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  opening_balance: number | string | null;
  balance_type: string | null;
  credit_limit: number | string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};
