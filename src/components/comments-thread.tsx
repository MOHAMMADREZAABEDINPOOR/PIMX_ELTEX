"use client";

import { LoaderCircle, LogIn, MessageCircle, Pencil, Send, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { CommentNode } from "@/lib/content";
import { TurnstileWidget } from "./turnstile-widget";
import { ConfirmDialog } from "./confirm-dialog";

function updateTree(nodes: CommentNode[], id: string, updater: (node: CommentNode) => CommentNode): CommentNode[] {
  return nodes.map((node) => node.id === id ? updater(node) : { ...node, replies: updateTree(node.replies, id, updater) });
}

function removeFromTree(nodes: CommentNode[], id: string): CommentNode[] {
  return nodes.filter((node) => node.id !== id).map((node) => ({ ...node, replies: removeFromTree(node.replies, id) }));
}

export function CommentsThread({ postSlug }: { postSlug: string }) {
  const [comments, setComments] = useState<CommentNode[]>([]);
  const [viewer, setViewer] = useState<{ name: string; role: string } | null | undefined>(undefined);
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState("");
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch("/api/auth/me", { signal: controller.signal }).then((response) => response.json() as Promise<{ user: { name: string; role: string } | null }>),
      fetch(`/api/comments?post=${encodeURIComponent(postSlug)}`, { signal: controller.signal }).then((response) => response.json() as Promise<{ comments: CommentNode[] }>),
    ]).then(([session, discussion]) => {
      setViewer(session.user);
      setComments(discussion.comments || []);
    }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setViewer(null);
      setMessage("The discussion could not be loaded.");
    });
    return () => controller.abort();
  }, [postSlug]);

  async function createComment(content: string, parentId: string | null = null) {
    const response = await fetch("/api/comments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ postSlug, parentId, content, turnstileToken }) });
    const result = await response.json() as { id?: string; message?: string; captchaRequired?: boolean };
    if (!response.ok || !result.id) { if (result.captchaRequired) setCaptchaRequired(true); setMessage(result.message || "Your comment could not be posted."); return false; }
    const node: CommentNode = { id: result.id, author: { name: viewer?.name || "You", initials: (viewer?.name || "You").slice(0, 2).toUpperCase(), role: viewer?.role === "admin" ? "Admin" : undefined }, content, createdAt: "Just now", likes: 0, dislikes: 0, reaction: null, isOwner: true, replies: [] };
    if (parentId) setComments((current) => updateTree(current, parentId, (parent) => ({ ...parent, replies: [...parent.replies, node] })));
    else setComments((current) => [node, ...current]);
    setMessage(""); return true;
  }

  async function addComment() {
    const content = draft.trim();
    if (!content || !viewer) return;
    if (await createComment(content)) setDraft("");
  }

  return (
    <section className="comments-section">
      <div className="comments-heading"><h2>Discussion</h2><span className="tag">{comments.length} threads</span></div>
      {viewer === undefined ? <div className="comment-auth-state"><LoaderCircle className="spin" size={16} /> Checking your session…</div> : viewer ? (
        <div className="comment-compose"><textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={3} maxLength={1200} placeholder="Add something useful to the conversation…" aria-label="New comment" />{captchaRequired ? <TurnstileWidget onToken={setTurnstileToken} /> : null}<div className="compose-actions"><button className="button button-primary" type="button" onClick={addComment}><Send size={14} /> Post comment</button></div></div>
      ) : <div className="comment-auth-state"><div><strong>Join the discussion</strong><p>Sign in to comment, reply, or like a message.</p></div><Link href={`/login?next=${encodeURIComponent(`/episodes/${postSlug}`)}`} className="button button-primary"><LogIn size={14} /> Sign in</Link></div>}
      {message ? <div className="form-message" role="status" style={{ marginTop: 12 }}>{message}</div> : null}
      <div className="comment-list">
        {comments.length ? comments.map((comment) => <CommentBranch key={comment.id} node={comment} canInteract={Boolean(viewer)} onReply={(id, content) => createComment(content, id)} onUpdate={(id, updater) => setComments((current) => updateTree(current, id, updater))} onDelete={(id) => setComments((current) => removeFromTree(current, id))} onError={setMessage} />) : <p className="empty-discussion">No comments yet. Start the conversation.</p>}
      </div>
    </section>
  );
}

