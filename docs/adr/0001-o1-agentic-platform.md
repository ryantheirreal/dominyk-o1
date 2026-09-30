# ADR 0001: O1 agentic platform architecture

## Status

Accepted

## Decision

O1 separates intelligence from execution infrastructure.

The model reasons about goals and proposes actions. The Mission Governor controls planning, budgets, checkpoints, recovery and verification. The Permission/Policy kernel controls whether an action is allowed. Computer providers execute approved actions. Connector adapters perform external side effects and emit durable receipts.

Computer infrastructure is provider-neutral. Persistent computers may run on a VM provider such as Hetzner; browser-only work may use a managed browser provider; disposable workloads may use ephemeral sandboxes. Local Docker remains a development/CI implementation.

## Consequences

The product can change models or infrastructure providers without changing the user-facing agent contract. External actions remain auditable and permissioned. Provider credentials stay outside model context.
