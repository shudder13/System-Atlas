import { AlertCircle, Bot, FileText, GitCompare } from "lucide-react";
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
      <div className="preview-tabs">
        <button type="button" className={tab === "overview" ? "active" : ""} onClick={() => onTabChange("overview")}><FileText size={14} /> Summary</button>
        <button type="button" className={tab === "validation" ? "active" : ""} onClick={() => onTabChange("validation")}><AlertCircle size={14} /> Issues</button>
        <button type="button" className={tab === "review" ? "active" : ""} onClick={() => onTabChange("review")}><AlertCircle size={14} /> Review</button>
        <button type="button" className={tab === "ai" ? "active" : ""} onClick={() => onTabChange("ai")}>
          {activeProposal ? <GitCompare size={14} /> : <Bot size={14} />} {activeProposal ? "Migration Brief" : "AI Context"}
        </button>
      </div>
      <pre>{content}</pre>
    </section>
  );
}
