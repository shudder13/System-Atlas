---
id: flow.workspace_switch
name: Add a project → switch workspace
description: A single workbench instance manages many projects. Adding a workspace registers it and makes it current; switching reloads the pack without restart.
owner: architecture
criticality: high
steps:
  - id: s1
    label: User pastes an absolute project path into the picker (or onboarding card)
    nodeId: module.workspace_picker
  - id: s2
    label: Client POSTs /api/workspaces { path, name? }
    nodeId: api.rest
  - id: s3
    label: workspaces module validates path, dedupes by canonical form, persists atomically
    nodeId: module.workspaces
  - id: s4
    label: Server marks the new workspace current; next /api/project resolves against it
  - id: s5
    label: Client re-fetches project + health and renders the new pack
failureModes:
  - Bad path → 400 path_not_found
  - Concurrent writes from two server instances would race the JSON file (single-user assumption holds)
acceptanceChecks:
  - After switch, Pack Health and inventory reflect the new project within one render
  - Registry survives server restart
linkedTests:
  - server/workspaces.test.ts
notes: ""

---

<!-- The sections below are GENERATED from the YAML frontmatter above. Edit the frontmatter (or use the UI); body edits are overwritten on the next export. -->

# Add a project → switch workspace

A single workbench instance manages many projects. Adding a workspace registers it and makes it current; switching reloads the pack without restart.

## Steps

- User pastes an absolute project path into the picker (or onboarding card) (module.workspace_picker)
- Client POSTs /api/workspaces { path, name? } (api.rest)
- workspaces module validates path, dedupes by canonical form, persists atomically (module.workspaces)
- Server marks the new workspace current; next /api/project resolves against it
- Client re-fetches project + health and renders the new pack
