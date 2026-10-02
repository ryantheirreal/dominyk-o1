# Whilo — plano de unificação e execução

## 1. Visão do produto

Transformar o Whilo em um **workspace pessoal de agentes**: uma única experiência para conversar, delegar missões, acompanhar o trabalho, controlar computadores, revisar ações e agendar automações.

- **Whilo/O1** será o produto, a experiência mobile/web e o sistema de missões pessoais.
- **OpenBot** será a camada de coworkers, execução AG-UI, computadores isolados, skills, plugins, handoffs e políticas.
- **OpenMuse** é a origem da base atual do Whilo; não será executado como um segundo produto.
- **CopilotKit Intelligence** continuará sendo a camada de threads, memória e realtime, quando configurada.

Princípio central:

> Uma missão entra pelo Whilo, é planejada e autorizada pelo núcleo do Whilo, executada por um ou mais coworkers OpenBot e retorna como evidência, artefato e auditoria.

## 2. Resultado-alvo

Fluxo funcional mínimo:

1. A pessoa abre o Whilo e escreve um objetivo.
2. O Whilo cria uma missão persistente com plano, orçamento e fases de verificação.
3. A missão escolhe um coworker OpenBot adequado.
4. O coworker usa AG-UI e ferramentas concedidas.
5. Toda ação de navegador, arquivo, shell, MCP ou conector passa pelo gateway de política.
6. A pessoa acompanha a execução em tempo real, assume o controle quando necessário e aprova efeitos externos.
7. O resultado volta ao chat com fontes, arquivos, decisões, recibos e auditoria.
8. A mesma missão pode virar uma rotina agendada com limites explícitos.

## 3. Decisões de arquitetura

### 3.1 Fonte de verdade

- O **servidor Whilo** é a fonte de verdade para identidade, missão, permissões pessoais, aprovações, conectores, artefatos e auditoria do produto.
- O **OpenBot** é a fonte de verdade para o runtime do coworker, computador associado, skills/plugins concedidos e políticas de execução do coworker.
- IDs nunca serão misturados: `missionId`, `channelId`, `threadId`, `agentId`, `botId`, `computerId`, `runId`, `proposalId` e `actionId` permanecem distintos.

### 3.2 Integração

- Manter inicialmente o OpenBot como submódulo pinned e acessá-lo por contratos HTTP/AG-UI.
- Não importar módulos privados do OpenBot nem duplicar seu banco de dados no Whilo.
- Criar um `WhiloOpenBotAdapter` server-side com transporte autenticado, timeout, cancelamento, idempotência e tratamento explícito de resultado incerto.
- O cliente mobile/web nunca acessa portas de computador, supervisor, tokens de agente ou chaves de modelo.

### 3.3 Segurança

- Fail closed: ausência ou erro de política não autoriza ações.
- Decidir e registrar antes de executar; registrar também falhas após encaminhamento.
- Aprovação do Whilo continua necessária para Gmail, Calendar, pagamentos e demais efeitos externos.
- A política do OpenBot não substitui o ciclo de aprovação do Whilo.
- Segredos são write-only, criptografados e nunca entram em chat, logs ou auditoria.
- Rotinas e handoffs carregam `initiator_kind` e `initiator_id` para distinguir execução sem pessoa presente.

## 4. Fases de execução

### Fase 0 — Fundamento e congelamento de contratos

**Objetivo:** tornar a integração reproduzível antes de criar funcionalidades novas.

- Fixar a versão do submódulo OpenBot e documentar o processo de atualização.
- Definir versões compatíveis de Node/Bun, pnpm, PostgreSQL, CopilotKit Runtime e AG-UI.
- Consolidar variáveis de ambiente com prefixos `WHILO_`/`OPENBOT_`, sem duplicidade ambígua.
- Criar um ambiente local integrado com Whilo, OpenBot, banco, Intelligence e um computador.
- Adicionar health checks, correlation IDs e logs estruturados entre os serviços.
- Manter o adapter desligado por padrão até o round trip estar coberto por testes.

**Saída:** `docker compose` ou script único sobe a stack; health check comprova API, runtime, worker, banco e computador.

