import {
  getSettings,
  money,
  type PurchaseDoc,
  type ReturnDoc,
  type SaleDoc,
  type Voucher,
} from '@/lib/erp';
import { sharePdfFromHtml, showShareError } from '@/lib/shareOut';

export type ReceiptSize = 'thermal' | 'a4';

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function shop() {
  const s = getSettings();
  return {
    name: s.shop_name || 'Agri Soft Pro',
    address: s.shop_address || '',
    phone: s.shop_phone || '',
    footer: s.receipt_footer || 'Thank you for shopping with Agri Soft!',
    currency: s.currency_symbol || 'Rs',
  };
}

function baseStyles(size: ReceiptSize) {
  if (size === 'thermal') {
    return `* { box-sizing: border-box; }
      body { font-family: Arial, sans-serif; color: #111; margin: 0; padding: 10px; width: 280px; font-size: 11px; }
      h1 { font-size: 14px; margin: 0 0 2px; text-align: center; }
      .sub { text-align: center; font-size: 10px; color: #444; margin-bottom: 8px; }
      .meta div { display: flex; justify-content: space-between; margin: 2px 0; }
      table { width: 100%; border-collapse: collapse; }
      th { text-align: left; border-bottom: 1px solid #222; padding: 3px 1px; font-size: 10px; }
      td { padding: 4px 1px; border-bottom: 1px dashed #ccc; }
      .num { text-align: right; }
      .muted { color: #666; font-size: 9px; }
      .totals { margin-top: 8px; }
      .totals div { display: flex; justify-content: space-between; margin: 2px 0; }
      .grand { font-weight: 700; border-top: 1px solid #222; padding-top: 5px; margin-top: 5px; }
      .footer, .badge { text-align: center; margin-top: 10px; }
      @page { size: 80mm auto; margin: 4mm; }`;
  }
  return `* { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: #111; margin: 0; padding: 24px 28px; font-size: 13px; }
    .sheet { max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 16px; }
    .brand h1 { font-size: 22px; margin: 0 0 4px; }
    .sub { color: #444; font-size: 12px; }
    .doc-title { text-align: right; }
    .label { font-size: 11px; text-transform: uppercase; color: #555; }
    .no { font-size: 18px; font-weight: 700; margin-top: 4px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-bottom: 18px; }
    .k { color: #555; font-size: 11px; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; background: #f3f4f6; border: 1px solid #d1d5db; padding: 8px 10px; font-size: 11px; }
    td { border: 1px solid #e5e7eb; padding: 8px 10px; }
    .num { text-align: right; }
    .muted { color: #666; font-size: 11px; }
    .totals-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }
    .totals { width: 280px; }
    .totals div { display: flex; justify-content: space-between; margin: 4px 0; }
    .grand { font-weight: 700; border-top: 2px solid #111; padding-top: 8px; margin-top: 8px; }
    .footer { margin-top: 28px; text-align: center; color: #555; border-top: 1px dashed #ccc; padding-top: 12px; }
    @page { size: A4; margin: 12mm; }`;
}

