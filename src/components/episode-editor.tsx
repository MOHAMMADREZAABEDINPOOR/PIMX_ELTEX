"use client";

import { Archive, CheckCircle2, File as FileIcon, FilePlus2, FolderOpen, GripVertical, LoaderCircle, Plus, Trash2, UploadCloud, X } from "lucide-react";
import { useRef, useState } from "react";
import { parsePromptDocument } from "@/lib/episode-import";
import { getYouTubeWatchUrl } from "@/lib/youtube";
import { UiSelect } from "./ui-select";
import { ConfirmDialog } from "./confirm-dialog";

type FileEntry = { file: File; path: string };
type UploadedBundle = {
  bundleId: string;
  previewUrl: string;
  downloadUrl: string;
  fileCount: number;
  totalBytes: number;
  files: { path: string; size: number; type: string }[];
};
type PromptDraft = {
  id: string;
  title: string;
  description: string;
  content: string;
  files: FileEntry[];
  bundle?: UploadedBundle;
  uploadState?: "zipping" | "uploading" | "complete";
};
type LinkDraft = { id: string; name: string; url: string; note: string };
type CreatedPost = { id: string; title: string; slug: string; status: string };
export type EpisodeInitialData = {
  id: string;
  title: string;
  slug: string;
  youtubeVideoId?: string | null;
  excerpt: string;
  content: string;
  category: string;
  status: "draft" | "scheduled" | "published";
  prompts: Array<{ title: string; description?: string | null; content: string; previewUrl?: string | null; downloadUrl?: string | null; fileCount: number; totalBytes: number; files: UploadedBundle["files"] }>;
  links: Array<{ title: string; description?: string | null; url?: string | null }>;
};

type LegacyFileEntry = {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  fullPath: string;
  file?: (callback: (file: File) => void, error?: (reason: DOMException) => void) => void;
  createReader?: () => { readEntries: (callback: (entries: LegacyFileEntry[]) => void, error?: (reason: DOMException) => void) => void };
};

const publishingOptions = [
  { value: "draft", label: "Draft", description: "Only visible in the admin workspace", tone: "warning" },
  { value: "scheduled", label: "Scheduled", description: "Prepared for a future publishing workflow", tone: "neutral" },
  { value: "published", label: "Published", description: "Visible to everyone on the website", tone: "success" },
] as const;

const directoryInputProps = { webkitdirectory: "", directory: "" } as Record<string, string>;
const blockedSegments = new Set(["node_modules", ".git", ".next"]);

function createPrompt(index: number): PromptDraft {
  return { id: crypto.randomUUID(), title: `Prompt ${index}`, description: "", content: "", files: [] };
}

function cleanPath(value: string) {
  const segments = value.replace(/\\/g, "/").replace(/^\/+/, "").split("/").filter(Boolean);
  return segments.map((segment) => segment.trim().replace(/[^a-zA-Z0-9._ -]+/g, "-").replace(/^\.+$/, "-").slice(0, 100) || "file").join("/");
}

function usableFile(entry: FileEntry) {
  const segments = entry.path.toLowerCase().split("/");
  return !segments.some((segment) => blockedSegments.has(segment) || segment === ".env" || segment.startsWith(".env."));
}

function stripSharedRoot(entries: FileEntry[]) {
  if (!entries.length) return entries;
  const split = entries.map((entry) => entry.path.replace(/\\/g, "/").replace(/^\/+/, "").split("/"));
  const sharedRoot = split.every((segments) => segments.length > 1 && segments[0].toLowerCase() === split[0][0].toLowerCase());
  return entries.map((entry, index) => ({ file: entry.file, path: (sharedRoot ? split[index].slice(1) : split[index]).join("/") })).filter(usableFile);
}

function filesFromInput(files: FileList | null) {
  if (!files) return [];
  return stripSharedRoot(Array.from(files, (file) => ({ file, path: file.webkitRelativePath || file.name })));
}

