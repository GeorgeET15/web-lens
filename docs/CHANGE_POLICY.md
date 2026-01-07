# WebLens v1 Change Control Policy

**Version**: 1.0.0  
**Status**: ACTIVE  
**Last Updated**: 2025-12-29

---

## PURPOSE

This document defines what changes are ALLOWED and FORBIDDEN in WebLens v1.x releases. It serves as a reference for maintainers, contributors, and users to understand the stability guarantees of the v1 series.

---

## VERSIONING SCHEME

WebLens follows **Semantic Versioning 2.0.0**:

```
MAJOR.MINOR.PATCH
  1  .  x  .  y
```

- **MAJOR (1)**: Frozen. Increments only for breaking changes.
- **MINOR (x)**: New features that preserve backward compatibility.
- **PATCH (y)**: Bug fixes and non-functional improvements.

---

## ALLOWED CHANGES IN v1.x

### ✅ Bug Fixes (PATCH Releases)

**Definition**: Corrections to unintended behavior that do NOT alter the semantic contract.

**Examples**:
- Fixing a crash in the element resolver
- Correcting an off-by-one error in loop iteration
- Fixing a memory leak in the browser engine
- Resolving a race condition in scenario execution

**Requirements**:
- Must preserve existing block behavior
- Must not change validation rules (unless fixing a false positive)
- Must not alter execution order

**Forbidden**:
- Changing how a block interprets its parameters
- Relaxing validation to allow previously invalid flows
- Altering resolution scoring weights

---

### ✅ Performance Optimizations (PATCH Releases)

**Definition**: Improvements to speed, memory usage, or resource efficiency that produce IDENTICAL results.

**Examples**:
- Caching resolved elements within a single execution
- Optimizing JSON serialization
- Reducing screenshot file sizes (lossless compression)
- Browser session pooling (with guaranteed isolation)

**Requirements**:
- Must produce byte-for-byte identical execution reports
- Must not change observable behavior
- Must not skip validation or safety checks

**Forbidden**:
- Skipping screenshots to "speed up" execution
- Reusing browser sessions across scenarios (breaks isolation)
- Parallelizing block execution (breaks determinism)

---

### ✅ Documentation Updates (PATCH Releases)

**Definition**: Clarifications, corrections, or expansions to documentation.

**Examples**:
- Fixing typos in README.md
- Adding examples to block descriptions
- Updating API endpoint documentation
- Improving error message clarity

**Requirements**:
- Must not promise features that don't exist
- Must accurately reflect current behavior

**Forbidden**:
- Documenting aspirational features as "implemented"
- Removing safety warnings from documentation

---

### ✅ UI Polish (PATCH Releases)

**Definition**: Visual improvements that do NOT change functionality.

**Examples**:
- Adjusting block colors or spacing
- Improving button hover states
- Fixing layout bugs in the editor
- Adding loading spinners for better UX

**Requirements**:
- Must not change how blocks are configured
- Must not alter execution behavior
- Must not remove existing UI elements

**Forbidden**:
- Adding a "Skip Validation" button
- Removing the "Pick Element" button
- Changing block parameter types (e.g., text input → dropdown)

---

### ✅ New Block Types (MINOR Releases)

**Definition**: Adding new predefined block types that extend functionality without breaking existing flows.

**Examples**:
- Adding a "Verify Network Request" block
- Adding a "Take Screenshot" block
- Adding a "Wait for Animation" block

**Requirements**:
- Must follow Zero-Code philosophy (no code injection)
- Must produce TAF evidence
- Must pass validation gate
- Must be semantically sound (no selector-based logic)

**Forbidden**:
- Adding a "Run JavaScript" block
- Adding a "CSS Selector" block
- Adding blocks that bypass validation

---

### ✅ Additive Schema Changes (MINOR Releases)

**Definition**: Adding NEW optional fields to the Flow JSON schema.

**Examples**:
- Adding an optional `description` field to blocks
- Adding an optional `tags` array to flows
- Adding an optional `timeout` field to element resolution

**Requirements**:
- New fields must be OPTIONAL (have defaults)
- Old flows must load without modification
- New fields must not alter execution behavior

**Forbidden**:
- Removing existing fields
- Renaming fields
- Making optional fields required

---

## FORBIDDEN CHANGES IN v1.x

