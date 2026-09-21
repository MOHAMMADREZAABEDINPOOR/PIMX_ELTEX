import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { getPublishedPosts } from "@/lib/public-content";
import { getYouTubeThumbnailUrl } from "@/lib/youtube";

export const metadata: Metadata = { title: "Episodes", description: "Watch PIMX_ELTEX episodes and find their prompts, code, links, and downloads.", alternates: { canonical: "/episodes" } };
export const dynamic = "force-static";

export default async function EpisodesPage() {
  const posts = await getPublishedPosts();
  return <div className="simple-page page-shell">
    <header className="simple-page-header"><span className="simple-kicker">EPISODES</span><h1>Every episode, all in one place.</h1><p>Watch the video, read the notes, and find the resources behind each build.</p></header>
    <div className="simple-episode-list">
      {posts.map((post) => <Link href={`/episodes/${post.slug}`} className="simple-episode" key={post.slug}>
        <span className="simple-episode-image">{post.youtubeVideoId ? <Image src={getYouTubeThumbnailUrl(post.youtubeVideoId)} alt={`${post.title} video thumbnail`} fill sizes="(max-width: 640px) 100vw, 300px" unoptimized /> : <span className="simple-image-fallback">PIMX_ELTEX</span>}<i><Play size={17} fill="currentColor" /></i></span>
        <span className="simple-episode-copy"><span className="simple-meta">{post.category} · {post.date}</span><strong>{post.title}</strong><span>{post.excerpt}</span><small>Open episode <ArrowRight size={15} /></small></span>
      </Link>)}
      {!posts.length ? <p className="simple-empty">No episodes published yet.</p> : null}
    </div>
  </div>;
}
