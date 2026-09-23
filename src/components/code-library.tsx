import Image from "next/image";
import { Download, ExternalLink, MonitorPlay } from "lucide-react";
import type { PublicProject } from "@/lib/public-content";

export function CodeLibrary({ projects }: { projects: PublicProject[] }) {
  return (
    <div className="project-grid">
      {projects.map((project, index) => (
        <article className="project-card" id={project.slug} key={project.slug} data-tilt>
          <a className="project-cover" href={project.previewUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${project.title} live preview in a new tab`}>
            <Image src={project.coverUrl} alt={`Screenshot of ${project.title}`} fill sizes="(max-width: 640px) 100vw, (max-width: 900px) 50vw, 600px" preload={index === 0} unoptimized />
            <span className="preview-curtain"><MonitorPlay size={20} aria-hidden="true" /> Open live preview</span>
          </a>
          <div className="project-card-body">
            <div className="project-meta"><span>{project.episode}</span><span>{project.fileCount} source {project.fileCount === 1 ? "file" : "files"}</span></div>
            <h2>{project.title}</h2>
            <p>{project.description}</p>
            <div className="tech-row">{project.tech.map((tech) => <span className="tag" key={tech}>{tech}</span>)}</div>
            <div className="project-actions">
              <a className="button button-secondary" href={project.previewUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} aria-hidden="true" /> Open preview</a>
              <a className="button button-primary" href={project.downloadUrl} download><Download size={14} aria-hidden="true" /> Download files</a>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
