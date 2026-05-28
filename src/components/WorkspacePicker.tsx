import { FolderOpen, Folder, Plus, Trash2, Check, Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Workspace } from "../lib/api";

interface WorkspacePickerProps {
  workspaces: Workspace[];
  currentId: string | null;
  onSwitch: (id: string) => void;
  onAdd: (path: string, name?: string) => Promise<void>;
  onRemove: (id: string) => void;
  onRename: (id: string, name: string) => Promise<void>;
}

export function WorkspacePicker({ workspaces, currentId, onSwitch, onAdd, onRemove, onRename }: WorkspacePickerProps) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [path, setPath] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  const current = workspaces.find((w) => w.id === currentId) ?? null;

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!path.trim()) {
      setError("Path is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onAdd(path.trim(), name.trim() || undefined);
      setPath("");
      setName("");
      setAdding(false);
      setOpen(false);
    } catch (err) {
      setError((err as Error).message || "Failed to add workspace.");
    } finally {
      setBusy(false);
    }
  }

  async function commitRename(id: string) {
    const next = renameValue.trim();
    setRenamingId(null);
    if (!next) return;
    try {
      await onRename(id, next);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="workspace-picker" ref={wrapRef}>
      <button
        type="button"
        className="workspace-trigger"
        onClick={() => setOpen((value) => !value)}
        title={current ? current.path : "No workspace selected"}
      >
        <FolderOpen size={16} />
        <span className="workspace-trigger-label">{current?.name ?? "Pick a project"}</span>
      </button>

      {open && (
        <div className="workspace-popover" role="dialog" aria-label="Workspaces">
          <div className="workspace-popover-header">Projects</div>
          {workspaces.length === 0 && (
            <p className="workspace-empty">No projects yet. Add one below.</p>
          )}
          <ul className="workspace-list">
            {workspaces.map((workspace) => {
              const active = workspace.id === currentId;
              const renaming = renamingId === workspace.id;
              return (
                <li key={workspace.id} className={active ? "workspace-item active" : "workspace-item"}>
                  <button
                    type="button"
                    className="workspace-item-main"
                    onClick={() => {
                      if (!active) onSwitch(workspace.id);
                      setOpen(false);
                    }}
                  >
                    {active ? <Check size={14} /> : <Folder size={14} />}
                    {renaming ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(event) => setRenameValue(event.target.value)}
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void commitRename(workspace.id);
                          } else if (event.key === "Escape") {
                            event.preventDefault();
                            setRenamingId(null);
                          }
                        }}
                        onBlur={() => commitRename(workspace.id)}
                        className="workspace-rename-input"
                      />
                    ) : (
                      <span className="workspace-item-text">
                        <span className="workspace-item-name">{workspace.name}</span>
                        <span className="workspace-item-path">{workspace.path}</span>
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    className="workspace-item-action"
                    title="Rename"
                    onClick={(event) => {
                      event.stopPropagation();
                      setRenamingId(workspace.id);
                      setRenameValue(workspace.name);
                    }}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    className="workspace-item-action workspace-item-action-danger"
                    title="Remove from list"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (window.confirm(`Remove "${workspace.name}" from the workspace list? Files on disk are not deleted.`)) {
                        onRemove(workspace.id);
                      }
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              );
            })}
          </ul>

          {adding ? (
            <form className="workspace-add-form" onSubmit={submit}>
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
              <div className="workspace-form-actions">
                <button type="button" onClick={() => setAdding(false)} disabled={busy}>
                  Cancel
                </button>
                <button type="submit" className="primary" disabled={busy}>
                  {busy ? "Adding…" : "Add project"}
                </button>
              </div>
            </form>
          ) : (
            <button type="button" className="workspace-add-button" onClick={() => setAdding(true)}>
              <Plus size={14} /> Add another project
            </button>
          )}
        </div>
      )}
    </div>
  );
}
