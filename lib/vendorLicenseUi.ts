export type LicensePlan = 'monthly' | 'yearly' | 'forever';

export type CloudLicense = {
  id: string;
  name: string;
  phone: string;
  plan: LicensePlan;
  activatedAt: string;
  expiresAt: string | null;
  notes: string | null;
  installId: string;
  tenantId: string | null;
  updatedAt: string | null;
};

export function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function ymd(value: string | null | undefined): string | null {
  if (!value) return null;
  const slice = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(slice) ? slice : null;
}

export function licenseEnded(row: Pick<CloudLicense, 'plan' | 'expiresAt'>, today = todayIsoDate()): boolean {
  if (row.plan === 'forever' || !row.expiresAt) return false;
  return row.expiresAt < today;
}

export function licenseStatusLabel(row: Pick<CloudLicense, 'plan' | 'expiresAt'>, today = todayIsoDate()): 'Active' | 'Ended' {
  return licenseEnded(row, today) ? 'Ended' : 'Active';
}

export function licenseExpiresLabel(row: Pick<CloudLicense, 'plan' | 'expiresAt'>): string {
  if (row.plan === 'forever' || !row.expiresAt) return 'Never';
  return row.expiresAt;
}

export type LicenseListFilter = 'all' | 'active' | 'ended';

export function filterLicenses(rows: CloudLicense[], filter: LicenseListFilter): CloudLicense[] {
  if (filter === 'active') return rows.filter((row) => !licenseEnded(row));
  if (filter === 'ended') return rows.filter((row) => licenseEnded(row));
  return rows;
}

export type LicenseExportRow = {
  company: string;
  phone: string;
  plan: string;
  started: string;
  ends: string;
  status: string;
};

export function toLicenseExportRow(row: CloudLicense): LicenseExportRow {
  return {
    company: row.name,
    phone: row.phone,
    plan: row.plan,
    started: row.activatedAt,
    ends: licenseExpiresLabel(row),
    status: licenseStatusLabel(row),
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function activatedListPdfHtml(rows: LicenseExportRow[]): string {
  const body = rows
    .map(
      (row) => `<tr>
        <td>${escapeHtml(row.company)}</td>
        <td>${escapeHtml(row.phone)}</td>
        <td>${escapeHtml(row.plan)}</td>
        <td>${escapeHtml(row.started)}</td>
        <td>${escapeHtml(row.ends)}</td>
        <td>${escapeHtml(row.status)}</td>
      </tr>`,
    )
    .join('');
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Activated companies</title>
  <style>
    body { font-family: "Segoe UI", system-ui, sans-serif; color: #1a2330; padding: 24px; }
    h1 { font-size: 18px; margin: 0 0 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { text-align: left; background: #e9eef3; padding: 8px; border-bottom: 1px solid #d3dae3; }
    td { padding: 8px; border-bottom: 1px solid #d3dae3; }
  </style>
</head>
<body>
  <h1>Activated companies</h1>
  <table>
    <thead>
      <tr>
        <th>Company</th>
        <th>Phone</th>
        <th>Plan</th>
        <th>Start</th>
        <th>End</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>${body}</tbody>
  </table>
</body>
</html>`;
}
