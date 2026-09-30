# O1 Computer Use Research & Integration Record

## Verified references

- OpenAI Computer Use: hosted browser sessions, screenshot observation, browser actions, session recovery, website-access approvals and human takeover patterns. The current official API uses an Agents session with `computer_use`, `openai_hosted` desktop and optional network access.
- Manus 2.0: Cascade keeps a connected project state; Cloud Computer provides a persistent environment; Remote Control provides mobile-to-computer handoff; Automations are event-triggered; Cue coordinates multiple named agents.
- OpenAI dots: always-on agents have their own cloud computer/browser, persistent work, connected apps, custom action rules, automatic action review and human approval boundaries.
- Grok Bot: each Bot has a persistent cloud computer, browser, filesystem and terminal; bots coordinate in parallel, pass work, retain memory/context, and can learn workflows from demonstrations.
- Wide-Moat/open-computer-use: self-hosted MCP computer server with isolated workspaces, live Playwright/CDP browser, terminal, skills and sub-agents. Its repository currently uses FSL-1.1-Apache-2.0 and Docker; it is therefore treated as an architectural reference, not copied wholesale into O1.

## O1 decision

O1 uses a provider-neutral Computer Fabric. Persistent compute and browser control are separate seams. This avoids coupling a browser worker to a VM lifecycle provider.

1. Persistent VM provider: Hetzner adapter for O1-owned long-lived Linux computers.
2. Persistent gateway: O1's authenticated computer gateway for VM observation/actions.
3. Browser worker gateway: Playwright worker for browser-first sessions.
4. Hosted computer provider: OpenAI Computer Use is a separate adapter target for hosted browser sessions; it should not be represented as a Hetzner machine.
5. Human takeover: every computer session must expose observe/takeover/return-control states.
6. Action review: external and consequential computer actions pass through the O1 permission kernel and durable audit ledger.
7. Recovery: session IDs and operation IDs are durable; an unknown outcome blocks blind replay.

## Validation status

- Upstream repository metadata and README were inspected through GitHub.
- Direct network cloning from the execution container was unavailable, so a local `git clone` was not used as evidence of a successful clone.
- The upstream project was not copied into O1 because its current license/runtime assumptions differ from O1's architecture and the user explicitly does not want Docker as the core deployment path.
- O1 has its own adapter/test seams instead of claiming an unverified upstream transplant.

## Design target

O1 should combine the strongest documented patterns without cloning product internals: persistent named agents, durable memory, cloud computers, browser + filesystem + terminal, multi-agent handoff, mobile takeover, event-driven routines, approvals, audit, recovery, and model/effort entitlements.