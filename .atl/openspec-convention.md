# OpenSpec Convention

File layout for openspec mode:

- openspec/project.yaml: Project configuration and mode.
- openspec/changes/{change-name}/
  - proposal.md
  - spec.md
  - design.md
  - tasks.md
  - apply-progress.md
  - verify-report.md
  - archive-report.md
  - state.yaml: DAG state for the change.
- openspec/sdd-init/{project}.yaml: Initial project context.