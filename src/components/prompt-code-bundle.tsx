import Image from "next/image";
import { Download, ExternalLink, FileArchive, Files } from "lucide-react";

type FileItem = { path: string; size: number; type: string };

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PromptCodeBundle({ title, coverUrl, previewUrl, downloadUrl, fileCount, totalBytes, files }: { title: string; coverUrl?: string; previewUrl: string; downloadUrl: string; fileCount: number; totalBytes: number; files: readonly FileItem[] }) {
  return (
    <div className="prompt-bundle">
      {coverUrl ? <a className="prompt-bundle-preview" href={previewUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${title} live preview in a new tab`}><Image src={coverUrl} alt={`Screenshot of ${title}`} fill sizes="(max-width: 860px) 100vw, 720px" unoptimized /><span><ExternalLink size={16} aria-hidden="true" /> Open live preview</span></a> : null}
      <div className="prompt-bundle-summary"><span><FileArchive size={18} /></span><div><strong>Complete source bundle</strong><small>{fileCount} files · {formatBytes(totalBytes)}</small></div></div>
      <div className="prompt-bundle-files">{files.slice(0, 5).map((file) => <span key={file.path}><Files size={11} />{file.path}</span>)}{files.length > 5 ? <span>+{files.length - 5} more</span> : null}</div>
      <div className="prompt-bundle-actions"><a className="button button-secondary" href={previewUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${title} live preview in a new tab`}><ExternalLink size={14} aria-hidden="true" /> Open live preview</a><a className="button button-accent" href={downloadUrl} download><Download size={14} aria-hidden="true" /> Download ZIP</a></div>
    </div>
  );
}
