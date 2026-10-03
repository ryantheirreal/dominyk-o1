# Unificação do Whilo: OpenBot, OpenMuse e Muse Gadgets

## Decisão de produto

**OpenBot é a melhor referência de fundação operacional.** O projeto separa um computador por agente, passa ações por um gateway único, aplica política fail-closed, registra auditoria, protege segredos e oferece componentes aprovados. Isso é a base correta para compras, porque uma reserva ou cobrança precisa de escopo, revisão e trilha.

**OpenMuse é a melhor referência de experiência.** Ele combina chat pessoal com navegador, terminal, arquivos, tarefas duráveis, takeover e cartões ricos. O padrão de cartões de comparação e escolha guiada é especialmente adequado para Viagens e Compras.

O Whilo deve unir os dois: **governança do OpenBot + experiência pessoal do OpenMuse**. A decisão não é copiar internals; é manter os contratos próprios do Whilo e adotar os padrões observáveis.

## Atualizações verificadas em 03/10/2026

- O OpenBot publicou `v0.1.0` no commit `cb5dc32` em 03/10/2026. O README atual destaca gateway único, política CEL fail-closed, auditoria, componentes, takeover e isolamento por agente.
- O OpenMuse recebeu `Run the agent computer on an E2B Desktop sandbox` (`b06caad`) e `Add optional Parallel web search to chat and tasks` (`ea23f63`) em 02/10/2026. O README atual destaca mobile/web, cartões ricos, tarefas duráveis, comparação com fontes e a restrição de que checkout autônomo ainda é futuro.
- A Meta publicou o Muse Gadget SDK. A página oficial descreve SDK para ESP32 e Linux/Raspberry Pi, telas, botões, sensores e atuadores, sob Apache 2.0. O Whilo registra isso como uma integração futura de hardware, não como dependência de execução.

## Implementado nesta etapa

1. Viagens ganhou templates `weekend`, `family`, `business` e `long_stay`, checklist de preferências, três estratégias de comparação e links de pesquisa.
2. O agente ganhou preparação de compras em `POST /api/o1/purchases/prepare` e na ferramenta `prepare_purchase`, com resumo estruturado, HTTPS obrigatório, bloqueio de hosts locais e takeover de navegador no checkout.
3. A compra continua com `finalSubmit: human_only`: o agente pode pesquisar e preparar, mas não digita dados de pagamento nem clica na confirmação final.
4. A função de Pagamentos existente continua protegida por aprovação humana obrigatória.

## Próximos passos técnicos

- Criar adaptadores de fornecedores com preços reais e validade explícita.
- Persistir cotação, expiração e hash da revisão para impedir alteração silenciosa entre aprovação e checkout.
- Abrir uma sessão de navegador isolada e entregar takeover no cartão de compra.
- Adicionar um adaptador opcional para o Muse Gadget SDK usando eventos de status, sem permitir que um botão físico contorne o approval kernel.

## Referências

[1]: https://github.com/CopilotKit/openbot "CopilotKit OpenBot repository"
[2]: https://github.com/CopilotKit/openmuse "CopilotKit OpenMuse repository"
[3]: https://github.com/facebookincubator/muse-gadget-sdk "Meta Muse Gadget SDK repository"
[4]: https://gadgets.muse.ai/ "Muse Gadgets official site"
[5]: https://olhardigital.com.br/2026/10/02/inteligencia-artificial/meta-abre-codigo-do-muse-para-voce-criar-seu-proprio-gadget-de-ia/ "Olhar Digital: Meta abre código do Muse"
