# Pagamentos, Viagens e créditos no Whilo

## Pagamentos

A função **Pagamentos** usa Stripe como primeira conexão e está exposta em:

```text
GET /api/o1/connectors/stripe/connection
```

Esse endpoint retorna o estado da conexão, o link OAuth quando `STRIPE_CLIENT_ID` estiver configurado e os links oficiais da Stripe CLI:

- Instalação: https://stripe.com/docs/stripe-cli#install
- Login: `stripe login`
- Webhook local: `stripe listen --forward-to http://localhost:8787/api/o1/connectors/stripe/webhook`

Configuração server-side:

```dotenv
STRIPE_SECRET_KEY=sk_test_...
STRIPE_CLIENT_ID=ca_...
STRIPE_REDIRECT_URI=https://seu-host/api/o1/connectors/stripe/oauth/callback
```

O agente pode preparar uma ação `stripe.create_checkout_link`, mas **toda criação de checkout exige aprovação humana explícita**, inclusive quando o modo geral estiver em acesso total. A chave Stripe nunca é enviada ao navegador ou ao agente. O callback OAuth está deliberadamente marcado como não configurado até haver persistência de conta conectada, validação de `state`/CSRF e troca segura de tokens.

## Viagens

A função **Viagens** está disponível em:

```text
POST /api/o1/travel/search
```

Exemplo:

```json
{
  "origin": "GRU",
  "destination": "LIS",
  "departure": "2026-12-10",
  "returnDate": "2026-12-20",
  "travelers": 1,
  "cabin": "economy"
}
```

O resultado é um itinerário de pesquisa com links para Google Flights, Kayak e Booking.com. O status é `research_only`: o Whilo não confirma reserva, não aceita termos de compra e não insere dados de pagamento automaticamente. Uma futura reserva deve ser aberta em modo de takeover para que a pessoa revise e confirme.

## Créditos internos

O ledger em `/api/o1/credits` controla **créditos não monetários de uso do agente**. O saldo inicial local é 100. Eles não representam dinheiro, assinatura, reembolso ou saldo Stripe.

Para conceder créditos administrativamente, configure no servidor:

```dotenv
WHILO_CREDITS_ADMIN_KEY=um-segredo-fora-do-repositorio
```

Depois use `POST /api/o1/credits/grant` com o header `x-whilo-credits-key`. O endpoint rejeita qualquer tentativa sem essa chave. O ledger registra concessões e débitos por proprietário; nenhuma compra de créditos foi implementada.

## Limites atuais

A conexão Stripe ainda precisa de credenciais reais e de um callback OAuth completo antes de ser considerada produção. Viagens ainda são pesquisa e preparação. Pagamentos, reservas, assinaturas e movimentações financeiras não são executados automaticamente pelo agente.
