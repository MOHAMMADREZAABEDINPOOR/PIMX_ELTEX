import type { MetadataRoute } from "next";
import { getPublishedPosts } from "@/lib/public-content";
import { siteConfig } from "@/lib/site-config";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPublishedPosts();
  return [
    { url: siteConfig.url },
    { url: `${siteConfig.url}/episodes` },
    { url: `${siteConfig.url}/code` },
    { url: `${siteConfig.url}/privacy` },
    { url: `${siteConfig.url}/terms` },
    { url: `${siteConfig.url}/contact` },
    ...posts.map((post) => ({ url: `${siteConfig.url}/episodes/${post.slug}`, lastModified: post.publishedAt ? new Date(post.publishedAt) : undefined })),
  ];
}
