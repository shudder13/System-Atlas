import { FolderOpen, Folder, Plus, Trash2, Check, Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  // Enter/Escape close the rename input, which fires a trailing blur on
  // unmount. Without this guard Escape COMMITTED the cancelled rename and
  // Enter committed twice.
  const renameSettledRef = useRef(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const current = workspaces.find((w) => w.id === currentId) ?? null;

  useEffect(() => {
    if (!open) return;
    // The toolbar is an overflow scroll container, so an absolutely-positioned
    // popover gets clipped. The popover is portaled to <body> and positioned
    // against the trigger's rect (re-measured on scroll/resize so it tracks).
    function updatePosition() {
      const rect = wrapRef.current?.getBoundingClientRect();
      if (rect) setPos({ top: rect.bottom + 8, left: rect.left });
    }
    updatePosition();
    function handleClick(event: MouseEvent) {
      const target = event.target as Node;
      if (!wrapRef.current?.contains(target) && !popoverRef.current?.contains(target)) setOpen(false);
    }
    // Keyboard users could open the popover but had no way to dismiss it
    // short of tabbing through every control inside.
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
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
        onClick={() => {
          const rect = wrapRef.current?.getBoundingClientRect();
          if (rect) setPos({ top: rect.bottom + 8, left: rect.left });
          setOpen((value) => !value);
        }}
        title={current ? current.path : "No workspace selected"}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <FolderOpen size={16} />
        <span className="workspace-trigger-label">{current?.name ?? "Pick a project"}</span>
      </button>

      {open && createPortal(
        <div
          className="workspace-popover"
          role="dialog"
          aria-label="Workspaces"
          ref={popoverRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, right: "auto" }}
        >
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
                            renameSettledRef.current = true;
                            void commitRename(workspace.id);
                          } else if (event.key === "Escape") {
                            event.preventDefault();
                            renameSettledRef.current = true;
                            setRenamingId(null);
                          }
                        }}
                        onBlur={() => {
                          if (renameSettledRef.current) {
                            renameSettledRef.current = false;
                            return;
                          }
                          void commitRename(workspace.id);
                        }}
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
                    aria-label={`Rename ${workspace.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      renameSettledRef.current = false;
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
                    aria-label={`Remove ${workspace.name} from the workspace list`}
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
                  placeholder="C:/Dev/Projects/my-app"
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
              {error && <p className="workspace-error" role="alert">{error}</p>}
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
            <>
              {/* A rename failure must be visible even when the add form is
                  closed -- it previously rendered only inside that form. */}
              {error && <p className="workspace-error" role="alert">{error}</p>}
              <button type="button" className="workspace-add-button" onClick={() => setAdding(true)}>
                <Plus size={14} /> Add another project
              </button>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