function wrap(title: string, size: ReceiptSize, body: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>${esc(title)}</title><style>${baseStyles(size)}</style></head><body>${body}</body></html>`;
}

function shopHead(size: ReceiptSize) {
  const s = shop();
  const bits = `${esc(s.address)}${s.address && s.phone ? '<br/>' : ''}${esc(s.phone)}`;
  if (size === 'thermal') return `<h1>${esc(s.name)}</h1><div class="sub">${bits}</div>`;
  return `<div class="brand"><h1>${esc(s.name)}</h1><div class="sub">${bits}</div></div>`;
}

function moneyBits(n: number) {
  return money(n);
}

function lineRows(items: { productName: string; size?: string; color?: string; quantity: number; unitPrice: number; lineTotal: number }[]) {
  return items
    .map(
      (it) => `<tr>
      <td>${esc(it.productName)}<div class="muted">${esc([it.size, it.color].filter(Boolean).join(' / '))}</div></td>
      <td class="num">${it.quantity}</td>
      <td class="num">${it.unitPrice.toFixed(2)}</td>
      <td class="num">${it.lineTotal.toFixed(2)}</td>
    </tr>`,
    )
    .join('');
}

function totalsBlock(doc: { subtotal?: number; discountAmount?: number; additionAmount?: number; taxAmount?: number; grandTotal: number; paidAmount?: number }) {
  const paid = doc.paidAmount ?? 0;
  return `<div><span>Subtotal</span><span>${moneyBits(doc.subtotal ?? doc.grandTotal)}</span></div>
    <div><span>Discount</span><span>${moneyBits(doc.discountAmount ?? 0)}</span></div>
    <div><span>Additions</span><span>${moneyBits(doc.additionAmount ?? 0)}</span></div>
    <div><span>Tax</span><span>${moneyBits(doc.taxAmount ?? 0)}</span></div>
    <div class="grand"><span>Grand total</span><span>${moneyBits(doc.grandTotal)}</span></div>
    <div><span>Paid</span><span>${moneyBits(paid)}</span></div>
    <div><span>Balance</span><span>${moneyBits(doc.grandTotal - paid)}</span></div>`;
}

export function salePrintHtml(sale: SaleDoc, size: ReceiptSize = 'thermal') {
  const s = shop();
  const rows = lineRows(sale.items);
  const totals = totalsBlock(sale);
  if (size === 'thermal') {
    return wrap(
      sale.invoiceNo,
      size,
      `${shopHead(size)}<div class="badge">Sale invoice</div>
      <div class="meta">
        <div><span>Invoice</span><strong>${esc(sale.invoiceNo)}</strong></div>
        <div><span>Date</span><span>${esc(sale.invoiceDate)}</span></div>
        <div><span>Customer</span><span>${esc(sale.customerName || 'Walk-in')}</span></div>
        <div><span>Payment</span><span>${esc(sale.paymentMode)}</span></div>
      </div>
      <table><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amt</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="totals">${totals}</div>
      <div class="footer">${esc(sale.notes || s.footer)}</div>`,
    );
  }
  return wrap(
    sale.invoiceNo,
    size,
    `<div class="sheet"><div class="header">${shopHead(size)}<div class="doc-title"><div class="label">Sale invoice</div><div class="no">${esc(sale.invoiceNo)}</div></div></div>
      <div class="meta-grid">
        <div><div class="k">Date</div><div>${esc(sale.invoiceDate)}</div></div>
        <div><div class="k">Customer</div><div>${esc(sale.customerName || 'Walk-in')}</div></div>
        <div><div class="k">Payment</div><div>${esc(sale.paymentMode)}</div></div>
        <div><div class="k">Status</div><div>${esc(sale.status)}</div></div>
      </div>
      <table><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="totals-wrap"><div class="totals">${totals}</div></div>
      <div class="footer">${esc(sale.notes || s.footer)}</div></div>`,
  );
}

export function purchasePrintHtml(doc: PurchaseDoc, size: ReceiptSize = 'a4') {
  const s = shop();
  const rows = lineRows(doc.items);
  const totals = totalsBlock(doc);
  if (size === 'thermal') {
    return wrap(
      doc.invoiceNo,
      size,
      `${shopHead(size)}<div class="badge">Purchase</div>
      <div class="meta">
        <div><span>Invoice</span><strong>${esc(doc.invoiceNo)}</strong></div>
        <div><span>Date</span><span>${esc(doc.invoiceDate)}</span></div>
        <div><span>Vendor</span><span>${esc(doc.vendorName || '-')}</span></div>
        <div><span>Payment</span><span>${esc(doc.paymentMode)}</span></div>
      </div>
      <table><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Cost</th><th class="num">Amt</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="totals">${totals}</div>
      <div class="footer">${esc(doc.notes || s.footer)}</div>`,
    );
  }
  return wrap(
    doc.invoiceNo,
    size,
    `<div class="sheet"><div class="header">${shopHead(size)}<div class="doc-title"><div class="label">Purchase invoice</div><div class="no">${esc(doc.invoiceNo)}</div></div></div>
      <div class="meta-grid">
        <div><div class="k">Date</div><div>${esc(doc.invoiceDate)}</div></div>
        <div><div class="k">Vendor</div><div>${esc(doc.vendorName || '-')}</div></div>
        <div><div class="k">Payment</div><div>${esc(doc.paymentMode)}</div></div>
        <div><div class="k">Status</div><div>${esc(doc.status)}</div></div>
      </div>
      <table><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Cost</th><th class="num">Amount</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="totals-wrap"><div class="totals">${totals}</div></div>
      <div class="footer">${esc(doc.notes || s.footer)}</div></div>`,
  );
}

export function returnPrintHtml(doc: ReturnDoc, kind: 'sale' | 'purchase', size: ReceiptSize = 'thermal') {
  const label = kind === 'sale' ? 'Sale return' : 'Purchase return';
  const rows = lineRows(doc.items);
  const totals = `<div class="grand"><span>Grand total</span><span>${moneyBits(doc.grandTotal)}</span></div>`;
  if (size === 'thermal') {
    return wrap(
      doc.returnNo,
      size,
      `${shopHead(size)}<div class="badge">${label}</div>
      <div class="meta">
        <div><span>Return</span><strong>${esc(doc.returnNo)}</strong></div>
        <div><span>Date</span><span>${esc(doc.returnDate)}</span></div>
        <div><span>Party</span><span>${esc(doc.partyName)}</span></div>
      </div>
      <table><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amt</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="totals">${totals}</div>`,
    );
  }
  return wrap(
    doc.returnNo,
    size,
    `<div class="sheet"><div class="header">${shopHead(size)}<div class="doc-title"><div class="label">${label}</div><div class="no">${esc(doc.returnNo)}</div></div></div>
      <div class="meta-grid">
        <div><div class="k">Date</div><div>${esc(doc.returnDate)}</div></div>
        <div><div class="k">Party</div><div>${esc(doc.partyName)}</div></div>
      </div>
      <table><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="totals-wrap"><div class="totals">${totals}</div></div></div>`,
  );
}

export function voucherPrintHtml(voucher: Voucher, size: ReceiptSize = 'a4') {
  const rows = voucher.entries
    .map(
      (e) =>
        `<tr><td>${esc(e.narration || '')}</td><td class="num">${e.debit ? e.debit.toFixed(2) : ''}</td><td class="num">${e.credit ? e.credit.toFixed(2) : ''}</td></tr>`,
    )
    .join('');
  const body =
    size === 'thermal'
      ? `${shopHead(size)}<div class="badge">${esc(voucher.voucherType.replace(/_/g, ' '))}</div>
        <div class="meta">
          <div><span>No</span><strong>${esc(voucher.voucherNo)}</strong></div>
          <div><span>Date</span><span>${esc(voucher.voucherDate)}</span></div>
          <div><span>Party</span><span>${esc(voucher.partyName || '-')}</span></div>
        </div>
        <table><thead><tr><th>Narration</th><th class="num">Dr</th><th class="num">Cr</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="totals"><div class="grand"><span>Total</span><span>${moneyBits(voucher.grandTotal)}</span></div></div>`
      : `<div class="sheet"><div class="header">${shopHead(size)}<div class="doc-title"><div class="label">${esc(voucher.voucherType.replace(/_/g, ' '))}</div><div class="no">${esc(voucher.voucherNo)}</div></div></div>
        <div class="meta-grid">
          <div><div class="k">Date</div><div>${esc(voucher.voucherDate)}</div></div>
          <div><div class="k">Party</div><div>${esc(voucher.partyName || '-')}</div></div>
        </div>
        <table><thead><tr><th>Narration</th><th class="num">Debit</th><th class="num">Credit</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="totals-wrap"><div class="totals"><div class="grand"><span>Total</span><span>${moneyBits(voucher.grandTotal)}</span></div></div></div></div>`;
  return wrap(voucher.voucherNo, size, body);
}

export function tablePrintHtml(title: string, columns: string[], rows: string[][], size: ReceiptSize = 'a4') {
  const head = columns.map((c) => `<th>${esc(c)}</th>`).join('');
  const body = rows.map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('');
  return wrap(
    title,
    size,
    `<div class="sheet"><div class="header">${shopHead(size)}<div class="doc-title"><div class="label">Report</div><div class="no">${esc(title)}</div></div></div>
      <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`,
  );
}

export async function printHtml(html: string, title: string) {
  try {
    await sharePdfFromHtml(html, title);
  } catch (err) {
    showShareError(err);
  }
}

export function saleReceiptText(sale: SaleDoc) {
  const s = shop();
  const lines = [
    s.name,
    s.address,
    s.phone,
    'Sale invoice',
    `${sale.invoiceNo}  ${sale.invoiceDate}`,
    sale.customerName,
    sale.paymentMode,
    '',
    ...sale.items.map(
      (it) =>
        `${it.productName}${it.size || it.color ? ` (${[it.size, it.color].filter(Boolean).join('/')})` : ''}  ${it.quantity} x ${it.unitPrice} = ${it.lineTotal}`,
    ),
    '',
    `Subtotal ${sale.subtotal}`,
    `Discount ${sale.discountAmount}`,
    `Additions ${sale.additionAmount}`,
    `Tax ${sale.taxAmount}`,
    `Grand total ${sale.grandTotal}`,
    `Paid ${sale.paidAmount}`,
    `Balance ${sale.grandTotal - sale.paidAmount}`,
    sale.notes,
    s.footer,
  ];
  return lines.filter((line) => line !== '').join('\n');
}
