export type PaymentMode = 'cash' | 'credit' | 'bank' | 'split';

export function moneyRound(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export type ResolvedSettlement = {
  cashPaid: number;
  bankPaid: number;
  paidAmount: number;
  due: number;
  paymentMode: PaymentMode;
};

export function resolveSettlement(input: {
  grandTotal: number;
  paymentMode?: PaymentMode | string | null;
  paidAmount?: number | null;
  cashPaid?: number | null;
  bankPaid?: number | null;
}): ResolvedSettlement | { error: string } {
  const grandTotal = moneyRound(input.grandTotal);
  if (grandTotal < 0) return { error: 'Grand total cannot be negative.' };

  const hasSplitFields = input.cashPaid != null || input.bankPaid != null;
  let cashPaid = 0;
  let bankPaid = 0;

  if (hasSplitFields) {
    cashPaid = moneyRound(Number(input.cashPaid ?? 0));
    bankPaid = moneyRound(Number(input.bankPaid ?? 0));
  } else {
    const mode = (input.paymentMode || 'cash') as string;
    let paid = moneyRound(Number(input.paidAmount ?? 0));
    if ((mode === 'cash' || mode === 'bank') && paid <= 0) paid = grandTotal;
    if (mode === 'credit' && (input.paidAmount == null || Number.isNaN(Number(input.paidAmount)))) {
      paid = 0;
    }
    if (paid < 0) return { error: 'Paid amount cannot be negative.' };
    if (paid > grandTotal) return { error: 'Paid cannot be more than the total.' };
    if (mode === 'bank') {
      bankPaid = paid;
      cashPaid = 0;
    } else if (mode === 'credit') {
      cashPaid = paid;
      bankPaid = 0;
    } else if (mode === 'split') {
      return { error: 'Cash + Bank needs cash and bank amounts.' };
    } else {
      cashPaid = paid;
      bankPaid = 0;
    }
  }

  if (Number.isNaN(cashPaid) || Number.isNaN(bankPaid)) return { error: 'Invalid paid amounts.' };
  if (cashPaid < 0 || bankPaid < 0) return { error: 'Paid amounts cannot be negative.' };
  const paidAmount = moneyRound(cashPaid + bankPaid);
  if (paidAmount > grandTotal) return { error: 'Paid cannot be more than the total.' };
  const due = moneyRound(grandTotal - paidAmount);

  let paymentMode: PaymentMode;
  if (paidAmount === 0) paymentMode = 'credit';
  else if (cashPaid > 0 && bankPaid > 0) paymentMode = 'split';
  else if (bankPaid > 0) paymentMode = 'bank';
  else paymentMode = 'cash';

  return { cashPaid, bankPaid, paidAmount, due, paymentMode };
}

export function resolveMoneySplit(input: {
  amount?: number | null;
  cashPaid?: number | null;
  bankPaid?: number | null;
  preferBank?: boolean;
}): { amount: number; cashPaid: number; bankPaid: number } | { error: string } {
  const hasSplitFields = input.cashPaid != null || input.bankPaid != null;
  let cashPaid = 0;
  let bankPaid = 0;
  let amount = moneyRound(Number(input.amount ?? 0));

  if (hasSplitFields) {
    cashPaid = moneyRound(Number(input.cashPaid ?? 0));
    bankPaid = moneyRound(Number(input.bankPaid ?? 0));
    if (Number.isNaN(cashPaid) || Number.isNaN(bankPaid)) return { error: 'Invalid cash or bank amount.' };
    if (cashPaid < 0 || bankPaid < 0) return { error: 'Amounts cannot be negative.' };
    const splitTotal = moneyRound(cashPaid + bankPaid);
    if (splitTotal <= 0) return { error: 'Amount must be positive.' };
    if (amount > 0 && amount !== splitTotal) return { error: 'Cash plus bank must equal the amount.' };
    amount = splitTotal;
  } else {
    if (Number.isNaN(amount) || amount <= 0) return { error: 'Amount must be positive.' };
    if (input.preferBank) {
      bankPaid = amount;
      cashPaid = 0;
    } else {
      cashPaid = amount;
      bankPaid = 0;
    }
  }

  return { amount, cashPaid, bankPaid };
}

export function inferPayHow(cash: number, bank: number, grandTotal: number, allowCredit: boolean): PaymentMode {
  if (cash > 0 && bank > 0) return 'split';
  if (bank > 0 && cash <= 0) return 'bank';
  if (allowCredit && cash <= 0 && bank <= 0 && grandTotal > 0) return 'credit';
  return 'cash';
}
