import type { MetadataRoute } from "next";
import { getPublishedPosts, getPublishedProjects } from "@/lib/public-content";
import { siteConfig } from "@/lib/site-config";
import { getYouTubeThumbnailUrl } from "@/lib/youtube";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, projects] = await Promise.all([getPublishedPosts(), getPublishedProjects()]);
  return [
    { url: siteConfig.url, changeFrequency: "weekly", priority: 1 },
    { url: `${siteConfig.url}/episodes`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteConfig.url}/code`, changeFrequency: "weekly", priority: 0.9, images: projects.map((project) => new URL(project.coverUrl, siteConfig.url).href) },
    { url: `${siteConfig.url}/privacy` },
    { url: `${siteConfig.url}/terms` },
    { url: `${siteConfig.url}/contact` },
    ...posts.map((post) => ({ url: `${siteConfig.url}/episodes/${post.slug}`, lastModified: post.publishedAt ? new Date(post.publishedAt) : undefined, changeFrequency: "monthly" as const, priority: 0.8, images: post.youtubeVideoId ? [getYouTubeThumbnailUrl(post.youtubeVideoId)] : [] })),
  ];
}
