# O1 agent skill invocation

Skills are local, explicit engineering instructions. Prefer the smallest applicable skill and combine them rather than creating one giant process.

For implementation:
1. Use codebase-design when a seam or interface is unclear.
2. Use tdd for a concrete behavior change.
3. Use diagnosing-bugs for a reproducible failure.
4. Use implement for the end-to-end slice.
5. Use code-review after implementation.

Independent roles can inspect separate concerns in parallel, but only one integration path owns the final shared files at a time.
