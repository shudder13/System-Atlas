import { AlertCircle, Bot, Code2, FileText, GitCompare } from "lucide-react";
import { AtlasProposal, ValidationIssue } from "../types";

interface PreviewPanelProps {
  tab: "overview" | "mermaid" | "validation" | "ai";
  onTabChange: (tab: "overview" | "mermaid" | "validation" | "ai") => void;
  overview: string;
  mermaid: string;
  issues: ValidationIssue[];
  aiBrief: string;
  migrationBrief: string;
  activeProposal?: AtlasProposal;
}

export function PreviewPanel({ tab, onTabChange, overview, mermaid, issues, aiBrief, migrationBrief, activeProposal }: PreviewPanelProps) {
  const content = {
    overview,
    mermaid,
    validation: issues.length
      ? issues.map((issue) => `[${issue.severity}] ${issue.code}: ${issue.message}`).join("\n")
      : "No validation issues found.",
    ai: activeProposal ? migrationBrief : aiBrief
  }[tab];

  return (
    <section className="preview-panel">
      <div className="preview-tabs">
        <button type="button" className={tab === "overview" ? "active" : ""} onClick={() => onTabChange("overview")}><FileText size={14} /> Summary</button>
        <button type="button" className={tab === "mermaid" ? "active" : ""} onClick={() => onTabChange("mermaid")}><Code2 size={14} /> Diagram</button>
        <button type="button" className={tab === "validation" ? "active" : ""} onClick={() => onTabChange("validation")}><AlertCircle size={14} /> Issues</button>
        <button type="button" className={tab === "ai" ? "active" : ""} onClick={() => onTabChange("ai")}>
          {activeProposal ? <GitCompare size={14} /> : <Bot size={14} />} {activeProposal ? "Migration Brief" : "AI Context"}
        </button>
      </div>
      <pre>{content}</pre>
    </section>
  );
}
