---
id: flow.external_edit_reconcile
name: External edit reconciliation
description: When architecture files change on disk while the UI has unsaved edits, prompt the architect to reload or force-export.
owner: architecture
criticality: high
steps:
  - id: s1
    label: API polls architectureRevision()
    nodeId: module.atlas_files
  - id: s2
    label: Web detects the on-disk revision diverged from the loaded one
  - id: s3
    label: User picks Reload (discard UI edits) or Export with force=true
failureModes:
  - User force-exports and loses upstream edits
acceptanceChecks:
  - Force path requires explicit confirmation
linkedTests: []
notes: ""

---

# External edit reconciliation

When architecture files change on disk while the UI has unsaved edits, prompt the architect to reload or force-export.

## Steps

- API polls architectureRevision() (module.atlas_files)
- Web detects the on-disk revision diverged from the loaded one
- User picks Reload (discard UI edits) or Export with force=true
