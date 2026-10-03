# Whilo — voice-first agent e stack de produção

## Visão

Transformar o Whilo em um agente pessoal voice-first: a pessoa inicia uma chamada, fala uma tarefa, o mesmo runtime conversacional executa tools, pausa em ações externas e mostra uma revisão humana antes de enviar email, comprar, reservar ou publicar.

## Design

- **Movimento:** calm technology + command center editorial.
- **Princípios:** presença sem ruído, estado sempre visível, aprovação no ponto de impacto, resultados que viram artefatos.
- **Paleta:** azul Whilo como ação e presença; branco/azul muito claro como espaço de trabalho; vermelho/laranja apenas para risco.
- **Layout:** uma coluna de conversa com uma faixa de atividade persistente; voice call aparece como estado vivo acima do composer, não como uma tela separada.
- **Assinaturas:** logo-orca Whilo, cartões de revisão com resumo exato e timeline de tool calls.
- **Interação:** voz captura intenção; texto/cards mostram o que será feito; ações externas nunca ficam escondidas atrás de confirmação vocal ambígua.
- **Animação:** pulso discreto quando ouvindo, sem animações decorativas durante checkout ou aprovação.
- **Tipografia:** sistema nativo; títulos curtos e microcopy direta.
- **Essência:** um agente que transforma fala em trabalho verificável, sem tirar o controle da pessoa.
- **Voz:** clara, calorosa e objetiva. “Entendi. Vou preparar e mostrar antes de enviar.” / “A compra está pronta para sua revisão; nada foi pago.”

## Entregas desta fase

- Voice call web com Web Speech API, detecção de fala, interrupção, transcrição pt-BR e leitura da resposta.
- Fala roteada para o mesmo `enqueue`/CopilotKit runtime do chat, portanto usa as mesmas tools, threads, memória, auditoria e approvals.
- `prepare_email` como tool real: cria uma proposta no ActionService, nunca envia diretamente.
- Documentação de arquitetura: Vercel hospeda PWA; Cloudflare fica na borda/gateway; GitHub Actions valida; deploy protegido será configurado depois; Supabase será o Postgres/Auth/Storage de produção.

## Fases seguintes

1. WebRTC/OpenAI Realtime ou provedor equivalente para áudio duplex de baixa latência, mantendo o transcript bridge atual como fallback.
2. Tool cards ricos para email, calendário, viagens e compras, com aprovação e recibo em voz e tela.
3. Adapter Supabase para sessões, threads, tarefas, auditoria e artefatos; RLS por owner.
4. Edge gateway Cloudflare com rate limit, origem Vercel allowlisted, webhooks e health checks.
5. Vercel Preview/Production com variáveis server-only; GitHub Actions com testes, build web e deploy protegido.
6. Observabilidade de latência de voz, tool success rate, approval conversion e falhas por provider.

## Limites necessários

Não existe deploy real para contas Cloudflare, Vercel ou Supabase sem os respectivos projetos, URLs e segredos. O código deve funcionar em modo sample/local e rejeitar honestamente chamadas live sem credenciais. Pagamentos, email e compra permanecem aprováveis; voice call não pode conceder autorização financeira por si só.
