import type { Metadata } from "next";
import { count, countDistinct, desc, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AdminConsole } from "@/components/admin-console";
import { getDatabase } from "@/db";
import { auditLogs, comments, posts, projects, siteVisits, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Admin Console", description: "Protected PIMX_ELTEX content and community administration.", robots: { index: false, follow: false } };

export default async function AdminPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") redirect("/login?next=/admin");
  const db = await getDatabase();
  if (!db) return <AdminConsole stats={[{ label: "Members", value: "0", detail: "Database offline" }, { label: "Episodes", value: "0", detail: "Database offline" }, { label: "Projects", value: "0", detail: "Database offline" }, { label: "Comments", value: "0", detail: "Database offline" }, { label: "Countries", value: "0", detail: "Database offline" }]} analytics={{ totalViews: 0, uniqueVisitors: 0, totalDurationSeconds: 0, countries: [], devices: [], browsers: [], paths: [] }} initialUsers={[]} initialPosts={[]} initialProjects={[]} initialComments={[]} />;

  const [memberCount, postCount, projectCount, commentCount, countryCount, viewCount, visitorCount, durationTotal, countryViews, deviceViews, browserViews, pathViews, memberRows, postRows, projectRows, commentRows, activityRows] = await Promise.all([
    db.select({ value: count() }).from(users),
    db.select({ value: count() }).from(posts),
    db.select({ value: count() }).from(projects),
    db.select({ value: count() }).from(comments).where(eq(comments.status, "visible")),
    db.select({ value: countDistinct(users.countryCode) }).from(users),
    db.select({ value: count() }).from(siteVisits),
    db.select({ value: countDistinct(siteVisits.visitorHash) }).from(siteVisits),
    db.select({ value: sql<number>`coalesce(sum(${siteVisits.durationSeconds}), 0)` }).from(siteVisits),
    db.select({ label: siteVisits.countryCode, value: count() }).from(siteVisits).groupBy(siteVisits.countryCode).orderBy(desc(count())).limit(12),
    db.select({ label: siteVisits.deviceType, value: count() }).from(siteVisits).groupBy(siteVisits.deviceType).orderBy(desc(count())).limit(8),
    db.select({ label: siteVisits.browser, value: count() }).from(siteVisits).groupBy(siteVisits.browser).orderBy(desc(count())).limit(8),
    db.select({ label: siteVisits.path, value: count() }).from(siteVisits).groupBy(siteVisits.path).orderBy(desc(count())).limit(10),
    db.select({ id: users.id, name: users.name, age: users.age, email: users.email, country: users.countryCode, status: users.status }).from(users).orderBy(desc(users.createdAt)).limit(100),
    db.select({ id: posts.id, title: posts.title, slug: posts.slug, status: posts.status }).from(posts).orderBy(desc(posts.createdAt)).limit(100),
    db.select({ id: projects.id, title: projects.title, slug: projects.slug, status: projects.status, previewUrl: projects.previewUrl, downloadUrl: projects.downloadUrl }).from(projects).orderBy(desc(projects.createdAt)).limit(100),
    db.select({ id: comments.id, content: comments.content, author: users.name, post: posts.title }).from(comments).innerJoin(users, eq(users.id, comments.authorId)).innerJoin(posts, eq(posts.id, comments.postId)).where(eq(comments.status, "visible")).orderBy(desc(comments.createdAt)).limit(100),
    db.select({ id: auditLogs.id, action: auditLogs.action, targetType: auditLogs.targetType, targetId: auditLogs.targetId, createdAt: auditLogs.createdAt }).from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(12),
  ]);

  return <AdminConsole
    adminId={currentUser.id}
    stats={[
      { label: "Members", value: String(memberCount[0]?.value || 0), detail: "Registered accounts" },
      { label: "Episodes", value: String(postCount[0]?.value || 0), detail: "Draft and published" },
      { label: "Projects", value: String(projectCount[0]?.value || 0), detail: "Website releases" },
      { label: "Comments", value: String(commentCount[0]?.value || 0), detail: "Across all episodes" },
      { label: "Countries", value: String(countryCount[0]?.value || 0), detail: "Privacy-safe reach" },
      { label: "Page views", value: String(viewCount[0]?.value || 0), detail: "Consent-based analytics" },
    ]}
    analytics={{ totalViews: Number(viewCount[0]?.value || 0), uniqueVisitors: Number(visitorCount[0]?.value || 0), totalDurationSeconds: Number(durationTotal[0]?.value || 0), countries: countryViews.map((row) => ({ label: row.label || "Unknown", value: row.value })), devices: deviceViews.map((row) => ({ label: row.label || "Unknown", value: row.value })), browsers: browserViews.map((row) => ({ label: row.label || "Unknown", value: row.value })), paths: pathViews.map((row) => ({ label: row.label || "/", value: row.value })) }}
    initialUsers={memberRows.filter((member) => member.id !== "system-pimx").map((member) => ({ ...member, country: member.country || "Unknown" }))}
    initialPosts={postRows}
    initialProjects={projectRows}
    initialComments={commentRows}
    initialActivity={activityRows.map((entry) => ({ ...entry, createdAt: entry.createdAt.toISOString() }))}
  />;
}
