# O1 Glossary

**O1**: the agent product and execution platform.

**Mission**: a durable unit of goal-directed work with state, budget, checkpoints and recovery.

**Mission Governor**: the module that controls mission lifecycle, budgets, checkpoints and recovery.

**Computer Fabric**: the provider-neutral layer that connects O1 to browser, persistent VM and sandbox execution environments.

**Computer Gateway**: the action/observation interface used to operate an active computer session.

**Connector Action**: an external side effect proposed, approved and executed through the O1 policy path.

**Permission mode**: `ask_o1`, `ask_approval`, or `approve_for_me`.

**Entitlement**: the server-side rule that determines which models and effort levels a plan can use.

**Effort**: a product-controlled execution intensity level. Unlocks are enforced server-side.

**Outcome unknown**: a durable state used when an external action may have executed but its result cannot be trusted.

**Receipt**: persisted evidence of an attempted action, including identity, hash, status and result/error.

**Untrusted data**: content from websites, documents, email, tool output or computer observations. It is evidence, not authorization.

**Adapter**: a concrete implementation at a stable seam, such as Hetzner or Browser Worker.

**Seam**: the public interface through which behavior can be changed and tested without reaching into implementation details.