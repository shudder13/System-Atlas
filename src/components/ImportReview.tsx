import { CheckCircle2, Eye, FileDown, Search, X } from "lucide-react";
import { matchesQuery } from "../lib/shared";
import { useMemo, useState } from "react";
import { generateImportCandidates, promoteImportCandidates } from "../lib/atlas";
import { AtlasProject, ImportCandidate } from "../types";

interface ImportReviewProps {
  project: AtlasProject;
  isLoading?: boolean;
  onChange: (project: AtlasProject) => void;
  onPreview: (candidate: ImportCandidate) => void;
}

const groupLabels: Record<ImportCandidate["group"], string> = {
  route: "API Routes",
  schema: "Schemas",
  class: "Classes",
  migration: "Migrations",
  file: "Files"
};

export function ImportReview({ project, isLoading = false, onChange, onPreview }: ImportReviewProps) {
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
  const allCandidates = useMemo(() => generateImportCandidates(project), [project]);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleCandidates = allCandidates.filter((candidate) =>
    !hiddenIds.has(candidate.id) &&
    matchesQuery(normalizedQuery, candidate.title, candidate.subtitle, candidate.summary, candidate.sourcePath)
  );
  const selectedCandidates = allCandidates.filter((candidate) => selectedIds.has(candidate.id));
  const grouped = visibleCandidates.reduce<Record<string, ImportCandidate[]>>((groups, candidate) => {
    groups[candidate.group] = groups[candidate.group] ?? [];
    groups[candidate.group].push(candidate);
    return groups;
  }, {});

  function toggleCandidate(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectVisible() {
    setSelectedIds(new Set(visibleCandidates.map((candidate) => candidate.id)));
  }

  function hideSelected() {
    setHiddenIds((current) => new Set([...current, ...selectedIds]));
    setSelectedIds(new Set());
  }

  function promoteSelected() {
    if (selectedCandidates.length === 0) return;
    const next = promoteImportCandidates(project, selectedCandidates);
    onChange(next);
    onPreview(selectedCandidates[0]);
    setSelectedIds(new Set());
  }

  if (isLoading && !project.intelligence.generatedAt) {
    return (
      <section className="import-review-empty">
        <FileDown size={22} />
        <h3>Loading Import Review</h3>
        <p>Reading saved code intelligence before suggesting architecture concepts.</p>
      </section>
    );
  }

  if (!project.intelligence.generatedAt) {
    return (
      <section className="import-review-empty">
        <FileDown size={22} />
        <h3>No Scan Yet</h3>
        <p>Run Scan to discover files, classes, API routes, database schemas, dependencies, and tests.</p>
      </section>
    );
  }

  return (
    <section className="import-review">
      <div className="import-review-toolbar">
        <div className="code-intel-summary">
          <strong>Import Review</strong>
          <span>{allCandidates.length} suggestions · {selectedCandidates.length} selected</span>
        </div>
        <label className="code-intel-search">
          <Search size={14} />
          <input value={query} placeholder="Filter suggestions" onChange={(event) => setQuery(event.target.value)} />
        </label>
      </div>

      <div className="import-review-actions">
        <button type="button" onClick={selectVisible} disabled={visibleCandidates.length === 0}>Select Visible</button>
        <button type="button" className="primary" onClick={promoteSelected} disabled={selectedCandidates.length === 0}>
          <CheckCircle2 size={14} /> Promote Selected
        </button>
        <button type="button" onClick={hideSelected} disabled={selectedCandidates.length === 0}>
          <X size={14} /> Hide
        </button>
        {hiddenIds.size > 0 ? <button type="button" onClick={() => setHiddenIds(new Set())}>Show Hidden</button> : null}
      </div>

      <div className="import-review-list">
        {visibleCandidates.length ? (
          Object.entries(grouped).map(([group, candidates]) => (
            <section key={group}>
              <h3>{groupLabels[group as ImportCandidate["group"]]} <span>{candidates.length}</span></h3>
              {candidates.map((candidate) => (
                <article className="import-review-card" key={candidate.id}>
                  <label className="import-review-check">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(candidate.id)}
                      onChange={() => toggleCandidate(candidate.id)}
                    />
                    <span>
                      <strong>{candidate.title}</strong>
                      <small>{candidate.subtitle}</small>
                    </span>
                  </label>
                  <p>{candidate.summary}</p>
                  <div className="code-intel-pills">
                    <span>{candidate.node.type.replace(/_/g, " ")}</span>
                    <span>{candidate.viewId.replace(/_/g, " ")}</span>
                    {candidate.node.linkedTests.length ? <span>{candidate.node.linkedTests.length} tests</span> : null}
                  </div>
                  <button type="button" className="compact" onClick={() => onPreview(candidate)}>
                    <Eye size={13} /> Preview
                  </button>
                </article>
              ))}
            </section>
          ))
        ) : (
          <p className="code-intel-empty-list">
            {allCandidates.length ? "No suggestions match this filter." : "No import suggestions left. The scanned facts are already modeled or hidden."}
          </p>
        )}
      </div>
    </section>
  );
}

