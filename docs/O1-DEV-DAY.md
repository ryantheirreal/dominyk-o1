# O1 Dev Day — 35 S+ capabilities

O1 is organized as an execution platform rather than a chat surface.

OpenBot core: policy, audit, multi-agent, per-agent computer, MCP, skills, routines and enterprise identity.

OpenMuse experience: mobile/web, threads, documents, Gmail/Calendar, rich results, goals, browser continuity and takeover.

O1 runtime: Mission Governor, model routing, capability expansion, cost/latency controls, approval kernel and universal connector bus.

## 35 S+ capability map

1. Mission Governor
2. Multi-Agent Swarm
3. Long-Horizon Runtime
4. Persistent State
5. Context Compaction
6. Tool Discovery
7. Programmatic Tool Calls
8. Computer Control
9. Persistent Browser Runtime
10. Shell Sandbox
11. Remote Worktrees
12. Apply Patch Engine
13. Continuous Code Review
14. Security Review Cloud
15. Interactive Evaluations
16. Adaptive Model Router
17. Cost Governor
18. Ultra Speed Lane
19. Human Approval Kernel
20. Fail-Closed Policy Gateway
21. Append-Only Audit Ledger
22. Human Takeover
23. Skills Runtime
24. Governed MCP Gateway
25. MCP Event Automation
26. Universal Connector Bus
27. Messaging Fabric
28. Files + Retrieval
29. Live Artifact Pages
30. Realtime Voice Runtime
31. Durable Routines
32. Team Spaces
33. Enterprise Identity
34. Billing + Entitlements
35. Recovery + Observability

When quality is below 0.85, the Mission Runtime expands the capability into specialist sub-phases instead of pretending the primary path is sufficient.

## OpenAI DevDay 2026 mapping

OpenAI's September 29, 2026 recap announces 20+ major updates including persistent cloud agents, GPT-6.1 Sol, an ultra-fast lane, confidential intelligence, Codex Cloud, a redesigned Codex CLI with voice and an agents view, code review, security cloud scanning, a Decisions API, computer use in the Agents API, plugin extensions, MCP events, shared team spaces, live pages, collaborative slides, team tasks, Slack/Teams integration, meeting capture, shareable profiles, Sign in with ChatGPT and a marketplace.

O1 uses these as product requirements and translates them into its own runtime, UX and connector architecture. It does not copy OpenAI proprietary implementation.

## iMessage Bridge

The O1 messaging fabric supports the open-source imessage-bridge contract: GET /info, GET /messages?after=..., and POST /send with X-Bridge-Token. O1 requires explicit approval before a send.

The bridge is local macOS infrastructure and requires its own Messages.app permissions. Never put its token in source control.
