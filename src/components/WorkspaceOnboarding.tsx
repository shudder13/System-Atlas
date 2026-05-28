import { FolderPlus } from "lucide-react";
import { useState } from "react";

interface WorkspaceOnboardingProps {
  onAdd: (path: string, name?: string) => Promise<void>;
}

export function WorkspaceOnboarding({ onAdd }: WorkspaceOnboardingProps) {
  const [path, setPath] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!path.trim()) {
      setError("Project path is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onAdd(path.trim(), name.trim() || undefined);
    } catch (err) {
      setError((err as Error).message || "Failed to add workspace.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="workspace-onboarding">
      <div className="workspace-onboarding-card">
        <div className="workspace-onboarding-icon">
          <FolderPlus size={32} />
        </div>
        <h2>Add your first project</h2>
        <p>
          System Atlas works on the architecture pack of any project. Paste the absolute path to a project folder
          to start. You can add more projects later and switch between them from the top-bar picker.
        </p>
        <form onSubmit={submit}>
          <label>
            <span>Project path</span>
            <input
              autoFocus
              type="text"
              placeholder="C:/Dev/Projects/QuantFlow"
              value={path}
              onChange={(event) => setPath(event.target.value)}
              spellCheck={false}
            />
          </label>
          <label>
            <span>Display name (optional)</span>
            <input
              type="text"
              placeholder="Defaults to folder name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          {error && <p className="workspace-error">{error}</p>}
          <button type="submit" className="primary" disabled={busy}>
            {busy ? "Adding…" : "Add project"}
          </button>
        </form>
        <p className="workspace-onboarding-hint">
          If the project doesn't have an <code>architecture/</code> pack yet, System Atlas will start from the
          generic template. Use Scan + Export to build the pack from there.
        </p>
      </div>
    </div>
  );
}
