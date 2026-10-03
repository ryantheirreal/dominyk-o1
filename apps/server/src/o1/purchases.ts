import { z } from "zod";

const blockedHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);
export const purchaseRequestSchema = z.object({
  merchant: z.string().trim().min(1).max(160),
  item: z.string().trim().min(1).max(500),
  quantity: z.number().int().min(1).max(99).default(1),
  amount: z.number().int().positive().max(100_000_000),
  currency: z.string().trim().regex(/^[a-zA-Z]{3}$/).transform((value) => value.toUpperCase()),
  checkoutUrl: z.url().max(2048),
  shipping: z.string().trim().max(500).default(""),
  notes: z.string().trim().max(1000).default(""),
});
export type PurchaseRequest = z.infer<typeof purchaseRequestSchema>;

export function preparePurchase(input: PurchaseRequest) {
  const value = purchaseRequestSchema.parse(input);
  const url = new URL(value.checkoutUrl);
  if (url.protocol !== "https:") throw new Error("O checkout precisa usar HTTPS");
  if (blockedHosts.has(url.hostname)) throw new Error("Checkout local não é permitido");
  return {
    kind: "purchase_review",
    status: "awaiting_human_review",
    merchant: value.merchant,
    item: value.item,
    quantity: value.quantity,
    amount: value.amount,
    currency: value.currency,
    shipping: value.shipping || "A confirmar no checkout",
    checkoutUrl: value.checkoutUrl,
    notes: value.notes,
    controls: {
      browserTakeover: true,
      finalSubmit: "human_only",
      paymentData: "never_entered_by_agent",
      approvalScope: "Somente os detalhes exibidos nesta revisão",
    },
    nextStep: "Revise merchant, item, quantidade, frete e total. Depois assuma o navegador e confirme a compra manualmente.",
  };
}
