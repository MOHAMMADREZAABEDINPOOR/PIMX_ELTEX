import { ViewTransition, type ReactNode } from "react";
import { ArrowUpRight, Download, ExternalLink, FileArchive, Globe2, Sparkles } from "lucide-react";
import { CopyButton } from "./copy-button";
import { PromptCodeBundle } from "./prompt-code-bundle";

type Episode = {
  videoId: string;
  number: string;
  overview: string;
  prompts: readonly { title: string; description?: string; content: string; coverUrl?: string; previewUrl?: string; downloadUrl?: string; fileCount?: number; totalBytes?: number; files?: readonly { path: string; size: number; type: string }[] }[];
  links: readonly { name: string; url: string; note: string }[];
  project?: {
    title: string;
    description: string;
    previewUrl: string;
    downloadUrl: string;
    tech: readonly string[];
  };
};

function PromptArticle({ content }: { content: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];

  const flushList = () => {
    if (!list.length) return;
    const items = list;
    list = [];
    blocks.push(<ul key={`list-${blocks.length}`}>{items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>);
  };

  for (const sourceLine of content.split(/\r?\n/)) {
    const line = sourceLine.trim();
    if (!line) {
      flushList();
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      list.push(line.replace(/^[-*]\s+/, ""));
      continue;
    }
    flushList();
    if (/^IMPORTANT:?$/i.test(line)) {
      blocks.push(<h4 className="prompt-warning-title" key={`heading-${blocks.length}`}>Important instructions</h4>);
    } else if (line.endsWith(":")) {
      blocks.push(<h4 key={`heading-${blocks.length}`}>{line.slice(0, -1)}</h4>);
    } else {
      blocks.push(<p key={`paragraph-${blocks.length}`}>{line}</p>);
    }
  }
  flushList();

  return <div className="prompt-article-copy">{blocks}</div>;
}

export function EpisodeResources({ episode, transitionName }: { episode: Episode; transitionName?: string }) {
  return (
    <div className="episode-resources">
      {episode.videoId ? transitionName ? <ViewTransition name={transitionName} share="morph" default="none"><section className="episode-video"><iframe src={`https://www.youtube-nocookie.com/embed/${episode.videoId}`} title={`${episode.number} video`} allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></section></ViewTransition> : <section className="episode-video"><iframe src={`https://www.youtube-nocookie.com/embed/${episode.videoId}`} title={`${episode.number} video`} allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></section> : null}

      <section className="episode-block episode-overview"><span className="eyebrow">Inside this episode</span><h2>The complete breakdown.</h2><p>{episode.overview}</p></section>

      {episode.prompts.length ? <section className="episode-block prompt-journal">
        <div className="episode-section-title"><div><span className="eyebrow">Prompts</span><h2>Copy every prompt from the video.</h2></div><span className="resource-count">{episode.prompts.length} prompts</span></div>
        <nav className="prompt-toc" aria-label="Prompt table of contents">
          {episode.prompts.map((prompt, index) => <a href={`#prompt-${index + 1}`} key={`${prompt.title}-toc`}><span>{String(index + 1).padStart(2, "0")}</span>{prompt.title}</a>)}
        </nav>
        <div className="episode-prompt-list">{episode.prompts.map((prompt, index) => <article className="episode-prompt" id={`prompt-${index + 1}`} key={`${prompt.title}-${index}`}>
          <header className="prompt-article-header"><div><span className="prompt-kicker">Prompt {String(index + 1).padStart(2, "0")}</span><h3>{prompt.title}</h3>{prompt.description ? <p>{prompt.description}</p> : null}</div><CopyButton text={prompt.content} label="Copy prompt" /></header>
          <PromptArticle content={prompt.content} />
          {prompt.previewUrl && prompt.downloadUrl ? <PromptCodeBundle title={prompt.title} coverUrl={prompt.coverUrl} previewUrl={prompt.previewUrl} downloadUrl={prompt.downloadUrl} fileCount={prompt.fileCount ?? 0} totalBytes={prompt.totalBytes ?? 0} files={prompt.files ?? []} /> : null}
        </article>)}</div>
      </section> : null}

      {episode.links.length ? <section className="episode-block">
        <div className="episode-section-title"><div><span className="eyebrow">Links & tools</span><h2>Everything mentioned.</h2></div><Globe2 size={24} /></div>
        <div className="episode-links">{episode.links.map((link) => <a href={link.url} target="_blank" rel="noreferrer" key={link.name}><div><strong>{link.name}</strong><span>{link.note}</span></div><ArrowUpRight size={17} /></a>)}</div>
      </section> : null}

      {episode.project ? <section className="episode-block">
        <div className="episode-section-title"><div><span className="eyebrow">Project files</span><h2>{episode.project.title}</h2><p>{episode.project.description}</p></div><FileArchive size={25} /></div>
        <footer className="episode-download"><div><Sparkles size={16} /><span>{episode.project.tech.join(" · ")}</span></div><div className="episode-project-actions"><a href={episode.project.previewUrl} target="_blank" rel="noopener noreferrer" className="button button-secondary"><ExternalLink size={15} aria-hidden="true" /> Open live preview</a><a href={episode.project.downloadUrl} download className="button button-accent"><Download size={15} aria-hidden="true" /> Download complete files</a></div></footer>
      </section> : null}
    </div>
  );
}
