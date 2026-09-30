---
name: codebase-design
---
# O1 adaptation of Matt Pocock's codebase-design discipline

Prefer deep modules: a small interface with substantial behavior behind it.
Name and test the Seam where callers observe the module.
Use Module, Interface, Implementation, Seam, Adapter, Depth, Leverage and Locality consistently.
Prefer one real seam over many thin pass-through layers.
Tests should exercise the same public seam callers use.