function mergeFiles(current: FileEntry[], added: FileEntry[]) {
  const merged = new Map(current.map((entry) => [cleanPath(entry.path).toLowerCase(), entry]));
  for (const entry of added) merged.set(cleanPath(entry.path).toLowerCase(), entry);
  return Array.from(merged.values());
}

async function readLegacyEntry(entry: LegacyFileEntry): Promise<FileEntry[]> {
  if (entry.isFile && entry.file) {
    const file = await new Promise<File>((resolve, reject) => entry.file!(resolve, reject));
    return [{ file, path: entry.fullPath.replace(/^\/+/, "") || file.name }];
  }
  if (!entry.isDirectory || !entry.createReader) return [];
  const reader = entry.createReader();
  const children: LegacyFileEntry[] = [];
  while (true) {
    const batch = await new Promise<LegacyFileEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
    if (!batch.length) break;
    children.push(...batch);
  }
  return (await Promise.all(children.map(readLegacyEntry))).flat();
}

async function filesFromDrop(dataTransfer: DataTransfer) {
  const entries = Array.from(dataTransfer.items)
    .map((item) => (item as unknown as { webkitGetAsEntry?: () => LegacyFileEntry | null }).webkitGetAsEntry?.())
    .filter((entry): entry is LegacyFileEntry => Boolean(entry));
  if (!entries.length) return filesFromInput(dataTransfer.files);
  return stripSharedRoot((await Promise.all(entries.map(readLegacyEntry))).flat());
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function makeArchive(entries: FileEntry[]) {
  const { zip } = await import("fflate");
  const archiveInput = Object.fromEntries(await Promise.all(entries.map(async ({ file, path }) => [cleanPath(path), new Uint8Array(await file.arrayBuffer())])));
  return new Promise<Uint8Array<ArrayBuffer>>((resolve, reject) => {
    zip(archiveInput, { level: 6 }, (error, data) => error ? reject(error) : resolve(data));
  });
}

export function EpisodeEditor({ onClose, onCreated, initialData }: { onClose: () => void; onCreated: (post: CreatedPost) => void; initialData?: EpisodeInitialData }) {
  const [prompts, setPrompts] = useState<PromptDraft[]>(() => initialData?.prompts.length ? initialData.prompts.map((prompt) => ({ id: crypto.randomUUID(), title: prompt.title, description: prompt.description || "", content: prompt.content, files: [], bundle: prompt.previewUrl && prompt.downloadUrl ? { bundleId: "existing", previewUrl: prompt.previewUrl, downloadUrl: prompt.downloadUrl, fileCount: prompt.fileCount, totalBytes: prompt.totalBytes, files: prompt.files } : undefined })) : [{ id: "initial-prompt", title: "Prompt 1", description: "", content: "", files: [] }]);
  const [links, setLinks] = useState<LinkDraft[]>(() => initialData?.links.map((link) => ({ id: crypto.randomUUID(), name: link.title, url: link.url || "", note: link.description || "" })) || []);
  const [removal, setRemoval] = useState<{ kind: "prompt" | "link" | "file"; id: string; promptId?: string; label: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const episodeFolderInput = useRef<HTMLInputElement>(null);

  function updatePrompt(id: string, patch: Partial<PromptDraft>) {
    setPrompts((current) => current.map((prompt) => prompt.id === id ? { ...prompt, ...patch } : prompt));
  }

  function addPromptFiles(id: string, added: FileEntry[]) {
    setPrompts((current) => current.map((prompt) => prompt.id === id ? { ...prompt, files: mergeFiles(prompt.files, added), bundle: undefined, uploadState: undefined } : prompt));
  }

  async function importEpisodeFolder(files: FileList | null) {
    const allFiles = filesFromInput(files);
    if (!allFiles.length) return;
    const promptDocument = allFiles.find((entry) => /(^|\/)prompt\.txt$/i.test(entry.path));
    const parsed = promptDocument ? parsePromptDocument(await promptDocument.file.text()) : [];
    const topFolders = Array.from(new Set(allFiles.map((entry) => entry.path.split("/")[0]).filter((folder) => /^prompt[ _-]*\d+$/i.test(folder))));
    const imported = (parsed.length ? parsed : topFolders.map((folder, index) => ({ number: Number(folder.match(/\d+/)?.[0] || index + 1), title: folder, content: "" })))
      .sort((a, b) => a.number - b.number)
      .map((prompt) => {
        const folderPattern = new RegExp(`^prompt[ _-]*${prompt.number}$`, "i");
        const folder = topFolders.find((name) => folderPattern.test(name));
        const promptFiles = folder ? allFiles.filter((entry) => entry.path.startsWith(`${folder}/`)).map((entry) => ({ file: entry.file, path: entry.path.slice(folder.length + 1) })) : [];
        return { id: crypto.randomUUID(), title: prompt.title, description: "", content: prompt.content, files: promptFiles };
      });
    if (!imported.length) return setMessage("No prompt folders or PROMPT headings were found in this folder.");
    setPrompts(imported);
    setMessage(`Imported ${imported.length} prompts and ${imported.reduce((sum, prompt) => sum + prompt.files.length, 0)} project files.`);
    if (episodeFolderInput.current) episodeFolderInput.current.value = "";
  }

  async function uploadBundle(prompt: PromptDraft) {
    if (prompt.bundle && prompt.files.length) return prompt.bundle;
    if (!prompt.files.length) return undefined;
    if (!prompt.files.some((entry) => /(^|\/)index\.html?$/i.test(entry.path))) throw new Error(`${prompt.title}: add an index.html file for preview.`);
    updatePrompt(prompt.id, { uploadState: "zipping" });
    const archive = await makeArchive(prompt.files);
    updatePrompt(prompt.id, { uploadState: "uploading" });
    const form = new FormData();
    for (const entry of prompt.files) {
      form.append("files", entry.file, entry.file.name);
      form.append("paths", cleanPath(entry.path));
    }
    const archiveName = `${prompt.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project-files"}.zip`;
    form.append("archive", new File([archive], archiveName, { type: "application/zip" }));
    form.append("bundleName", archiveName.slice(0, -4));
    const response = await fetch("/api/admin/uploads", { method: "POST", body: form });
    const result = await response.json() as UploadedBundle & { message?: string };
    if (!response.ok) throw new Error(result.message || `${prompt.title}: upload failed.`);
    updatePrompt(prompt.id, { bundle: result, uploadState: "complete" });
    return result;
  }

  async function uploadPromptNow(id: string) {
    const prompt = prompts.find((item) => item.id === id);
    if (!prompt) return;
    setMessage("");
    try { await uploadBundle(prompt); }
    catch (error) { updatePrompt(id, { uploadState: undefined }); setMessage(error instanceof Error ? error.message : "The files could not be uploaded."); }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    try {
      const preparedPrompts = [];
      for (const prompt of prompts) {
        if (!prompt.title.trim() || !prompt.content.trim()) throw new Error("Every prompt needs a title and full prompt text.");
        const bundle = prompt.files.length ? await uploadBundle(prompt) : prompt.bundle;
        preparedPrompts.push({
          title: prompt.title,
          description: prompt.description,
          content: prompt.content,
          previewUrl: bundle?.previewUrl,
          downloadUrl: bundle?.downloadUrl,
          fileCount: bundle?.fileCount ?? 0,
          totalBytes: bundle?.totalBytes ?? 0,
          files: bundle?.files ?? [],
          sortOrder: preparedPrompts.length,
        });
      }
      const body = {
        title: fields.title,
        slug: fields.slug,
        youtubeVideoId: fields.youtubeVideoId,
        excerpt: fields.excerpt,
        content: fields.content,
        category: fields.category,
        status: fields.status,
        prompts: preparedPrompts,
        links: links.filter((link) => link.name.trim() && link.url.trim()).map((link, sortOrder) => ({ title: link.name, url: link.url, description: link.note, sortOrder })),
      };
      const response = await fetch(initialData ? `/api/admin/posts/${initialData.id}` : "/api/admin/posts", { method: initialData ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json() as { id?: string; message?: string };
      if (!response.ok || !result.id) throw new Error(result.message || "The episode could not be created.");
      onCreated({ id: result.id, title: String(fields.title), slug: String(fields.slug), status: String(fields.status) });
      onClose();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The episode could not be created.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-dialog-backdrop">
      <form className="admin-dialog episode-editor" onSubmit={submit}>
        <header><div><span className="eyebrow">{initialData ? "Edit content" : "New content"}</span><h2>{initialData ? "Edit episode" : "Create an episode"}</h2><p>Build the complete resource page for one YouTube video.</p></div><button type="button" onClick={onClose} aria-label="Close"><X size={18} /></button></header>

        <section className="editor-section">
          <div className="editor-section-heading"><span className="editor-step">01</span><div><h3>Episode details</h3><p>Public information shown at the top of the article.</p></div></div>
          <div className="field"><label htmlFor="post-title">Title</label><input id="post-title" name="title" required minLength={5} placeholder="Episode title" defaultValue={initialData?.title} /></div>
          <div className="form-row"><div className="field"><label htmlFor="post-slug">URL slug</label><input id="post-slug" name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="episode-url-slug" defaultValue={initialData?.slug} /></div><div className="field"><label htmlFor="post-video">YouTube video URL</label><input id="post-video" name="youtubeVideoId" type="url" inputMode="url" required maxLength={500} placeholder="https://www.youtube.com/watch?v=..." defaultValue={getYouTubeWatchUrl(initialData?.youtubeVideoId || "")} /><small className="field-hint">The video ID and thumbnail are generated automatically.</small></div></div>
          <div className="field"><label htmlFor="post-excerpt">Short description</label><textarea id="post-excerpt" name="excerpt" required minLength={10} maxLength={320} rows={2} defaultValue={initialData?.excerpt} /></div>
          <div className="field"><label htmlFor="post-content">Episode notes</label><textarea id="post-content" name="content" required minLength={20} rows={5} defaultValue={initialData?.content} /></div>
        </section>

        <section className="editor-section">
          <div className="editor-section-heading editor-section-actions"><span className="editor-step">02</span><div><h3>Prompts & project files</h3><p>Add as many prompts as the video needs. Each prompt can have its own folder tree, preview, and ZIP.</p></div><div><input ref={episodeFolderInput} className="sr-only" type="file" multiple {...directoryInputProps} onChange={(event) => void importEpisodeFolder(event.currentTarget.files)} /><button className="button button-secondary" type="button" onClick={() => episodeFolderInput.current?.click()}><FolderOpen size={14} /> Import episode folder</button><button className="button button-secondary" type="button" onClick={() => setPrompts((current) => [...current, createPrompt(current.length + 1)])}><Plus size={14} /> Add prompt</button></div></div>

          <div className="prompt-editor-list">
            {prompts.map((prompt, index) => <PromptEditor key={prompt.id} prompt={prompt} index={index} canRemove={prompts.length > 1} onChange={(patch) => updatePrompt(prompt.id, patch)} onFiles={(files) => addPromptFiles(prompt.id, files)} onUpload={() => void uploadPromptNow(prompt.id)} onRemove={() => setRemoval({ kind: "prompt", id: prompt.id, label: prompt.title || `Prompt ${index + 1}` })} onRemoveFile={(path) => setRemoval({ kind: "file", id: path, promptId: prompt.id, label: path })} />)}
          </div>
        </section>

        <section className="editor-section">
          <div className="editor-section-heading editor-section-actions"><span className="editor-step">03</span><div><h3>Mentioned links</h3><p>Add every website or tool mentioned in the video.</p></div><button className="button button-secondary" type="button" onClick={() => setLinks((current) => [...current, { id: crypto.randomUUID(), name: "", url: "", note: "" }])}><Plus size={14} /> Add link</button></div>
          {links.length ? <div className="link-editor-list">{links.map((link) => <div className="link-editor" key={link.id}><GripVertical size={15} /><input aria-label="Website name" placeholder="Website name…" value={link.name} onChange={(event) => setLinks((current) => current.map((item) => item.id === link.id ? { ...item, name: event.target.value } : item))} /><input aria-label="Website URL" type="url" placeholder="https://example.com" value={link.url} onChange={(event) => setLinks((current) => current.map((item) => item.id === link.id ? { ...item, url: event.target.value } : item))} /><input aria-label="Link note" placeholder="Why it was mentioned…" value={link.note} onChange={(event) => setLinks((current) => current.map((item) => item.id === link.id ? { ...item, note: event.target.value } : item))} /><button type="button" aria-label="Remove link" onClick={() => setRemoval({ kind: "link", id: link.id, label: link.name || "Untitled link" })}><Trash2 size={14} /></button></div>)}</div> : <div className="editor-empty">No links added yet.</div>}
        </section>

        <section className="editor-section">
          <div className="editor-section-heading"><span className="editor-step">04</span><div><h3>Publishing</h3><p>Choose how this episode should appear on the website.</p></div></div>
          <div className="form-row"><div className="field"><label htmlFor="post-category">Category</label><input id="post-category" name="category" required defaultValue={initialData?.category || "Development"} /></div><div className="field"><label htmlFor="post-status">Status</label><UiSelect id="post-status" name="status" defaultValue={initialData?.status || "draft"} options={publishingOptions} ariaLabel="Episode status" /></div></div>
        </section>

        {message ? <div className="form-message" role="status">{message}</div> : null}
        <footer className="editor-footer"><span>{prompts.length} prompts · {prompts.reduce((sum, prompt) => sum + (prompt.files.length || prompt.bundle?.fileCount || 0), 0)} files</span><button className="button button-accent" type="submit" disabled={busy}>{busy ? <><LoaderCircle className="spin" size={15} /> Saving episode…</> : initialData ? "Save changes" : "Create episode"}</button></footer>
      </form>
      <ConfirmDialog open={Boolean(removal)} title={`Remove ${removal?.kind || "item"}?`} description={`“${removal?.label || "This item"}” will be removed from the episode draft. Save the episode to persist this change.`} confirmLabel="Remove item" onCancel={() => setRemoval(null)} onConfirm={() => { if (!removal) return; if (removal.kind === "prompt") setPrompts((current) => current.filter((item) => item.id !== removal.id)); else if (removal.kind === "link") setLinks((current) => current.filter((item) => item.id !== removal.id)); else if (removal.promptId) setPrompts((current) => current.map((prompt) => prompt.id === removal.promptId ? { ...prompt, files: prompt.files.filter((item) => item.path !== removal.id), bundle: undefined, uploadState: undefined } : prompt)); setRemoval(null); }} />
    </div>
  );
}

function PromptEditor({ prompt, index, canRemove, onChange, onFiles, onUpload, onRemove, onRemoveFile }: { prompt: PromptDraft; index: number; canRemove: boolean; onChange: (patch: Partial<PromptDraft>) => void; onFiles: (files: FileEntry[]) => void; onUpload: () => void; onRemove: () => void; onRemoveFile: (path: string) => void }) {
  const filesInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const totalBytes = prompt.files.length ? prompt.files.reduce((sum, entry) => sum + entry.file.size, 0) : prompt.bundle?.totalBytes || 0;
  const visibleFiles = prompt.files.length ? prompt.files.map((entry) => ({ path: entry.path, size: entry.file.size })) : prompt.bundle?.files || [];
  const stateText = prompt.uploadState === "zipping" ? "Creating ZIP…" : prompt.uploadState === "uploading" ? "Uploading to R2…" : prompt.uploadState === "complete" ? "Bundle ready" : "Upload bundle";

  return <article className="prompt-editor-card">
    <header><span className="prompt-number">{String(index + 1).padStart(2, "0")}</span><div><strong>{prompt.title || `Prompt ${index + 1}`}</strong><small>{visibleFiles.length ? `${visibleFiles.length} files · ${formatBytes(totalBytes)}` : "Prompt only — no project files yet"}</small></div>{canRemove ? <button type="button" aria-label={`Remove prompt ${index + 1}`} onClick={onRemove}><Trash2 size={15} /></button> : null}</header>
    <div className="form-row"><div className="field"><label>Prompt title</label><input value={prompt.title} onChange={(event) => onChange({ title: event.target.value })} required maxLength={120} /></div><div className="field"><label>Short description <span>(optional)</span></label><input value={prompt.description} onChange={(event) => onChange({ description: event.target.value })} maxLength={400} placeholder="What this prompt creates" /></div></div>
    <div className="field"><label>Full prompt</label><textarea value={prompt.content} onChange={(event) => onChange({ content: event.target.value })} required rows={8} maxLength={60_000} placeholder="Paste the complete prompt here…" /></div>
    <div className="bundle-dropzone" onDragOver={(event) => { event.preventDefault(); event.currentTarget.classList.add("is-dragging"); }} onDragLeave={(event) => event.currentTarget.classList.remove("is-dragging")} onDrop={(event) => { event.preventDefault(); event.currentTarget.classList.remove("is-dragging"); void filesFromDrop(event.dataTransfer).then(onFiles); }}>
      <UploadCloud size={22} /><div><strong>Drop files and folders here</strong><span>Folder paths are preserved. Include an index.html for live preview.</span></div>
      <div className="bundle-picker-actions"><input ref={filesInput} className="sr-only" type="file" multiple onChange={(event) => { onFiles(filesFromInput(event.currentTarget.files)); event.currentTarget.value = ""; }} /><input ref={folderInput} className="sr-only" type="file" multiple {...directoryInputProps} onChange={(event) => { onFiles(filesFromInput(event.currentTarget.files)); event.currentTarget.value = ""; }} /><button type="button" onClick={() => filesInput.current?.click()}><FilePlus2 size={13} /> Files</button><button type="button" onClick={() => folderInput.current?.click()}><FolderOpen size={13} /> Folder</button></div>
    </div>
    {visibleFiles.length ? <div className="bundle-file-list">{visibleFiles.slice(0, 8).map((entry) => <div key={entry.path}><FileIcon size={12} /><span>{entry.path}</span><small>{formatBytes(entry.size)}</small>{prompt.files.length ? <button type="button" aria-label={`Remove ${entry.path}`} onClick={() => onRemoveFile(entry.path)}><X size={12} /></button> : null}</div>)}{visibleFiles.length > 8 ? <span className="bundle-more">+ {visibleFiles.length - 8} more files</span> : null}</div> : null}
    {visibleFiles.length ? <footer className="bundle-footer"><span><Archive size={14} /> {prompt.files.length ? "The website creates one downloadable ZIP automatically." : "Existing preview and ZIP are preserved until you choose new files."}</span>{prompt.files.length ? <button className={prompt.bundle ? "bundle-ready" : ""} type="button" disabled={prompt.uploadState === "zipping" || prompt.uploadState === "uploading"} onClick={onUpload}>{prompt.uploadState === "zipping" || prompt.uploadState === "uploading" ? <LoaderCircle className="spin" size={13} /> : prompt.bundle ? <CheckCircle2 size={13} /> : <UploadCloud size={13} />}{stateText}</button> : <span className="bundle-ready"><CheckCircle2 size={13} /> Bundle ready</span>}</footer> : null}
  </article>;
}