### ❌ Breaking Schema Changes

**Examples**:
- Removing the `role` field from `ElementRef`
- Renaming `then_blocks` to `thenBlocks`
- Changing `timeout_seconds` from number to string

**Rationale**: Would break existing flows and violate lossless persistence.

---

### ❌ Changing Block Semantics

**Examples**:
- Making `ClickElement` perform a double-click
- Changing `EnterText` to NOT clear the field first
- Making `IfCondition` evaluate conditions differently

**Rationale**: Would alter the behavior of existing flows, causing silent regressions.

---

### ❌ Relaxing Validation Rules

**Examples**:
- Allowing flows with orphaned blocks to execute
- Allowing `EnterText` blocks with empty text fields
- Removing the loop safety check

**Rationale**: Would undermine the validation gate's purpose and allow broken flows to run.

---

### ❌ Adding Selector-Based Logic

**Examples**:
- Adding a "CSS Selector" field to blocks
- Allowing XPath in element picking
- Exposing WebDriver's `find_element_by_css_selector`

**Rationale**: Violates the Zero-Code contract and semantic intent philosophy.

---

### ❌ Partial Execution

**Examples**:
- Adding a "Run from Block X" feature
- Allowing flows with missing parameters to execute
- Adding a "Skip Block" option

**Rationale**: Breaks determinism and creates ambiguous execution states.

---

### ❌ Expression Logic

**Examples**:
- Allowing `{{var1 + var2}}` in text fields
- Adding a "Calculate" block
- Supporting conditional expressions in parameters

**Rationale**: Reduces explainability and introduces complexity.

---

### ❌ AI Healing or Guessing

**Examples**:
- Auto-correcting broken element references
- Using ML to "guess" which element the user meant
- Suggesting alternative elements when resolution fails

**Rationale**: Violates the "Honest Failure" principle and masks regressions.

---

### ❌ Removing Validation Checks

**Examples**:
- Removing the connectivity check
- Removing the parameter completeness check
- Removing the loop safety check

**Rationale**: Would allow broken flows to execute, undermining reliability.

---

### ❌ Changing Execution Order

**Examples**:
- Parallelizing block execution
- Reordering blocks for "optimization"
- Executing branches before conditions

**Rationale**: Breaks determinism and makes flows unpredictable.

---

### ❌ Mutable Execution Artifacts

**Examples**:
- Allowing users to edit execution logs
- Allowing users to delete screenshots
- Allowing users to modify TAF entries

**Rationale**: Undermines trust in execution artifacts as the source of truth.

---

## RELEASE PROCESS

### PATCH Release (v1.0.x)
1. Verify change is a bug fix, performance optimization, or documentation update
2. Ensure no semantic changes
3. Run full test suite
4. Update CHANGELOG.md
5. Tag release: `v1.0.x`

### MINOR Release (v1.x.0)
1. Verify change is additive (new blocks, optional fields)
2. Ensure backward compatibility
3. Run full test suite + migration tests
4. Update CHANGELOG.md
5. Tag release: `v1.x.0`

### MAJOR Release (v2.0.0)
1. Document breaking changes
2. Provide migration guide
3. Update `WEBLENS_V1_INVARIANTS.md` → `WEBLENS_V2_INVARIANTS.md`
4. Run full test suite
5. Tag release: `v2.0.0`

---

## DECISION TREE

```
Is the change a bug fix?
├─ YES → Is it semantic-preserving?
│   ├─ YES → PATCH release ✅
│   └─ NO → MAJOR release (breaking change)
└─ NO → Is it a new feature?
    ├─ YES → Is it backward-compatible?
    │   ├─ YES → MINOR release ✅
    │   └─ NO → MAJOR release (breaking change)
    └─ NO → Is it documentation/UI polish?
        ├─ YES → PATCH release ✅
        └─ NO → Reject (not allowed)
```

---

## ENFORCEMENT

This policy is BINDING. Any v1.x release that violates these rules must be:
1. Immediately yanked from distribution
2. Replaced with a corrected release
3. Documented in a post-mortem

For questions or exceptions, consult:
- `WEBLENS_V1_INVARIANTS.md` (Frozen Guarantees)
- `README.md` (Core Philosophy)
- Project maintainers

---

**END OF CHANGE POLICY**
