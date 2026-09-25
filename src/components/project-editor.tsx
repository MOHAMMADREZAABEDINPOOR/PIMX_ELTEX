"use client";

import { LoaderCircle, X } from "lucide-react";
import { useState } from "react";
import { UiSelect } from "./ui-select";

export type ProjectDetails = {
  id: string;
  title: string;
  slug: string;
  description: string;
  tech: string[];
  previewUrl: string;
  downloadUrl: string;
  coverUrl: string | null;
  status: "draft" | "published";
};

const publishingOptions = [
  { value: "draft", label: "Draft", description: "Only visible in the admin workspace", tone: "warning" },
  { value: "published", label: "Published", description: "Visible to everyone on the website", tone: "success" },
] as const;

export function ProjectEditor({ project, onClose, onSaved }: { project?: ProjectDetails; onClose: () => void; onSaved: (project: ProjectDetails) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const body = { ...fields, tech: String(fields.tech).split(",").map((item) => item.trim()).filter(Boolean) };
    try {
      const response = await fetch(project ? `/api/admin/projects/${project.id}` : "/api/admin/projects", {
        method: project ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json() as { id?: string; project?: ProjectDetails; message?: string };
      if (!response.ok) throw new Error(result.message || "The project could not be saved.");
      const saved = result.project || { ...body, id: result.id, coverUrl: String(fields.coverUrl || "") || null } as ProjectDetails;
      if (!saved.id) throw new Error("The project could not be saved.");
      onSaved(saved);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The project could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="admin-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <form className="admin-dialog project-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="project-editor-title" onSubmit={save}>
      <header><div><span className="eyebrow">{project ? "Edit release" : "New release"}</span><h2 id="project-editor-title">{project ? "Edit website project" : "Create a website project"}</h2><p>Changes to published projects appear on the site after saving.</p></div><button type="button" onClick={onClose} disabled={busy} aria-label="Close project editor"><X size={18} /></button></header>
      <div className="field"><label htmlFor="project-title">Title</label><input id="project-title" name="title" defaultValue={project?.title} required minLength={3} maxLength={120} autoFocus /></div>
      <div className="form-row"><div className="field"><label htmlFor="project-slug">URL slug</label><input id="project-slug" name="slug" defaultValue={project?.slug} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={120} /></div><div className="field"><label htmlFor="project-tech">Technologies</label><input id="project-tech" name="tech" defaultValue={project?.tech.join(", ")} required placeholder="Next.js, TypeScript, Tailwind" /></div></div>
      <div className="field"><label htmlFor="project-description">Description</label><textarea id="project-description" name="description" defaultValue={project?.description} required minLength={10} maxLength={400} rows={3} /></div>
      <div className="form-row"><div className="field"><label htmlFor="project-preview">Preview URL</label><input id="project-preview" name="previewUrl" defaultValue={project?.previewUrl} required placeholder="/demos/project/" /></div><div className="field"><label htmlFor="project-download">Download URL</label><input id="project-download" name="downloadUrl" defaultValue={project?.downloadUrl} required placeholder="/downloads/project.zip" /></div></div>
      <div className="field"><label htmlFor="project-cover">Cover image URL <span>(optional)</span></label><input id="project-cover" name="coverUrl" defaultValue={project?.coverUrl || ""} placeholder="/project-previews/project.webp" /></div>
      <div className="field"><label htmlFor="project-status">Status</label><UiSelect id="project-status" name="status" defaultValue={project?.status || "draft"} options={publishingOptions} ariaLabel="Project status" /></div>
      {error ? <p className="form-message" role="alert">{error}</p> : null}
      <div className="project-editor-actions"><button className="button button-secondary" type="button" onClick={onClose} disabled={busy}>Cancel</button><button className="button button-accent" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={15} /> : null}{project ? "Save changes" : "Create project"}</button></div>
    </form>
  </div>;
}
