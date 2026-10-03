# Whilo — stack de produção

## Responsabilidades

| Camada | Serviço | Responsabilidade | Regra |
|---|---|---|---|
| Web/PWA | Vercel | Export web do Expo/Metro e previews por branch | Nunca colocar tokens de provedor no bundle |
| Borda | Cloudflare | DNS, WAF, rate limit, cache de assets e gateway de webhooks | Encaminhar apenas origens Vercel permitidas |
| Dados | Supabase | Postgres, Auth, Storage e Realtime | RLS por `owner_id`; service role somente no servidor |
| Código/CI | GitHub | Source of truth, Actions, deploy e ambientes | Secrets somente em GitHub/Vercel/Cloudflare, nunca no repo |
| API/worker | Node/Hono | CopilotKit, tools, approvals, tarefas e browser worker | Pode rodar em Vercel Functions apenas sem processos persistentes; worker/computador precisa de runtime persistente |

## Voice call e tools

A primeira implementação usa Web Speech API para captura pt-BR e Speech Synthesis para a resposta. O transcript chama o mesmo `enqueue` do chat. Isso significa que `search_mail`, `prepare_email`, `travel_search`, `prepare_purchase`, browser e tarefas duráveis usam exatamente o mesmo runtime, thread, memória, política e auditoria.

O `prepare_email` cria uma proposta `email.send` no ActionService. A chamada de voz **não** envia; a tela mostra o destinatário, assunto e corpo para revisão. Compra e checkout seguem a mesma fronteira: preparação, takeover e aprovação explícita.

A evolução para áudio duplex deve usar WebRTC/OpenAI Realtime ou um provedor compatível com ephemeral token emitido pelo backend. O bridge de transcript atual continua como fallback para Safari, acessibilidade e indisponibilidade de realtime.

## Supabase

- Migrar `Store` para Postgres com tabelas `workspaces`, `threads`, `messages`, `tasks`, `actions`, `audit_events`, `artifacts`, `memories` e `connectors`.
- Todas as tabelas recebem `owner_id`, timestamps e idempotency keys.
- RLS impede leitura cruzada entre owners.
- Supabase Storage recebe arquivos; URLs assinadas são curtas e não entram em prompts sem necessidade.

## Cloudflare

- Cloudflare Tunnel ou Worker fica na frente do API/worker persistente.
- WAF e rate limit protegem `/api/session`, `/api/copilotkit`, `/api/o1/*` e webhooks.
- WebSocket/streaming deve ser encaminhado sem buffering; não cachear eventos AG-UI.
- Webhooks Stripe/Google/Twilio validam assinatura antes de alcançar o servidor.

## Vercel

- `vercel.json` já aponta `pnpm build:web` para `apps/mobile/dist/web`.
- `PUBLIC_API_URL` deve apontar para o gateway Cloudflare, nunca para localhost.
- O PWA pode ser publicado pela Vercel; o API com computador persistente deve permanecer num runtime persistente atrás do Cloudflare.

## GitHub

- Actions executa lint, audit, typecheck, testes, build server e export web.
- Deploy de produção exige branch `main` verde.
- Ambientes `preview` e `production` têm variáveis separadas.

## O que ainda requer conexão externa

O código está preparado, mas a ativação real exige os projetos e segredos do usuário: URL/chave Supabase, projeto Vercel, zone/token Cloudflare, variáveis do provedor de modelo, Google OAuth e Stripe/Twilio quando aplicável. Sem esses valores o Whilo permanece no modo sample/local e não finge que enviou emails, executou compras ou publicou deploys.
