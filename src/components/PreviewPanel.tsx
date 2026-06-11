import { AlertCircle, Bot, Eye, FileText, GitCompare } from "lucide-react";
import { AtlasProposal, ValidationIssue } from "../types";

interface PreviewPanelProps {
  tab: "overview" | "validation" | "review" | "ai";
  onTabChange: (tab: "overview" | "validation" | "review" | "ai") => void;
  overview: string;
  issues: ValidationIssue[];
  architectureReview: string;
  aiBrief: string;
  migrationBrief: string;
  activeProposal?: AtlasProposal;
}

export function PreviewPanel({ tab, onTabChange, overview, issues, architectureReview, aiBrief, migrationBrief, activeProposal }: PreviewPanelProps) {
  const content = {
    overview,
    validation: issues.length
      ? issues.map((issue) => `[${issue.severity}] ${issue.code}: ${issue.message}`).join("\n")
      : "No validation issues found.",
    review: architectureReview,
    ai: activeProposal ? migrationBrief : aiBrief
  }[tab];

  return (
    <section className="preview-panel">
      <div className="preview-tabs" role="group" aria-label="Preview content">
        <button type="button" className={tab === "overview" ? "active" : ""} aria-pressed={tab === "overview"} onClick={() => onTabChange("overview")}><FileText size={14} /> Summary</button>
        <button type="button" className={tab === "validation" ? "active" : ""} aria-pressed={tab === "validation"} onClick={() => onTabChange("validation")}><AlertCircle size={14} /> Issues</button>
        {/* Distinct icon: Review previously shared AlertCircle with Issues. */}
        <button type="button" className={tab === "review" ? "active" : ""} aria-pressed={tab === "review"} onClick={() => onTabChange("review")}><Eye size={14} /> Review</button>
        <button type="button" className={tab === "ai" ? "active" : ""} aria-pressed={tab === "ai"} onClick={() => onTabChange("ai")}>
          {activeProposal ? <GitCompare size={14} /> : <Bot size={14} />} {activeProposal ? "Migration Brief" : "AI Context"}
        </button>
      </div>
      <pre>{content}</pre>
    </section>
  );
}
