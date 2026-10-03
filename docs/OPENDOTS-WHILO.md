# OpenDots → Whilo

## O que o OpenDots acrescenta

O OpenDots é um template MIT da CopilotKit para coworkers de IA persistentes. A versão consultada em 3 de outubro de 2026 tinha 1.858 estrelas e atualização no mesmo dia. A arquitetura usa AG-UI para transportar mensagens, tool calls e estado; TanStack AI para streaming e execução no servidor; Threads para conversas duráveis; OpenBot para computadores isolados; e Channels SDK para Slack.[1] [2]

O valor mais importante para o Whilo não é copiar a aparência do OpenDots. É adotar quatro contratos de produto:

1. **Dots especialistas:** cada agente tem nome, papel, instruções, memória e ferramentas permitidas. Isso combina com o registro de agentes já existente no Whilo. O próximo passo é mostrar `toolScopes`, `memoryScope` e `modelPolicy` como permissões visíveis, em vez de deixar essas decisões escondidas no servidor.
2. **Spaces e Pages:** o trabalho persistente precisa terminar em um lugar editável. Para o Whilo, isso pode começar com uma biblioteca de artefatos e páginas de missão, com autosave, revisão de versão e aprovação antes de publicar.
3. **Computador por agente:** o navegador, arquivos e terminal devem ter perfil próprio, persistir entre sessões e aparecer inline no chat. O Whilo já possui computador, takeover, arquivos e trilha de auditoria; a melhoria é associá-los de forma explícita a cada agente especialista.
4. **Aprovação como produto:** o OpenDots mostra revisão antes de salvar uma página. O Whilo deve aplicar o mesmo padrão a qualquer efeito externo: salvar documento, enviar mensagem, reservar viagem ou confirmar compra.

## O que não deve ser copiado

O mascote e os elementos visuais do OpenDots/OpenMuse não devem substituir a marca Whilo. A logo enviada pelo usuário é a identidade oficial: baleia-orca preta, balão branco com “Whilo!” e fundo azul. O capivara antigo foi removido da superfície principal e a nova arte é usada como mascot, favicon e ícone de instalação.

Também não devemos copiar nomes, textos, vídeos ou código sem necessidade. A adoção é por comportamento e contrato: especialista isolado, páginas persistentes, computador governado e aprovação explícita.

## Direção de design do Whilo

**Whilo deve parecer uma central calma de trabalho, não um painel técnico.** A logo usa azul forte e preto; o restante da interface deve usar azul como ação primária, branco para superfícies, azul muito claro para contexto e laranja/vermelho somente para revisão, risco ou bloqueio.

O mascote deve aparecer em três situações: estado vazio, presença do agente e confirmação de que uma tarefa foi assumida. Não deve aparecer em todos os cartões, para não competir com o conteúdo. A baleia funciona como personalidade do produto; os Dots especialistas podem usar o mesmo símbolo com variações de cor e nome, sem criar uma nova espécie de mascote por função.

Os componentes prioritários são: cartão de tarefa persistente, cartão de revisão antes de salvar, cartão de comparação de viagens/compras, timeline de atividade, painel de computador e seletor de permissões. O Whilo já tem os últimos três em alguma forma; esta etapa adiciona a identidade visual oficial e a base PWA.

## PWA entregue

- Nome instalável: **Whilo**.
- Manifesto em `apps/mobile/public/manifest.json`.
- Service worker em `apps/mobile/public/sw.js` com estratégia network-first e fallback offline para a shell.
- Favicon e ícone derivados diretamente da arte fornecida, preservando transparência.
- Tema azul `#2E91F2` e fundo `#F7FBFF`.
- Build web validado com `pnpm --dir apps/mobile build:web`.

## Roadmap de alto impacto

- **Agora:** identidade Whilo, PWA, Dots especialistas visíveis, cartões de aprovação e comparação.
- **Depois:** Pages com edição e revisão de versão; cada missão gera um artefato editável em vez de apenas uma mensagem.
- **Depois:** computadores vinculados ao Dot, com perfis de browser e escopos de arquivos separados.
- **Depois:** voz e canais externos, começando por notificações aprovadas e mantendo o mesmo thread.
- **Sempre:** compras, pagamentos e ações físicas continuam com escopo explícito, recibo e aprovação humana quando houver efeito financeiro ou externo.

## Referências

[1]: https://github.com/CopilotKit/OpenDots "CopilotKit OpenDots repository"
[2]: https://www.copilotkit.ai/opendots "OpenDots product page"
[3]: https://github.com/CopilotKit/OpenBot "CopilotKit OpenBot repository"
[4]: https://openai.com/index/introducing-dots/ "OpenAI: Introducing dots"
