# O1 OpenBot base

O1 uses CopilotKit OpenBot as the execution/control-plane base and retains the OpenMuse personal-agent/mobile experience.

Upstream: https://github.com/CopilotKit/OpenBot
Pinned upstream commit: afe623366945d6378dde5ea9c46322ac856c3047
License: MIT.

## High-value upstream contracts

- agent-computer action barrier, browser runtime, takeover control, shell and workspace isolation
- agent handoff, handoff runner and handoff delivery
- computer gateway/provider
- authentication and identity-provider boundaries
- MCP/plugin grants and policy
- durable routines and routine firing
- append-only audit model and secret redaction

## O1 translation

O1 exposes provider-independent contracts to product code:

mission -> capability graph -> policy -> tool/connector -> execution -> verification -> artifact -> audit.

The existing OpenMuse mobile/web experience remains the presentation layer. The single-owner boundary is transitional; public multi-tenant launch requires organization, membership, RBAC, per-agent isolation, durable audit and tenant-scoped data.

## Attribution

Any OpenBot-derived source retained in O1 must preserve the upstream MIT license and copyright notices. O1-specific modules are separated from the upstream source so their ownership and provenance remain explicit.
