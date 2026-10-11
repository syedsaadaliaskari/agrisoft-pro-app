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

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(value: number, bits: number) {
  return (value >>> bits) | (value << (32 - bits));
}

function sha256(data: Uint8Array): Uint8Array {
  const bitLen = data.length * 8;
  const padded = new Uint8Array(((data.length + 9 + 63) >> 6) << 6);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000));
  view.setUint32(padded.length - 4, bitLen >>> 0);
  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;
  const w = new Uint32Array(64);
  for (let i = 0; i < padded.length; i += 64) {
    for (let t = 0; t < 16; t += 1) w[t] = view.getUint32(i + t * 4);
    for (let t = 16; t < 64; t += 1) {
      const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
    }
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;
    for (let t = 0; t < 64; t += 1) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = ((e & f) ^ (~e & g)) >>> 0;
      const t1 = (h + s1 + ch + SHA256_K[t] + w[t]) >>> 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const t2 = (s0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }
  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  [h0, h1, h2, h3, h4, h5, h6, h7].forEach((value, index) => outView.setUint32(index * 4, value));
  return out;
}

/** Works on the phone. The Android app does not have crypto.subtle. */
async function hmacSha256(message: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const rawKey = enc.encode(ACTIVATION_HMAC_SECRET);
  const key = rawKey.length > 64 ? sha256(rawKey) : rawKey;
  const msg = enc.encode(message);
  const blockKey = new Uint8Array(64);
  blockKey.set(key);
  const oKey = new Uint8Array(64);
  const iKey = new Uint8Array(64);
  for (let i = 0; i < 64; i += 1) {
    oKey[i] = blockKey[i] ^ 0x5c;
    iKey[i] = blockKey[i] ^ 0x36;
  }
  const inner = new Uint8Array(64 + msg.length);
  inner.set(iKey);
  inner.set(msg, 64);
  const innerHash = sha256(inner);
  const outer = new Uint8Array(64 + 32);
  outer.set(oKey);
  outer.set(innerHash, 64);
  return sha256(outer);
}

export type ActivationPayload = ActivationPayloadV1 | ActivationPayloadV2;

function base64UrlToBytes(value: string): Uint8Array {
  const pad = value.length % 4 === 0 ? '' : '='.repeat(4 - (value.length % 4));
  const std = value.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const binary = globalThis.atob(std);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Check a vendor code. The caller still matches it to this phone's Install ID. */
export async function readActivationPayload(rawCode: string): Promise<ActivationPayload> {
  const code = rawCode.trim().replace(/\s+/g, '');
  const parts = code.split('.');
  if (parts.length !== 3 || parts[0] !== 'ASP1') {
    throw new Error('Invalid activation code');
  }
  const [, body, sig] = parts;
  const expected = bytesToBase64Url(await hmacSha256(body)).slice(0, 24);
  if (sig !== expected) throw new Error('Invalid or tampered activation code');
  let payload: ActivationPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(body))) as ActivationPayload;
  } catch {
    throw new Error('Invalid activation code');
  }
  if ((payload?.v !== 1 && payload?.v !== 2) || !payload.installId || !payload.plan) {
    throw new Error('Invalid activation code');
  }
  if (!['monthly', 'yearly', 'forever'].includes(payload.plan)) {
    throw new Error('Invalid plan in activation code');
  }
  return payload;
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
