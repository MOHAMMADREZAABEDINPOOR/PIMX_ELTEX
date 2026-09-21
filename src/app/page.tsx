import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, AudioLines, Bot, Braces, Cpu, Play, Sparkles } from "lucide-react";
import { getPublishedPosts, getPublishedProjects } from "@/lib/public-content";
import { getYouTubeThumbnailUrl } from "@/lib/youtube";

export const dynamic = "force-static";
export const metadata: Metadata = {
  title: "AI Videos, Prompts & Website Projects — PIMX_ELTEX",
  description: "Watch practical AI and technology videos, explore every prompt and resource, and preview complete website projects with source files from PIMX_ELTEX.",
  alternates: { canonical: "/" },
};

export default async function Home() {
  const [posts, projects] = await Promise.all([getPublishedPosts(), getPublishedProjects()]);
  const featuredEpisode = posts[0];

  return <div className="simple-home page-shell">
    <section className="simple-hero tech-hero">
      <div className="simple-hero-copy">
        <span className="simple-kicker tech-hero-kicker"><span className="tech-live-dot" /> PIMX_ELTEX / THE CREATIVE SIGNAL</span>
        <h1>Curiosity<br />meets <em>technology.</em></h1>
        <p>Explore practical AI and technology videos, the prompts behind each build, and complete website projects you can preview and download.</p>
        <div className="simple-actions">
          <Link className="button button-primary" href="/episodes">Explore the channel <ArrowRight size={16} /></Link>
          <Link className="button button-secondary" href="/code">See the projects <ArrowUpRight size={16} /></Link>
        </div>
        <div className="tech-hero-topics" aria-label="Channel topics"><span>TECHNOLOGY</span><span>AI &amp; TOOLS</span><span>CREATIVE BUILDS</span><span>BEYOND</span></div>
      </div>
      <div className="tech-hero-stage" role="img" aria-label="Abstract technology signal with orbiting topics">
        <div className="tech-stage-grid" />
        <div className="tech-orbit tech-orbit-one" /><div className="tech-orbit tech-orbit-two" />
        <div className="tech-core"><div className="tech-core-inner"><span className="tech-core-mark">P<span>×</span></span><span className="tech-core-caption">IDEAS IN MOTION</span></div></div>
        <div className="tech-satellite tech-satellite-ai"><Bot size={19} /><span>ARTIFICIAL<br />INTELLIGENCE</span></div>
        <div className="tech-satellite tech-satellite-code"><Braces size={20} /><span>BUILD &amp;<br />EXPERIMENT</span></div>
        <div className="tech-satellite tech-satellite-audio"><AudioLines size={20} /><span>STORIES &amp;<br />DISCOVERY</span></div>
        <div className="tech-satellite tech-satellite-chip"><Cpu size={19} /><span>TECH<br />CULTURE</span></div>
        <span className="tech-stage-coordinate tech-stage-coordinate-top">TRANSMITTING / 001</span>
        <span className="tech-stage-coordinate tech-stage-coordinate-bottom"><Sparkles size={12} /> STAY CURIOUS</span>
      </div>
    </section>

    {featuredEpisode ? <Link className="tech-featured-episode" href={`/episodes/${featuredEpisode.slug}`}><span className="tech-featured-label"><Play size={13} fill="currentColor" /> LATEST EPISODE</span><strong>{featuredEpisode.title}</strong><span>Watch now <ArrowUpRight size={15} /></span></Link> : null}

    <section className="simple-section" aria-labelledby="home-episodes">
      <div className="simple-section-head"><div><span className="simple-kicker">WATCH</span><h2 id="home-episodes">Latest episodes</h2><p>Videos, notes, prompts, and links in one place.</p></div><Link href="/episodes">All episodes <ArrowRight size={16} /></Link></div>
      <div className="simple-grid">
        {posts.slice(0, 3).map((post) => <Link className="simple-card" href={`/episodes/${post.slug}`} key={post.slug}>
          <div className="simple-card-image">
            {post.youtubeVideoId ? <Image src={getYouTubeThumbnailUrl(post.youtubeVideoId)} alt={`${post.title} video thumbnail`} fill sizes="(max-width: 700px) 100vw, 33vw" unoptimized /> : <span className="simple-image-fallback">PIMX_ELTEX</span>}
            <span className="simple-play"><Play size={16} fill="currentColor" /></span>
          </div>
          <div className="simple-card-body"><span className="simple-meta">{post.category} · {post.date}</span><h3>{post.title}</h3><p>{post.excerpt}</p><span className="simple-card-link">View episode <ArrowRight size={15} /></span></div>
        </Link>)}
        {!posts.length ? <p className="simple-empty">No episodes published yet.</p> : null}
      </div>
    </section>

    <section className="simple-section" aria-labelledby="home-projects">
      <div className="simple-section-head"><div><span className="simple-kicker">EXPLORE</span><h2 id="home-projects">Website projects</h2><p>Live previews and complete source files.</p></div><Link href="/code">All projects <ArrowRight size={16} /></Link></div>
      <div className="simple-grid">
        {projects.slice(0, 3).map((project) => <article className="simple-card" key={project.slug}>
          <a className="simple-card-image" href={project.previewUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${project.title} preview`}><Image src={project.coverUrl} alt={`${project.title} website preview`} fill sizes="(max-width: 700px) 100vw, 33vw" unoptimized /></a>
          <div className="simple-card-body"><span className="simple-meta">{project.fileCount} source files</span><h3>{project.title}</h3><p>{project.description}</p><a className="simple-card-link" href={project.previewUrl} target="_blank" rel="noopener noreferrer">Open preview <ArrowUpRight size={15} /></a></div>
        </article>)}
        {!projects.length ? <p className="simple-empty">No projects published yet.</p> : null}
      </div>
    </section>
  </div>;
}
