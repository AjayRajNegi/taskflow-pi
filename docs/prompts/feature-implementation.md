description: Implement an approved task.
---

Implement task `T-007`.

## Before coding

Read:

- `docs/tasks/T-007.md`
- `docs/project-requirements.md`
- `docs/architecture.md`
- `docs/system-components.md`
- `docs/data-model.md`
- `docs/api-contracts.md`
- `docs/security.md`

Read only the documents relevant to the task if some are not applicable.

Treat the approved design documents and task specification as the
source of truth.

Do not redesign the system while implementing the task.

## Implementation rules

1. Implement only `T-007`.
2. Satisfy every acceptance criterion in `docs/tasks/T-007.md`.
3. Do not implement functionality listed as out of scope.
4. Preserve existing behavior outside this task.
5. Respect the architecture, component boundaries, API contracts,
   data model, and security rules.
6. Do not introduce new dependencies unless the task explicitly
   requires one.
7. Do not silently make product or architectural decisions.

## Scope

Prefer touching only files identified by the task.

If another file must be changed to correctly implement the task:

- make the smallest necessary change;
- explain why it was necessary;
- include it in the final report.

Do not perform unrelated refactoring or cleanup.

## Verification

If the task cannot be implemented without resolving an ambiguity or
changing an approved design decision, stop and report the issue instead
of inventing a solution.

## Final report

Report:

- Files changed
- Any deviations from the task
- Any unresolved issues

Do not modify the task specification or design documents unless the
task explicitly requires documentation changes.
