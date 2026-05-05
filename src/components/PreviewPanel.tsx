import { AlertCircle, Bot, Code2, FileText, GitCompare } from "lucide-react";
import { AtlasProject, AtlasProposal, ValidationIssue } from "../types";
import { CodeIntelligenceExplorer } from "./CodeIntelligenceExplorer";

interface PreviewPanelProps {
  tab: "overview" | "mermaid" | "validation" | "review" | "code" | "ai";
  onTabChange: (tab: "overview" | "mermaid" | "validation" | "review" | "code" | "ai") => void;
  project: AtlasProject;
  selectedId: string;
  overview: string;
  mermaid: string;
  issues: ValidationIssue[];
  architectureReview: string;
  codeIntelligence: string;
  aiBrief: string;
  migrationBrief: string;
  activeProposal?: AtlasProposal;
  onSelect: (id: string) => void;
}

export function PreviewPanel({ tab, onTabChange, project, selectedId, overview, mermaid, issues, architectureReview, codeIntelligence, aiBrief, migrationBrief, activeProposal, onSelect }: PreviewPanelProps) {
  const content = {
    overview,
    mermaid,
    validation: issues.length
      ? issues.map((issue) => `[${issue.severity}] ${issue.code}: ${issue.message}`).join("\n")
      : "No validation issues found.",
    review: architectureReview,
    code: codeIntelligence,
    ai: activeProposal ? migrationBrief : aiBrief
  }[tab];

  return (
    <section className="preview-panel">
      <div className="preview-tabs">
        <button type="button" className={tab === "overview" ? "active" : ""} onClick={() => onTabChange("overview")}><FileText size={14} /> Summary</button>
        <button type="button" className={tab === "mermaid" ? "active" : ""} onClick={() => onTabChange("mermaid")}><Code2 size={14} /> Diagram</button>
        <button type="button" className={tab === "validation" ? "active" : ""} onClick={() => onTabChange("validation")}><AlertCircle size={14} /> Issues</button>
        <button type="button" className={tab === "review" ? "active" : ""} onClick={() => onTabChange("review")}><AlertCircle size={14} /> Review</button>
        <button type="button" className={tab === "code" ? "active" : ""} onClick={() => onTabChange("code")}><Code2 size={14} /> Code Intel</button>
        <button type="button" className={tab === "ai" ? "active" : ""} onClick={() => onTabChange("ai")}>
          {activeProposal ? <GitCompare size={14} /> : <Bot size={14} />} {activeProposal ? "Migration Brief" : "AI Context"}
        </button>
      </div>
      {tab === "code"
        ? <CodeIntelligenceExplorer project={project} selectedId={selectedId} onSelect={onSelect} />
        : <pre>{content}</pre>}
    </section>
  );
}
