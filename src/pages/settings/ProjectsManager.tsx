import { useState } from "react";
import { Archive, ArchiveRestore, Check, Pencil, Plus, X } from "lucide-react";
import { Btn, Input, SectionTitle } from "../../components/ui";
import { useToast } from "../../components/Toast";
import { useAppData } from "../../store/AppData";
import { T } from "../../theme/tokens";
import type { Project } from "../../types/domain";

/* ----------------------------------------------------------------------------
   Project administration — add, rename and archive projects. Archived
   projects disappear from pickers but still resolve on existing records.
   Changes commit immediately through the service layer.
   -------------------------------------------------------------------------- */
export function ProjectsManager() {
  const { projects, risks, changes, createProject, updateProject, archiveProject, restoreProject } =
    useAppData();
  const toast = useToast();
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const usage = (id: string) =>
    risks.filter((r) => r.projectId === id).length +
    changes.filter((c) => c.projectId === id).length;

  const run = async (key: string, op: () => Promise<unknown>, success: string) => {
    setBusy(key);
    try {
      await op();
      toast.success(success);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Project update failed");
    } finally {
      setBusy(null);
    }
  };

  const add = () => {
    const name = newName.trim();
    const code = newCode.trim();
    if (!name || !code) return;
    void run("new", () => createProject({ name, code }), `Project "${name}" added`).then(() => {
      setNewName("");
      setNewCode("");
    });
  };

  const startEdit = (p: Project) => {
    setEditing(p.id);
    setEditName(p.name);
    setEditCode(p.code);
  };

  const commitEdit = (p: Project) => {
    const name = editName.trim();
    const code = editCode.trim();
    if (!name || !code) return;
    void run(p.id, () => updateProject(p.id, { name, code }), `Project "${name}" updated`).then(
      () => setEditing(null),
    );
  };

  return (
    <div>
      <SectionTitle sub="Archived projects stay on old records but leave the pickers">
        Projects
      </SectionTitle>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {projects.map((p) => {
          const uses = usage(p.id);
          const isEditing = editing === p.id;
          return (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 0",
                borderBottom: `1px solid ${T.strokeSubtle}`,
                fontSize: 13,
                opacity: p.archived ? 0.55 : 1,
              }}
            >
              {isEditing ? (
                <>
                  <div style={{ flex: 1 }}>
                    <Input
                      value={editName}
                      autoFocus
                      aria-label="Project name"
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
                  <div style={{ width: 110 }}>
                    <Input
                      value={editCode}
                      aria-label="Project code"
                      onChange={(e) => setEditCode(e.target.value)}
                    />
                  </div>
                  <Btn
                    variant="default"
                    icon={Check}
                    loading={busy === p.id}
                    onClick={() => commitEdit(p)}
                    style={{ padding: "5px 10px" }}
                  />
                  <Btn
                    variant="subtle"
                    icon={X}
                    onClick={() => setEditing(null)}
                    style={{ padding: "5px 10px" }}
                  />
                </>
              ) : (
                <>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, color: T.text }}>{p.name}</span>
                    {p.archived && (
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 10,
                          fontWeight: 700,
                          color: T.textTer,
                          border: `1px solid ${T.stroke}`,
                          borderRadius: 3,
                          padding: "1px 5px",
                          textTransform: "uppercase",
                        }}
                      >
                        Archived
                      </span>
                    )}
                  </div>
                  <span style={{ color: T.textTer }}>{p.code}</span>
                  {uses > 0 && (
                    <span
                      title={`Referenced by ${uses} record${uses === 1 ? "" : "s"}`}
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: T.textSec,
                        background: T.bg,
                        borderRadius: 10,
                        padding: "2px 8px",
                      }}
                    >
                      {uses} in use
                    </span>
                  )}
                  {!p.archived && (
                    <Btn
                      variant="subtle"
                      icon={Pencil}
                      title={`Edit ${p.name}`}
                      onClick={() => startEdit(p)}
                      style={{ padding: "5px 10px" }}
                    />
                  )}
                  {p.archived ? (
                    <Btn
                      variant="subtle"
                      icon={ArchiveRestore}
                      title={`Restore ${p.name}`}
                      loading={busy === p.id}
                      onClick={() =>
                        void run(p.id, () => restoreProject(p.id), `Project "${p.name}" restored`)
                      }
                      style={{ padding: "5px 10px" }}
                    />
                  ) : (
                    <Btn
                      variant="subtle"
                      icon={Archive}
                      title={`Archive ${p.name}`}
                      loading={busy === p.id}
                      onClick={() =>
                        void run(p.id, () => archiveProject(p.id), `Project "${p.name}" archived`)
                      }
                      style={{ padding: "5px 10px" }}
                    />
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <div style={{ flex: 1 }}>
          <Input
            placeholder="New project name…"
            aria-label="New project name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </div>
        <div style={{ width: 110 }}>
          <Input
            placeholder="Code"
            aria-label="New project code"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
          />
        </div>
        <Btn
          variant="default"
          icon={Plus}
          loading={busy === "new"}
          disabled={!newName.trim() || !newCode.trim()}
          onClick={add}
        >
          Add
        </Btn>
      </div>
    </div>
  );
}