function CommentBranch({ node, canInteract, depth = 0, onReply, onUpdate, onDelete, onError }: {
  node: CommentNode; canInteract: boolean; depth?: number;
  onReply: (id: string, content: string) => Promise<boolean>;
  onUpdate: (id: string, updater: (node: CommentNode) => CommentNode) => void;
  onDelete: (id: string) => void;
  onError: (message: string) => void;
}) {
  const [replying, setReplying] = useState(false); const [editing, setEditing] = useState(false); const [reacting, setReacting] = useState(false); const [confirmingDelete, setConfirmingDelete] = useState(false); const [deleting, setDeleting] = useState(false);
  const [text, setText] = useState(node.content); const [reply, setReply] = useState("");

  async function react(reaction: "like" | "dislike") { if (!canInteract || reacting) return; setReacting(true); try { const response = await fetch(`/api/comments/${node.id}/like`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reaction }) }); const result = await response.json().catch(() => ({ message: "The reaction service returned an invalid response." })) as { reaction?: number; likes?: number; dislikes?: number; message?: string }; if (!response.ok) return onError(result.message || "Reaction failed. Please try again."); onError(""); onUpdate(node.id, (current) => ({ ...current, reaction: result.reaction === 1 || result.reaction === -1 ? result.reaction : null, likes: result.likes ?? current.likes, dislikes: result.dislikes ?? current.dislikes })); } finally { setReacting(false); } }
  async function save() { const response = await fetch(`/api/comments/${node.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: text }) }); if (!response.ok) return onError("Edit failed."); onUpdate(node.id, (current) => ({ ...current, content: text.trim(), edited: true })); setEditing(false); }
  async function remove() { setDeleting(true); const response = await fetch(`/api/comments/${node.id}`, { method: "DELETE" }); if (!response.ok) { setDeleting(false); return onError("Delete failed. Please try again."); } onDelete(node.id); }
  async function submitReply() { if (!reply.trim()) return; if (await onReply(node.id, reply.trim())) { setReply(""); setReplying(false); } }

  return <article className={`comment ${depth ? "comment-nested" : ""}`}>
    <div className="comment-head"><div className="comment-avatar">{node.author.initials}</div><div className="comment-author"><strong>{node.author.name}</strong><span>{node.createdAt}{node.author.role ? <em className="role-pill"> · {node.author.role}</em> : null}{node.edited ? " · Edited" : ""}</span></div></div>
    {editing ? <div className="reply-compose"><textarea rows={3} value={text} onChange={(event) => setText(event.target.value)} /><div className="compose-actions"><button type="button" className="button button-secondary" onClick={() => setEditing(false)}>Cancel</button><button type="button" className="button button-primary" onClick={save}>Save</button></div></div> : <p className="comment-content">{node.content}</p>}
    <div className="comment-actions"><button type="button" disabled={!canInteract || reacting} className={`comment-action ${node.reaction === 1 ? "liked" : ""}`} onClick={() => void react("like")} aria-label="Like comment"><ThumbsUp size={13} fill={node.reaction === 1 ? "currentColor" : "none"} aria-hidden="true" /> {node.likes}</button><button type="button" disabled={!canInteract || reacting} className={`comment-action ${node.reaction === -1 ? "disliked" : ""}`} onClick={() => void react("dislike")} aria-label="Dislike comment"><ThumbsDown size={13} fill={node.reaction === -1 ? "currentColor" : "none"} aria-hidden="true" /> {node.dislikes}</button><button type="button" disabled={!canInteract} className="comment-action" onClick={() => setReplying((value) => !value)}><MessageCircle size={13} aria-hidden="true" /> Reply</button>{node.isOwner ? <button type="button" className="comment-action" onClick={() => setEditing(true)}><Pencil size={12} aria-hidden="true" /> Edit</button> : null}{node.isOwner ? <button type="button" className="comment-action danger" onClick={() => setConfirmingDelete(true)}><Trash2 size={12} aria-hidden="true" /> Delete</button> : null}</div>
    {replying ? <div className="reply-compose"><textarea rows={2} value={reply} onChange={(event) => setReply(event.target.value)} placeholder={`Reply to ${node.author.name}…`} /><div className="compose-actions"><button type="button" className="button button-secondary" onClick={() => setReplying(false)}>Cancel</button><button type="button" className="button button-primary" onClick={submitReply}>Reply</button></div></div> : null}
    {node.replies.map((child) => <CommentBranch key={child.id} node={child} canInteract={canInteract} depth={Math.min(depth + 1, 5)} onReply={onReply} onUpdate={onUpdate} onDelete={onDelete} onError={onError} />)}
    <ConfirmDialog open={confirmingDelete} title="Delete this comment?" description="This action removes the comment from the discussion. This cannot be undone." confirmLabel="Delete comment" busy={deleting} onCancel={() => setConfirmingDelete(false)} onConfirm={remove} />
  </article>;
}
