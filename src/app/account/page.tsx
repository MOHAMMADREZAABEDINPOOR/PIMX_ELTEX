import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { Clock3, Mail, MessageCircle, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountActions } from "@/components/account-actions";
import { AccountProfileForm } from "@/components/account-profile-form";
import { getDatabase } from "@/db";
import { comments, posts, sessions, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { initials } from "@/lib/utils";

export const metadata: Metadata = { title: "Your account", description: "Review your PIMX_ELTEX profile, comments, and active sessions.", robots: { index: false, follow: false } };

function formatDate(value: Date | null) {
  return value ? value.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Not yet";
}

export default async function AccountPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login?next=/account");
  const db = await getDatabase();
  if (!db) return <section className="status-page"><h1>Account unavailable</h1><p>The account database could not be reached.</p></section>;

  const [profileRows, activity, activeSessions] = await Promise.all([
    db.select({ name: users.name, username: users.username, email: users.email, role: users.role, emailVerifiedAt: users.emailVerifiedAt, createdAt: users.createdAt, lastLoginAt: users.lastLoginAt }).from(users).where(eq(users.id, currentUser.id)).limit(1),
    db.select({ id: comments.id, content: comments.content, status: comments.status, createdAt: comments.createdAt, editedAt: comments.editedAt, postTitle: posts.title, postSlug: posts.slug }).from(comments).innerJoin(posts, eq(posts.id, comments.postId)).where(eq(comments.authorId, currentUser.id)).orderBy(desc(comments.createdAt)).limit(100),
    db.select({ id: sessions.id, deviceType: sessions.deviceType, operatingSystem: sessions.operatingSystem, browser: sessions.browser, city: sessions.city, region: sessions.region, countryCode: sessions.countryCode, lastSeenAt: sessions.lastSeenAt, createdAt: sessions.createdAt }).from(sessions).where(eq(sessions.userId, currentUser.id)).orderBy(desc(sessions.lastSeenAt)).limit(10),
  ]);
  const profile = profileRows[0];
  if (!profile) redirect("/login");

  return <section className="account-page">
    <header className="account-hero"><div className="account-avatar-xl">{initials(profile.name)}</div><div><span className="eyebrow">YOUR SPACE</span><h1>{profile.name}</h1><p>@{profile.username} · {profile.role}</p></div><AccountActions /></header>
    <div className="account-stats"><article><MessageCircle size={18} /><span>Comments</span><strong>{activity.length}</strong></article><article><ShieldCheck size={18} /><span>Email status</span><strong>{profile.emailVerifiedAt ? "Verified" : "Pending"}</strong></article><article><Clock3 size={18} /><span>Last sign in</span><strong>{formatDate(profile.lastLoginAt)}</strong></article></div>
    <div className="account-grid">
      <section className="account-panel"><header><div><span className="eyebrow">ACTIVITY</span><h2>Your comments</h2></div><span className="tag">{activity.length}</span></header>{activity.length ? <div className="account-comment-list">{activity.map((comment) => <Link key={comment.id} href={`/episodes/${comment.postSlug}#comment-${comment.id}`}><div><strong>{comment.postTitle}</strong><span>{formatDate(comment.createdAt)}{comment.editedAt ? " · Edited" : ""}</span></div><p>{comment.content}</p><small className={`comment-status ${comment.status}`}>{comment.status}</small></Link>)}</div> : <div className="account-empty"><MessageCircle size={24} /><p>You have not posted any comments yet.</p><Link className="text-link" href="/episodes">Browse episodes</Link></div>}</section>
      <aside className="account-side">
        <section className="account-panel"><header><div><span className="eyebrow">PROFILE</span><h2>Account details</h2></div></header><AccountProfileForm initialName={profile.name} /><dl className="account-details"><div><dt><UserRound size={14} /> Username</dt><dd>@{profile.username}</dd></div><div><dt><Mail size={14} /> Email</dt><dd>{profile.email}</dd></div><div><dt><Clock3 size={14} /> Member since</dt><dd>{formatDate(profile.createdAt)}</dd></div></dl></section>
        <section className="account-panel"><header><div><span className="eyebrow">SECURITY</span><h2>Active sessions</h2></div><span className="tag">{activeSessions.length}</span></header><div className="account-session-list">{activeSessions.map((session) => <article key={session.id}><strong>{session.deviceType || "Device"} · {session.browser || "Browser"}</strong><span>{session.operatingSystem || "Unknown OS"}</span><small>{session.city || session.region || session.countryCode || "Unknown location"} · {formatDate(session.lastSeenAt)}</small></article>)}</div></section>
      </aside>
    </div>
  </section>;
}