### Fase 1 — Adapter vivo e coworker único

**Objetivo:** executar uma conversa real do Whilo através de um coworker OpenBot.

- Implementar probe autenticado e descoberta de runtime.
- Implementar criação de canal/conversa e associação Whilo ↔ OpenBot.
- Implementar `run`, `reconnect`, `stop` e carregamento de histórico.
- Persistir o vínculo de identidade server-side; não usar sessão administrativa compartilhada.
- Exibir no Whilo estado de indisponibilidade, reconexão e erro real, sem simulação de sucesso.
- Fazer um coworker padrão responder a uma tarefa simples baseada em uma página pública.

**Saída:** teste end-to-end: chat → AG-UI → coworker → resposta no thread do Whilo.

### Fase 2 — Computador governado

**Objetivo:** ligar o computador do OpenBot ao modelo de ComputerProvider do Whilo.

- Mapear status, screenshot, read, snapshot, navigate, click, type, key e scroll.
- Acrescentar arquivos: list/read/write com limites de caminho e tamanho.
- Acrescentar shell somente depois da política e dos recibos estarem integrados.
- Encaminhar todas as ações pelo gateway Whilo/OpenBot; nunca chamar o computador diretamente do cliente.
- Preservar `snapshotId` e refs opacos; rejeitar refs vencidos ou de outra sessão.
- Integrar request/take/release de controle humano à Activity do Whilo.
- Unificar receipts, hashes, chaves de idempotência e estado incerto.

**Saída:** o usuário acompanha o coworker navegando, pode assumir o navegador e devolvê-lo sem quebrar o run.

### Fase 3 — Missões, evidências e aprovação

**Objetivo:** tornar a execução útil para tarefas reais, não apenas chat.

- Adaptar o planner/Governor do Whilo para criar uma missão com fases: entender, executar, verificar e entregar.
- Mapear cada run do coworker para uma fase e guardar progresso, custo, tentativas e orçamento.
- Unificar Activity, auditoria OpenBot e receipts Whilo em uma linha temporal consultável.
- Exigir aprovação explícita antes de writes externos; manter “preparado”, “aprovado”, “executado”, “confirmado” e “incerto” como estados distintos.
- Conectar artefatos do OpenBot ao sistema de documentos/arquivos do Whilo.
- Mostrar fontes, screenshots, páginas visitadas, arquivos e limitações no resultado final.

**Saída:** missão de pesquisa e missão de formulário/PDF completam com resultado verificável e nenhum write externo sem aprovação.

### Fase 4 — Coworkers, handoffs e skills

**Objetivo:** transformar o OpenBot em uma rede de agentes pessoais dentro do Whilo.

- Expor roster de coworkers, perfil, papel, visibilidade e endpoint no UI do Whilo.
- Mapear grants de ferramentas, MCPs, componentes e skills para as permissões do Whilo.
- Implementar handoff tipado entre coworkers com limite de profundidade e de fan-out.
- Entregar a resposta na conversa do coworker chamado e manter a referência no canal de origem.
- Adicionar `ask_person` como saída segura quando o coworker não puder decidir.
- Começar com três coworkers: General, Researcher e Operator.
- Evitar catálogo amplo até haver testes de autorização e isolamento por coworker.

**Saída:** uma missão pode delegar uma parte a outro coworker, com rastreabilidade completa e sem contornar visibilidade ou grants.

### Fase 5 — Rotinas e automações persistentes

**Objetivo:** permitir que o Whilo continue trabalhando quando a pessoa estiver ausente.

- Usar o scheduler/worker durável existente do Whilo como coordenador de missão.
- Mapear rotina para instrução, proprietário, canal, coworker, cron/timezone, limites e política.
- Executar rotinas com a identidade e grants do proprietário, nunca como administrador.
- Preservar piso de 15 minutos, limite de rotinas ativas, fatigue rule, backoff e skip de janelas perdidas.
- Registrar sweeps, runs, alertas, falhas e motivo de desligamento.
- Reaproveitar watches/Goals do Whilo e execução agendada do OpenBot sem dois relógios concorrentes.

