"use client";

import { LoaderCircle, X } from "lucide-react";
import { useState } from "react";
import { adminPermissionGroups, effectiveAdminPermissions, type AdminPermission } from "@/lib/admin-permissions";

export type RoleMember = { id: string; name: string; email: string; role: string; adminPermissions: string[] | null };

export function MemberRoleEditor({ member, actorPermissions, onClose, onSaved }: { member: RoleMember; actorPermissions: AdminPermission[]; onClose: () => void; onSaved: (role: "user" | "admin", permissions: string[] | null) => void }) {
  const [role, setRole] = useState<"user" | "admin">(member.role === "admin" ? "admin" : "user");
  const [permissions, setPermissions] = useState<string[]>(effectiveAdminPermissions(member));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const allowed = new Set(actorPermissions);

  async function save() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/users/${member.id}/permissions`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ role, permissions: role === "admin" ? permissions : [] }) });
      const result = await response.json() as { message?: string; role?: "user" | "admin"; adminPermissions?: string[] | null };
      if (!response.ok) throw new Error(result.message || "Could not update administrator access.");
      onSaved(result.role || role, result.adminPermissions ?? null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update administrator access."); }
    finally { setBusy(false); }
  }

  return <div className="admin-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <section className="admin-dialog member-role-dialog" role="dialog" aria-modal="true" aria-labelledby="member-role-title">
      <header><div><span className="eyebrow">Access control</span><h2 id="member-role-title">{member.name}</h2><p>{member.email}</p></div><button type="button" onClick={onClose} disabled={busy} aria-label="Close access editor"><X size={18} /></button></header>
      <div className="member-role-scroll"><div className="member-role-choice"><label><input type="radio" name="memberRole" value="user" checked={role === "user"} onChange={() => setRole("user")} /><span><strong>Member</strong><small>Standard site access</small></span></label><label><input type="radio" name="memberRole" value="admin" checked={role === "admin"} onChange={() => setRole("admin")} /><span><strong>Administrator</strong><small>Access only to the actions selected below</small></span></label></div>
        {role === "admin" ? <div className="permission-groups">{adminPermissionGroups.map((group) => <fieldset key={group.title}><legend>{group.title}</legend>{group.items.map((item) => <label key={item.key}><input type="checkbox" checked={permissions.includes(item.key)} disabled={!allowed.has(item.key)} onChange={(event) => setPermissions((current) => event.target.checked ? [...current, item.key] : current.filter((key) => key !== item.key))} /><span>{item.label}</span></label>)}</fieldset>)}</div> : null}</div>
      {error ? <p className="form-message form-error" role="alert">{error}</p> : null}
      <div className="project-editor-actions"><button className="button button-secondary" type="button" disabled={busy} onClick={onClose}>Cancel</button><button className="button button-accent" type="button" disabled={busy} onClick={() => void save()}>{busy ? <LoaderCircle className="spin" size={15} /> : null}Save access</button></div>
    </section>
  </div>;
}
