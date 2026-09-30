---
name: tdd
---
# O1 adaptation of Matt Pocock's TDD discipline

Work in vertical slices.
Red: add one behavior test at a public seam.
Green: implement only enough to pass.
Refactor later in review, not inside the red-green loop.
Never test private implementation details.
Expected values must come from the product contract, not a tautological reimplementation.