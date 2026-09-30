export type CapabilityTier = "S+";
export type CapabilityKind = "control" | "runtime" | "developer" | "governance" | "connectivity" | "experience";

export interface CapabilityDefinition {
  id: string;
  name: string;
  kind: CapabilityKind;
  tier: CapabilityTier;
  description: string;
  inputs: string[];
  outputs: string[];
  children: string[];
  fallback: string[];
  requiresApproval?: boolean;
}

export const O1_CAPABILITIES: readonly CapabilityDefinition[] = [
  { id:"mission-governor", name:"Mission Governor", kind:"control", tier:"S+", description:"Converte intenção em missão executável, orçamento, paralelismo, checkpoints e critérios de conclusão.", inputs:["intent","constraints"], outputs:["mission-graph","budget","checkpoints"], children:["planner","verifier","recovery-orchestrator"], fallback:["planner","verifier"] },
  { id:"multi-agent-swarm", name:"Multi-Agent Swarm", kind:"control", tier:"S+", description:"Orquestra especialistas com isolamento de contexto, handoffs e síntese.", inputs:["mission-graph"], outputs:["subruns","handoffs","synthesis"], children:["researcher","coder","browser","analyst","reviewer","verifier"], fallback:["single-agent-loop"] },
  { id:"long-horizon-runtime", name:"Long-Horizon Runtime", kind:"runtime", tier:"S+", description:"Mantém tarefas longas vivas com filas duráveis, checkpoints e retomada.", inputs:["mission-graph"], outputs:["durable-run"], children:["checkpoint-engine","resume-engine","lease-manager"], fallback:["short-run-runtime"] },
  { id:"persistent-state", name:"Persistent State", kind:"runtime", tier:"S+", description:"Mantém estado de sessão, missão e ferramentas sem reenviar o mundo inteiro ao modelo.", inputs:["events","artifacts"], outputs:["state"], children:["session-state","mission-state","artifact-state"], fallback:["stateless-replay"] },
  { id:"context-compaction", name:"Context Compaction", kind:"runtime", tier:"S+", description:"Compacta contexto preservando fatos, decisões, artefatos e trabalho pendente.", inputs:["history","artifacts"], outputs:["compact-state"], children:["semantic-summary","decision-ledger","artifact-index"], fallback:["rolling-summary"] },
  { id:"tool-discovery", name:"Tool Discovery", kind:"runtime", tier:"S+", description:"Descobre somente as ferramentas relevantes para a intenção atual.", inputs:["intent","tool-catalog"], outputs:["toolset"], children:["semantic-tool-search","permission-filter","tool-ranking"], fallback:["static-toolset"] },
  { id:"programmatic-tools", name:"Programmatic Tool Calls", kind:"runtime", tier:"S+", description:"Permite que um run componha várias operações de ferramenta antes de voltar ao modelo.", inputs:["toolset","task"], outputs:["tool-batch-result"], children:["batch-executor","map-reduce-tools","result-joiner"], fallback:["sequential-tools"] },
  { id:"computer-control", name:"Computer Control", kind:"runtime", tier:"S+", description:"Controla computador remoto com screenshot, ações, estado e verificação.", inputs:["computer-session"], outputs:["verified-action"], children:["screen-reader","action-barrier","takeover"], fallback:["browser-control"] },
  { id:"browser-runtime", name:"Persistent Browser Runtime", kind:"runtime", tier:"S+", description:"Navegação persistente com profiles, sessões e recuperação.", inputs:["url","browser-profile"], outputs:["page-state","artifacts"], children:["navigation","profiles","screencast","download-capture"], fallback:["ephemeral-browser"] },
  { id:"shell-sandbox", name:"Shell Sandbox", kind:"developer", tier:"S+", description:"Executa comandos em ambiente isolado, com limites, receipts e sem acesso host.", inputs:["command","workspace"], outputs:["stdout","stderr","exit"], children:["sandbox-policy","resource-limits","command-receipt"], fallback:["dry-run-shell"] },
  { id:"worktree-code", name:"Remote Worktrees", kind:"developer", tier:"S+", description:"Cria ambientes de desenvolvimento isolados por missão e agente.", inputs:["repository","task"], outputs:["worktree"], children:["clone-manager","worktree-manager","branch-state"], fallback:["workspace-directory"] },
  { id:"patch-engine", name:"Apply Patch Engine", kind:"developer", tier:"S+", description:"Aplica mudanças incrementais com diff auditável e validação.", inputs:["patch","workspace"], outputs:["diff","updated-files"], children:["patch-parser","conflict-resolver","diff-checker"], fallback:["whole-file-write"] },
  { id:"code-review", name:"Continuous Code Review", kind:"developer", tier:"S+", description:"Revisa diffs localmente e em PR/MR antes da promoção.", inputs:["diff","tests"], outputs:["review-findings"], children:["static-review","semantic-review","regression-review"], fallback:["lint-review"] },
  { id:"security-review", name:"Security Review Cloud", kind:"governance", tier:"S+", description:"Analisa dependências, código e superfícies agenticas com foco em vulnerabilidades.", inputs:["repository","runtime-config"], outputs:["security-findings"], children:["dependency-scan","secret-scan","agent-surface-scan"], fallback:["baseline-security-scan"] },
  { id:"evaluation-engine", name:"Interactive Evaluations", kind:"governance", tier:"S+", description:"Mede tarefas reais, regressões e confiabilidade do agente.", inputs:["task-suite","run"], outputs:["scores","regressions"], children:["scenario-runner","grader","regression-gate"], fallback:["assertion-tests"] },
  { id:"model-router", name:"Adaptive Model Router", kind:"control", tier:"S+", description:"Seleciona modelo por latência, custo, contexto, modalidade e dificuldade.", inputs:["task","budget","model-pool"], outputs:["route"], children:["difficulty-classifier","quality-router","fallback-router"], fallback:["static-model"] },
  { id:"cost-governor", name:"Cost Governor", kind:"governance", tier:"S+", description:"Controla orçamento de tokens, ferramentas, computadores e jobs.", inputs:["budget","usage"], outputs:["limits","alerts"], children:["token-budget","tool-budget","computer-budget"], fallback:["hard-cap"] },
  { id:"latency-fast-lane", name:"Ultra Speed Lane", kind:"runtime", tier:"S+", description:"Rota tarefas adequadas para execução de baixa latência com contexto mínimo.", inputs:["task"], outputs:["fast-run"], children:["fast-model","cache-hotpath","parallel-tools"], fallback:["standard-lane"] },
  { id:"approval-kernel", name:"Human Approval Kernel", kind:"governance", tier:"S+", description:"Centraliza ALLOW, DENY e ASK para ações externas/sensíveis.", inputs:["action","risk"], outputs:["decision"], children:["risk-classifier","approval-ui","idempotency"], fallback:["default-approval"] },
  { id:"policy-gateway", name:"Fail-Closed Policy Gateway", kind:"governance", tier:"S+", description:"Nenhuma tool externa passa sem autorização, escopo e política.", inputs:["actor","tool","target"], outputs:["allow-deny"], children:["target-validator","permission-engine","policy-cache"], fallback:["deny-all"] },
  { id:"audit-ledger", name:"Append-Only Audit Ledger", kind:"governance", tier:"S+", description:"Registra decisões, execuções, recusas, handoffs e resultados sem expor segredos.", inputs:["events"], outputs:["audit-events"], children:["redaction","immutable-store","audit-query"], fallback:["local-structured-log"] },
  { id:"human-takeover", name:"Human Takeover", kind:"experience", tier:"S+", description:"Entrega o controle do computador ao humano e retoma o agente depois.", inputs:["computer-session"], outputs:["control-transfer"], children:["control-lock","resume-handoff","activity-marker"], fallback:["pause-and-request"] },
  { id:"skills-runtime", name:"Skills Runtime", kind:"runtime", tier:"S+", description:"Carrega instruções, scripts, templates e recursos sob demanda.", inputs:["skill"], outputs:["capability-context"], children:["skill-loader","skill-versioning","skill-permissions"], fallback:["inline-instructions"] },
  { id:"mcp-gateway", name:"Governed MCP Gateway", kind:"connectivity", tier:"S+", description:"Expõe MCP por grants, classificação, política e auditoria.", inputs:["mcp-server","tool"], outputs:["tool-call"], children:["server-registry","tool-classifier","grant-manager"], fallback:["direct-connector"] },
  { id:"mcp-events", name:"MCP Event Automation", kind:"connectivity", tier:"S+", description:"Transforma eventos de conectores em triggers de missões.", inputs:["event"], outputs:["triggered-mission"], children:["event-filter","deduper","trigger-dispatcher"], fallback:["polling-trigger"] },
  { id:"connector-bus", name:"Universal Connector Bus", kind:"connectivity", tier:"S+", description:"Registry uniforme para APIs, MCPs, webhooks e bridges locais.", inputs:["connector-manifest"], outputs:["connector-client"], children:["credential-vault","health-check","rate-limiter"], fallback:["http-adapter"] },
  { id:"messaging-fabric", name:"Messaging Fabric", kind:"connectivity", tier:"S+", description:"Abstrai canais de comunicação para agentes, com aprovação e deduplicação.", inputs:["message"], outputs:["delivery"], children:["imessage","sms","slack","discord","telegram","whatsapp"], fallback:["email"] },
  { id:"files-rag", name:"Files + Retrieval", kind:"runtime", tier:"S+", description:"Indexa arquivos e recupera evidências para a missão.", inputs:["documents"], outputs:["evidence"], children:["file-indexer","semantic-search","citation-builder"], fallback:["keyword-search"] },
  { id:"artifact-pages", name:"Live Artifact Pages", kind:"experience", tier:"S+", description:"Gera documentos e interfaces atualizáveis durante a execução.", inputs:["structured-state"], outputs:["artifact-page"], children:["rich-editor","charts","interactive-tables"], fallback:["static-artifact"] },
  { id:"voice-runtime", name:"Realtime Voice Runtime", kind:"experience", tier:"S+", description:"Camada de voz com sessão persistente, transcrição e interrupção.", inputs:["audio"], outputs:["voice-events"], children:["stt","tts","barge-in"], fallback:["text-chat"] },
  { id:"routines", name:"Durable Routines", kind:"control", tier:"S+", description:"Executa missões de forma agendada ou por eventos, com backoff e limites.", inputs:["schedule","mission"], outputs:["routine-run"], children:["scheduler","event-trigger","failure-backoff"], fallback:["manual-run"] },
  { id:"team-spaces", name:"Team Spaces", kind:"experience", tier:"S+", description:"Compartilha missões, artefatos e contexto com pessoas e agentes.", inputs:["workspace"], outputs:["shared-space"], children:["memberships","shared-context","comments"], fallback:["single-user-space"] },
  { id:"enterprise-identity", name:"Enterprise Identity", kind:"governance", tier:"S+", description:"Identidade, sessões, organizações e provedores corporativos.", inputs:["identity-provider"], outputs:["principal"], children:["oauth","oidc","saml","rbac"], fallback:["single-user-session"] },
  { id:"billing-entitlements", name:"Billing + Entitlements", kind:"governance", tier:"S+", description:"Converte planos em limites e capacidades verificáveis.", inputs:["plan","usage"], outputs:["entitlements"], children:["quota-engine","subscription-state","usage-meter"], fallback:["config-limits"] },
  { id:"recovery-observability", name:"Recovery + Observability", kind:"runtime", tier:"S+", description:"Detecta falhas, recupera runs e mede custo/latência/sucesso.", inputs:["telemetry","run-state"], outputs:["health","recovery"], children:["trace-store","failure-classifier","resume-engine"], fallback:["structured-logs"] },
] as const;

export function capability(id: string) {
  return O1_CAPABILITIES.find((item) => item.id === id);
}

export function expandCapability(id: string, qualityScore = 1): string[] {
  const root = capability(id);
  if (!root) return [];
  if (qualityScore >= 0.85 || root.children.length === 0) return [root.id];
  return [root.id, ...root.children];
}

export function capabilitySummary() {
  return {
    total: O1_CAPABILITIES.length,
    tier: "S+",
    kinds: [...new Set(O1_CAPABILITIES.map((item) => item.kind))],
    ids: O1_CAPABILITIES.map((item) => item.id),
  };
}


export interface SpecialistAgent {
  id: string;
  parentCapability: string;
  role: string;
  objective: string;
  parallelGroup: string;
  fallback: string[];
}

export function specialistAgents(id: string): SpecialistAgent[] {
  const root = capability(id);
  if (!root) return [];
  return root.children.map((child, index) => ({
    id: root.id + "::" + child,
    parentCapability: root.id,
    role: child,
    objective: root.description,
    parallelGroup: root.id + "::parallel",
    fallback: index === 0 ? root.fallback : [],
  }));
}
