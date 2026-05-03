# System Atlas Project Memory

System Atlas is a local-first architecture workbench. The source of truth for modeled systems is the repo-native `architecture/` pack, not a hosted database.

When working on this repository:

- Prefer small, typed changes that preserve the architecture pack round trip: UI edits export files, file edits reload in the UI.
- Run `npm run build` and `npm test` before committing application changes.
- Use the System Atlas skill for architecture-map workflows, migration briefs, and atlas-aware implementation work.

See `.claude/skills/system-atlas/SKILL.md` for the project-specific atlas workflow.
