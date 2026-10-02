import { z } from "zod";
import { AppError } from "../errors.ts";

export const paymentDraftSchema = z.object({
  amount: z.number().int().positive().max(100_000_000),
  currency: z
    .string()
    .trim()
    .regex(/^[a-zA-Z]{3}$/)
    .transform((value) => value.toLowerCase()),
  description: z.string().trim().min(1).max(500),
  recipient: z.string().trim().max(320).default(""),
  successUrl: z.url().max(2048).optional(),
  cancelUrl: z.url().max(2048).optional(),
});
export type PaymentDraft = z.infer<typeof paymentDraftSchema>;

function stripeClientId() {
  return process.env.STRIPE_CLIENT_ID?.trim();
}
function publicApiUrl() {
  return (process.env.PUBLIC_API_URL ?? "http://localhost:8787").replace(/\/$/, "");
}

export function paymentConnectionInfo() {
  const clientId = stripeClientId();
  const redirectUri =
    process.env.STRIPE_REDIRECT_URI?.trim() ||
    `${publicApiUrl()}/api/o1/connectors/stripe/oauth/callback`;
  return {
    id: "stripe",
    name: "Pagamentos",
    configured: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
    oauth: {
      configured: Boolean(clientId),
      authorizeUrl: clientId
        ? `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${encodeURIComponent(clientId)}&scope=read_write&redirect_uri=${encodeURIComponent(redirectUri)}`
        : null,
      redirectUri,
      scopes: ["read_write"],
    },
    cli: {
      install: "https://stripe.com/docs/stripe-cli#install",
      login: "stripe login",
      listen: "stripe listen --forward-to http://localhost:8787/api/o1/connectors/stripe/webhook",
      docs: "https://docs.stripe.com/stripe-cli",
    },
    capabilities: ["payment_draft", "checkout_link_after_approval", "subscriptions", "webhooks"],
    safety: "Pagamentos exigem aprovação explícita; este endpoint nunca cobra automaticamente.",
  };
}

async function stripeRequest(path: string, init: RequestInit = {}) {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret)
    throw new AppError("Configure STRIPE_SECRET_KEY no servidor antes de usar Pagamentos", 503);
  const response = await fetch(`https://api.stripe.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(init.headers ?? {}),
    },
    signal: init.signal ?? AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new AppError(`Stripe recusou a operação (${response.status})`, 502);
  return body as Record<string, unknown>;
}

export async function createCheckoutLink(input: PaymentDraft) {
  const parsed = paymentDraftSchema.parse(input);
  const params = new URLSearchParams({
    mode: "payment",
    "line_items[0][price_data][currency]": parsed.currency,
    "line_items[0][price_data][product_data][name]": parsed.description,
    "line_items[0][price_data][unit_amount]": String(parsed.amount),
    "line_items[0][quantity]": "1",
    "payment_method_types[0]": "card",
    success_url:
      parsed.successUrl ?? `${publicApiUrl()}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: parsed.cancelUrl ?? `${publicApiUrl()}/payment/cancelled`,
  });
  const session = await stripeRequest("/v1/checkout/sessions", { method: "POST", body: params });
  return {
    id: session.id,
    url: session.url,
    status: "created_after_approval",
    currency: parsed.currency,
    amount: parsed.amount,
  };
}
