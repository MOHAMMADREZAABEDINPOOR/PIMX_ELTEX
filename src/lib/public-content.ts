import "server-only";

import { asc, desc, eq } from "drizzle-orm";
import { getDatabase } from "@/db";
import { episodePrompts, episodeResources, posts as postsTable, projects as projectsTable } from "@/db/schema";
import { bundledEpisodes } from "@/content/bundled-episodes";

export type PublicPost = {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  date: string;
  publishedAt: string | null;
  readTime: string;
  accent: string;
  youtubeVideoId: string;
};

export type PublicProject = {
  slug: string;
  title: string;
  description: string;
  tech: readonly string[];
  previewUrl: string;
  coverUrl: string;
  downloadUrl: string;
  fileCount: number;
  episode: string;
};

export type PublicEpisode = {
  videoId: string;
  number: string;
  overview: string;
  prompts: readonly {
    title: string;
    description?: string;
    content: string;
    coverUrl?: string;
    previewUrl?: string;
    downloadUrl?: string;
    fileCount?: number;
    totalBytes?: number;
    files?: readonly { path: string; size: number; type: string }[];
  }[];
  links: readonly { name: string; url: string; note: string }[];
  project?: {
    title: string;
    description: string;
    previewUrl: string;
    downloadUrl: string;
    tech: readonly string[];
  };
};

function formatDate(value: Date | null) {
  return (value || new Date()).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric", timeZone: "UTC" });
}

export async function getPublishedPosts(): Promise<PublicPost[]> {
  if (process.env.PIMX_STATIC_BUILD === "1") return bundledEpisodes.map((episode) => episode.post);
  const db = await getDatabase();
  if (!db) return bundledEpisodes.map((episode) => episode.post);
  const rows = await db.select().from(postsTable).where(eq(postsTable.status, "published")).orderBy(desc(postsTable.publishedAt));
  return rows.map((row) => {
    return {
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt,
      content: row.content,
      category: row.category,
      date: formatDate(row.publishedAt),
      publishedAt: row.publishedAt?.toISOString() || null,
      readTime: `${Math.max(1, Math.ceil(row.content.split(/\s+/).length / 220))} min read`,
      accent: "violet",
      youtubeVideoId: row.youtubeVideoId || "",
    };
  });
}

export async function getPublicPost(slug: string): Promise<PublicPost | null> {
  const posts = await getPublishedPosts();
  return posts.find((post) => post.slug === slug) || null;
}

export async function getPublishedProjects(): Promise<PublicProject[]> {
  if (process.env.PIMX_STATIC_BUILD === "1") return bundledEpisodes.flatMap((episode) => episode.projects);
  const db = await getDatabase();
  if (!db) return bundledEpisodes.flatMap((episode) => episode.projects);
  const [rows, promptBundles] = await Promise.all([
    db.select().from(projectsTable).where(eq(projectsTable.status, "published")).orderBy(desc(projectsTable.createdAt)),
    db.select({ previewUrl: episodePrompts.previewUrl, fileCount: episodePrompts.fileCount, sortOrder: episodePrompts.sortOrder, postSlug: postsTable.slug, postTitle: postsTable.title, publishedAt: postsTable.publishedAt }).from(episodePrompts).innerJoin(postsTable, eq(postsTable.id, episodePrompts.postId)).where(eq(postsTable.status, "published")),
  ]);
  const bundleByPreview = new Map(promptBundles.filter((prompt) => prompt.previewUrl).map((prompt) => [prompt.previewUrl, prompt]));
  const bundledProjectBySlug = new Map(bundledEpisodes.flatMap((episode) => episode.projects).map((project) => [project.slug, project]));
  rows.sort((a, b) => {
    const aBundle = bundleByPreview.get(a.previewUrl);
    const bBundle = bundleByPreview.get(b.previewUrl);
    const dateOrder = (bBundle?.publishedAt || b.createdAt).getTime() - (aBundle?.publishedAt || a.createdAt).getTime();
    return dateOrder || (aBundle?.sortOrder ?? Number.MAX_SAFE_INTEGER) - (bBundle?.sortOrder ?? Number.MAX_SAFE_INTEGER) || a.slug.localeCompare(b.slug);
  });
  return rows.map((project) => ({
    ...project,
    coverUrl: project.coverUrl || `/project-previews/${project.slug}.webp`,
    tech: project.tech,
    fileCount: bundleByPreview.get(project.previewUrl)?.fileCount || 0,
    episode: bundledProjectBySlug.get(project.slug)?.episode || bundleByPreview.get(project.previewUrl)?.postTitle || "PIMX_ELTEX",
  }));
}

export async function getPublicEpisode(post: PublicPost): Promise<PublicEpisode> {
  const bundled = bundledEpisodes.find((episode) => episode.post.slug === post.slug);
  if (process.env.PIMX_STATIC_BUILD === "1" && bundled) return bundled.episode;
  const db = await getDatabase();
  if (!db && bundled) return bundled.episode;
  if (!db) return { videoId: post.youtubeVideoId, number: "Episode", overview: post.excerpt, prompts: [], links: [] };
  const [record] = await db.select({ id: postsTable.id }).from(postsTable).where(eq(postsTable.slug, post.slug)).limit(1);
  if (!record) return { videoId: post.youtubeVideoId, number: "Episode", overview: post.excerpt, prompts: [], links: [] };
  const [resources, storedPrompts, projectCovers] = await Promise.all([
    db.select().from(episodeResources).where(eq(episodeResources.postId, record.id)).orderBy(asc(episodeResources.sortOrder)),
    db.select().from(episodePrompts).where(eq(episodePrompts.postId, record.id)).orderBy(asc(episodePrompts.sortOrder)),
    db.select({ slug: projectsTable.slug, coverUrl: projectsTable.coverUrl, previewUrl: projectsTable.previewUrl }).from(projectsTable),
  ]);
  const coverByPreview = new Map(projectCovers.map((project) => [project.previewUrl, project.coverUrl || `/project-previews/${project.slug}.webp`]));
  const prompts = storedPrompts.length ? storedPrompts.map((prompt) => ({
    title: prompt.title,
    description: prompt.description || undefined,
    content: prompt.content,
    coverUrl: prompt.previewUrl ? coverByPreview.get(prompt.previewUrl) : undefined,
    previewUrl: prompt.previewUrl || undefined,
    downloadUrl: prompt.downloadUrl || undefined,
    fileCount: prompt.fileCount,
    totalBytes: prompt.totalBytes,
    files: prompt.files,
  })) : resources.filter((resource) => resource.type === "prompt" && resource.content).map((resource) => ({ title: resource.title, content: resource.content! }));
  const links = resources.filter((resource) => resource.type === "link" && resource.url).map((resource) => ({ name: resource.title, url: resource.url!, note: resource.description || "Episode resource" }));
  const preview = resources.find((resource) => resource.type === "code" && resource.url);
  const download = resources.find((resource) => resource.type === "download" && resource.url);
  return {
    videoId: post.youtubeVideoId,
    number: bundled?.episode.number || "Episode",
    overview: post.excerpt,
    prompts,
    links,
    project: preview && download ? { title: preview.title, description: preview.description || "Complete project from this episode.", previewUrl: preview.url!, downloadUrl: download.url!, tech: (preview.language || "Web").split(",").map((item) => item.trim()) } : undefined,
  };
}
