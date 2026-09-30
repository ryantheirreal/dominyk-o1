# O1 execution status

Updated: 2026-09-30

## Completed in this execution

- Permission UI and server now use `ask_o1`, `ask_approval`, and `approve_for_me`.
- Unknown stored permission values normalize to `ask_o1`.
- O1 connector sends honor the selected permission mode and persist action receipts.
- Three commercial plans are represented by one shared entitlement catalog.
- Server-side model and effort entitlement checks exist.
- Plans are exposed at `/api/o1/plans` and current entitlements at `/api/o1/entitlements`.
- Plan catalog is rendered inside the Apps screen.
- Mission Governor now has explicit lifecycle transitions, checkpoints, budgets and uncertain-outcome recovery.
- A provider-neutral persistent computer seam exists.
- A server-side Hetzner lifecycle adapter exists with focused tests.
- Hetzner configuration placeholders are documented in `.env.example`.
- A local O1 engineering-agent contract and selected Matt Pocock-inspired skills were added under `AGENTS.md` and `.agents/skills/`.

## Still pending

- Full agent-computer gateway on persistent VMs: a VM provider alone does not give O1 mouse/keyboard/browser/terminal control.
- Browser-provider adapter and ephemeral sandbox adapter are not yet wired into the common ComputerProvider interface.
- Model selection is catalogued, but the production model router/provider integrations still need real backends and usage accounting.
- Multi-tenant identity is not complete; the current authentication implementation still uses the existing shared-access-key/session architecture.
- Full approval-center UI for connector actions is not yet integrated into Activity.
- GitHub Actions status for the latest direct pushes is not exposed by the connected workflow wrapper.
- The connected Vercel account is readable, but the deployment action exposed in this session is unavailable; no O1 production deployment is claimed.

## Verification rule

Do not describe the pending items as implemented. Product claims must follow verified code, tests, and deployment receipts.

## Latest execution increments

- Mission plans now materialize explicit verification phases for gated capabilities.
- Model and effort preferences are persistent and entitlement-bound.
- A model readiness registry distinguishes catalogued models from configured providers.
- Browser interactions have idempotent action receipts and are routed through the O1 permission kernel.
- Browser Worker Playwright sessions can act as a browser computer gateway with screenshot, read, navigate, click, double-click, text, key and scroll.
- Persistent computer lifecycle is separated from browser control: Hetzner handles VM lifecycle while a dedicated persistent gateway handles VM actions.
- Remote computer actions have idempotency keys, hashes, receipts and uncertain-outcome handling.
- Authentication can optionally map multiple server-side access keys to distinct owners through O1_ACCESS_KEYS_JSON.
- The O1 audit ledger records identity, permission, mission, connector, model and computer activity with secret redaction.
- CI static audit now checks critical O1 naming and state contracts.