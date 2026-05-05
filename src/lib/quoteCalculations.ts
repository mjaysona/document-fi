export type QuoteLineItem = {
  unitPrice: number
  quantity: number
}

export type QuoteCalcSummary = {
  subtotal: number
  total: number
}

/**
 * Compute the line total for a single item.
 * Single source of truth — used by form, QuoteDocument, preview, and share.
 */
export function calcLineTotal(item: QuoteLineItem): number {
  return item.unitPrice * item.quantity
}

/**
 * Compute subtotal and total from all items.
 * MVP: total === subtotal (no taxes or discounts).
 */
export function calcQuoteSummary(items: QuoteLineItem[]): QuoteCalcSummary {
  const subtotal = items.reduce((sum, item) => sum + calcLineTotal(item), 0)
  return { subtotal, total: subtotal }
}
