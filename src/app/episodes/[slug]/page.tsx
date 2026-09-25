import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CommentsThread } from "@/components/comments-thread";
import { EpisodeResources } from "@/components/episode-resources";
import { PageTransition } from "@/components/page-transition";
import { getPublicEpisode, getPublicPost } from "@/lib/public-content";
import { siteConfig } from "@/lib/site-config";
import { getYouTubeThumbnailUrl, getYouTubeWatchUrl } from "@/lib/youtube";

type EpisodePageProps = { params: Promise<{ slug: string }> };
export const dynamic = "force-dynamic";
export const dynamicParams = false;

export function generateStaticParams() {
  return [{ slug: "muse-spark-1-3-original-3d-platformer" }];
}

export async function generateMetadata({ params }: EpisodePageProps): Promise<Metadata> {
  const post = await getPublicPost((await params).slug);
  return post ? { title: post.title, description: post.excerpt, alternates: { canonical: `/episodes/${post.slug}` }, openGraph: { title: post.title, description: post.excerpt, type: "article", url: `/episodes/${post.slug}`, images: post.youtubeVideoId ? [{ url: getYouTubeThumbnailUrl(post.youtubeVideoId), alt: `Thumbnail for ${post.title}` }] : undefined }, twitter: { card: "summary_large_image", title: post.title, description: post.excerpt, images: post.youtubeVideoId ? [getYouTubeThumbnailUrl(post.youtubeVideoId)] : undefined } } : {};
}

export default async function EpisodePage({ params }: EpisodePageProps) {
  const { slug } = await params;
  const post = await getPublicPost(slug);
  if (!post) notFound();
  const episode = await getPublicEpisode(post);
  const videoData = post.youtubeVideoId && post.publishedAt ? {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: post.title,
    description: post.excerpt,
    thumbnailUrl: getYouTubeThumbnailUrl(post.youtubeVideoId),
    uploadDate: post.publishedAt,
    embedUrl: `https://www.youtube-nocookie.com/embed/${post.youtubeVideoId}`,
    url: getYouTubeWatchUrl(post.youtubeVideoId),
    publisher: { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
  } : null;

  return (
    <PageTransition>
      {videoData ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(videoData).replace(/</g, "\\u003c") }} /> : null}
      <article className="article-shell">
        <Link href="/episodes" transitionTypes={["nav-back"]} className="article-back"><ArrowLeft size={14} /> Episode archive</Link>
        <header className="article-header">
          <span className="eyebrow">{post.category}</span>
          <h1>{post.title}</h1>
          <p>{post.excerpt}</p>
          <div className="article-byline"><span className="mini-avatar" style={{ margin: 0 }}>PX</span><span>By Pimx</span><span>·</span><span>{episode.number}</span><span>·</span><span>{post.date}</span></div>
        </header>
        <EpisodeResources episode={episode} transitionName={`episode-media-${slug}`} />
        <div className="article-body"><h2>Episode notes</h2><p style={{ whiteSpace: "pre-line" }}>{post.content}</p></div>
        <CommentsThread postSlug={slug} />
      </article>
    </PageTransition>
  );
}
