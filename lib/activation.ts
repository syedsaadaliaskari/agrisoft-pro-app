/** Same vendor HMAC as desktop so codes unlock customer PCs. */
const ACTIVATION_HMAC_SECRET = 'agri-soft-pro-activation-v1';

export type LicensePlan = 'monthly' | 'yearly' | 'forever';

export type LicenseRow = {
  id: string;
  name: string;
  installId: string;
  plan: LicensePlan;
  activatedAt: string;
  expiresAt: string | null;
  notes: string | null;
  phone: string | null;
  tenantId: string | null;
  createdAt: string;
  activationCode: string;
};

type ActivationPayloadV1 = {
  v: 1;
  installId: string;
  name: string;
  plan: LicensePlan;
  activatedAt: string;
  expiresAt: string | null;
};

type ActivationPayloadV2 = {
  v: 2;
  installId: string;
  name: string;
  plan: LicensePlan;
  activatedAt: string;
  expiresAt: string | null;
  tenantId: string;
};

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function bytesToBase64Url(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0;
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;
    const triple = (a << 16) | (b << 8) | c;
    out += B64[(triple >> 18) & 63];
    out += B64[(triple >> 12) & 63];
    out += i + 1 < bytes.length ? B64[(triple >> 6) & 63] : '=';
    out += i + 2 < bytes.length ? B64[triple & 63] : '=';
  }
  return out.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmacSha256(message: string): Promise<Uint8Array> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("Couldn't sign the activation code on this device.");
  }
  const enc = new TextEncoder();
  const key = await subtle.importKey(
    'raw',
    enc.encode(ACTIVATION_HMAC_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await subtle.sign('HMAC', key, enc.encode(message));
  return new Uint8Array(sig);
}

export async function buildActivationCode(
  row: Pick<LicenseRow, 'installId' | 'name' | 'plan' | 'activatedAt' | 'expiresAt' | 'tenantId'>,
): Promise<string> {
  const tenantId = row.tenantId?.trim();
  const payload: ActivationPayloadV1 | ActivationPayloadV2 = tenantId
    ? {
        v: 2,
        installId: row.installId,
        name: row.name,
        plan: row.plan,
        activatedAt: row.activatedAt,
        expiresAt: row.expiresAt,
        tenantId,
      }
    : {
        v: 1,
        installId: row.installId,
        name: row.name,
        plan: row.plan,
        activatedAt: row.activatedAt,
        expiresAt: row.expiresAt,
      };
  const body = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = bytesToBase64Url(await hmacSha256(body)).slice(0, 24);
  return `ASP1.${body}.${sig}`;
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addMonthsIso(isoDate: string, months: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}
