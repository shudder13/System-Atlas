---
id: flow.brownfield_import
name: Brownfield import → first atlas
description: Scan an existing repository, promote useful discovered facts into authored nodes, then commit the architecture pack.
owner: architecture
criticality: high
steps:
  - id: s1
    label: Point System Atlas at the consumer project (SYSTEM_ATLAS_WORKSPACE)
    nodeId: container.api
  - id: s2
    label: Click Scan → /api/scan indexes structure, files, classes, routes, schemas
    nodeId: module.atlas_files
  - id: s3
    label: Review Import Review and promote relevant evidence into authored nodes
    nodeId: module.import_review
  - id: s4
    label: Manually model datastores, contracts, flows, risks, decisions
    nodeId: module.inspector
  - id: s5
    label: Export the pack so the AI agent reads it on the next session
    nodeId: module.atlas_files
failureModes:
  - Scanner mis-classifies a file and adds noise to the atlas
  - Architect over-promotes inferred facts without confirming them
acceptanceChecks:
  - "Inferred nodes carry confidence: inferred until reviewed"
  - Pack Health reports healthy after Export
linkedTests:
  - server/atlasFiles.test.ts
notes: ""

---

# Brownfield import → first atlas

Scan an existing repository, promote useful discovered facts into authored nodes, then commit the architecture pack.

## Steps

- Point System Atlas at the consumer project (SYSTEM_ATLAS_WORKSPACE) (container.api)
- Click Scan → /api/scan indexes structure, files, classes, routes, schemas (module.atlas_files)
- Review Import Review and promote relevant evidence into authored nodes (module.import_review)
- Manually model datastores, contracts, flows, risks, decisions (module.inspector)
- Export the pack so the AI agent reads it on the next session (module.atlas_files)