**Saída:** uma rotina diária produz uma resposta no canal, registra sua execução e desliga com aviso após falhas consecutivas.

### Fase 6 — Produto unificado e operação

**Objetivo:** remover a sensação de dois produtos e preparar uso contínuo.

- Escolher Whilo como nome, marca, rotas e documentação públicas.
- Migrar telas duplicadas do OpenBot para superfícies Whilo: Chat, Coworkers, Computer, Activity, Skills, Routines e Admin.
- Manter a UI original do OpenBot apenas como referência temporária de paridade, não como segundo frontend.
- Implementar autenticação multiusuário, membership, RBAC, isolamento por usuário e retenção/exportação.
- Adicionar métricas: latência, falhas, custo por missão, ações recusadas, aprovações pendentes, computadores ativos e rotinas atrasadas.
- Criar backup, restore, migrações e procedimento de rollback do submódulo.
- Publicar apenas após testes de segurança, round trips reais e verificação de deployment.

**Saída:** uma instalação do Whilo sobe com um único frontend, um único fluxo de missão e operação observável.

## 5. Ordem recomendada de implementação

1. Fase 0 — ambiente e contratos.
2. Fase 1 — conversa real com um coworker.
3. Fase 2 — computador e handover.
4. Fase 3 — missão, aprovação e evidências.
5. Fase 4 — múltiplos coworkers e handoffs.
6. Fase 5 — rotinas.
7. Fase 6 — produto, multiusuário e operação.

Não começar por mobile nativo, marketplace de skills, pagamentos, múltiplos modelos ou VM por usuário. Essas frentes aumentam superfície antes de validar o loop principal.

## 6. Primeiro incremento executável

O primeiro vertical slice deve ser pequeno e completo:

- Um coworker OpenBot configurado.
- Uma missão Whilo criada a partir do chat.
- Navegação em uma página pública.
- Screenshot e texto como evidência.
- Uma ação de baixo risco permitida pela política.
- Uma ação proibida registrada e exibida.
- Stop/reconnect funcional.
- Resultado persistido no thread e na Activity.
- Teste end-to-end rodando localmente e em CI.

Depois disso, adicionar uma aprovação real e só então expandir para Gmail/Calendar, arquivos, shell, handoff e rotina.

## 7. Critérios de pronto

Uma fase só é considerada concluída quando houver:

- implementação server-side e UI necessária;
- teste unitário do contrato e teste de autorização;
- teste de integração com o serviço real ou fixture equivalente;
- comportamento definido para timeout, cancelamento, indisponibilidade e resultado incerto;
- auditoria verificável sem segredos;
- documentação de configuração e rollback;
- evidência de execução, não apenas código compilado.

## 8. Riscos e mitigação

| Risco | Mitigação |
| --- | --- |
| Dois bancos e dois ciclos de execução divergirem | Whilo possui missão/aprovação; OpenBot possui runtime/computador; integração por adapter. |
| Sessão administrativa virar atalho de segurança | Identidade por usuário server-side e testes de acesso por coworker. |
| Duplicação de scheduler | Um único worker/queue para rotinas e missões; sweep idempotente. |
| Ação externa duplicada após timeout | Idempotency key, estado `uncertain` e revisão antes de repetir. |
| Submódulo ficar desatualizado | Pin explícito, changelog de upgrade, smoke tests e atualização deliberada. |
| Complexidade de múltiplos frameworks AG-UI | Começar com um coworker LangGraph/TypeScript e adicionar adapters depois. |
| Computadores isolados consumirem recursos excessivos | Limites de concorrência, idle culler, quotas e métricas antes de multiusuário. |
| Licenças e proveniência confusas | Preservar MIT, notices upstream e separar módulos Whilo dos derivados. |

## 9. Estado atual e próximo commit de produto

Já existe uma base relevante no Whilo: missão/governor, memória, auditoria append-only, scheduler durável, browser worker, ComputerProvider e adapter OpenBot desativado com testes de contrato.

O próximo trabalho deve ser **Fase 0 + Fase 1**: ambiente integrado, identidade server-side e o primeiro round trip real de um coworker OpenBot no chat do Whilo.
