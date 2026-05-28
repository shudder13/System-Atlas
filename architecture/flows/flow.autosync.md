---
id: flow.autosync
name: UI edit → autosync export
description: Edits in the canvas debounce-export the pack and update Pack Health.
owner: architecture
criticality: high
steps:
  - id: s1
    label: Architect edits a node in the Inspector
    nodeId: module.inspector
  - id: s2
    label: App debounces, calls /api/export with the current baseRevision
    nodeId: api.rest
  - id: s3
    label: exportAtlas writes the changed concept files and regenerates derived files
    nodeId: module.atlas_files
  - id: s4
    label: Pack Health turns healthy; status footer shows synced timestamp
failureModes:
  - External edit happens between debounce and Export → 409 conflict
  - Disk write fails mid-export and pack becomes misaligned
acceptanceChecks:
  - 409 surfaces to the user as 'External changes — reload or force'
  - Pack Health flags misalignment within one revision check
linkedTests: []
notes: ""

---

# UI edit → autosync export

Edits in the canvas debounce-export the pack and update Pack Health.

## Steps

- Architect edits a node in the Inspector (module.inspector)
- App debounces, calls /api/export with the current baseRevision (api.rest)
- exportAtlas writes the changed concept files and regenerates derived files (module.atlas_files)
- Pack Health turns healthy; status footer shows synced timestamp
