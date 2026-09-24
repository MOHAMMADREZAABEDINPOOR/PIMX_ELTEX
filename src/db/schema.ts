import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
};

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    username: text("username").notNull(),
    age: integer("age"),
    birthMonth: integer("birth_month"),
    birthDay: integer("birth_day"),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    avatarUrl: text("avatar_url"),
    bio: text("bio"),
    role: text("role", { enum: ["user", "editor", "admin"] })
      .notNull()
      .default("user"),
    status: text("status", { enum: ["active", "blocked", "deleted"] })
      .notNull()
      .default("active"),
    emailVerifiedAt: integer("email_verified_at", { mode: "timestamp" }),
    countryCode: text("country_code", { length: 2 }),
    lastLoginAt: integer("last_login_at", { mode: "timestamp" }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    uniqueIndex("users_username_unique").on(table.username),
    index("users_country_idx").on(table.countryCode),
  ],
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    countryCode: text("country_code", { length: 2 }),
    deviceType: text("device_type"),
    operatingSystem: text("operating_system"),
    browser: text("browser"),
    city: text("city"),
    region: text("region"),
    ipAddressCiphertext: text("ip_address_ciphertext"),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex("sessions_token_unique").on(table.tokenHash),
    index("sessions_user_idx").on(table.userId),
    index("sessions_expiry_idx").on(table.expiresAt),
  ],
);

export const otps = sqliteTable(
  "otps",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    email: text("email").notNull(),
    purpose: text("purpose", {
      enum: ["verify_email", "reset_password", "change_password"],
    }).notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    consumedAt: integer("consumed_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index("otps_email_purpose_idx").on(table.email, table.purpose),
    index("otps_expiry_idx").on(table.expiresAt),
  ],
);

export const posts = sqliteTable(
  "posts",
  {
    id: text("id").primaryKey(),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull(),
    content: text("content").notNull(),
    youtubeVideoId: text("youtube_video_id"),
    coverUrl: text("cover_url"),
    category: text("category").notNull(),
    status: text("status", { enum: ["draft", "scheduled", "published"] })
      .notNull()
      .default("draft"),
    publishedAt: integer("published_at", { mode: "timestamp" }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("posts_slug_unique").on(table.slug),
    index("posts_status_date_idx").on(table.status, table.publishedAt),
  ],
);

export const episodeResources = sqliteTable(
  "episode_resources",
  {
    id: text("id").primaryKey(),
    postId: text("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["prompt", "link", "code", "download"] }).notNull(),
    title: text("title").notNull(),
    description: text("description"),
    content: text("content"),
    url: text("url"),
    language: text("language"),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (table) => [index("episode_resources_post_order_idx").on(table.postId, table.sortOrder)],
);

export type EpisodeFileManifestItem = {
  path: string;
  size: number;
  type: string;
};

export const episodePrompts = sqliteTable(
  "episode_prompts",
  {
    id: text("id").primaryKey(),
    postId: text("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    content: text("content").notNull(),
    previewUrl: text("preview_url"),
    downloadUrl: text("download_url"),
    fileCount: integer("file_count").notNull().default(0),
    totalBytes: integer("total_bytes").notNull().default(0),
    files: text("files", { mode: "json" }).$type<EpisodeFileManifestItem[]>().notNull().default([]),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (table) => [index("episode_prompts_post_order_idx").on(table.postId, table.sortOrder)],
);

export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    tech: text("tech", { mode: "json" }).$type<string[]>().notNull(),
    previewUrl: text("preview_url").notNull(),
    downloadUrl: text("download_url").notNull(),
    coverUrl: text("cover_url"),
    status: text("status", { enum: ["draft", "published"] }).notNull().default("draft"),
    ...timestamps,
  },
  (table) => [uniqueIndex("projects_slug_unique").on(table.slug)],
);

export const comments = sqliteTable(
  "comments",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    parentId: text("parent_id").references((): AnySQLiteColumn => comments.id, {
      onDelete: "cascade",
    }),
    content: text("content").notNull(),
    status: text("status", { enum: ["visible", "hidden", "deleted"] })
      .notNull()
      .default("visible"),
    editedAt: integer("edited_at", { mode: "timestamp" }),
    ...timestamps,
  },
  (table) => [
    index("comments_post_parent_idx").on(table.postId, table.parentId),
    index("comments_author_idx").on(table.authorId),
  ],
);

export const commentLikes = sqliteTable(
  "comment_likes",
  {
    commentId: text("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reaction: integer("reaction").notNull().default(1),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [primaryKey({ columns: [table.commentId, table.userId] })],
);

export const userDevices = sqliteTable(
  "user_devices",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fingerprintHash: text("fingerprint_hash").notNull(),
    countryCode: text("country_code", { length: 2 }),
    deviceType: text("device_type"),
    operatingSystem: text("operating_system"),
    browser: text("browser"),
    city: text("city"),
    region: text("region"),
    ipAddressCiphertext: text("ip_address_ciphertext"),
    visitCount: integer("visit_count").notNull().default(0),
    totalDurationSeconds: integer("total_duration_seconds").notNull().default(0),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex("devices_user_fingerprint_unique").on(
      table.userId,
      table.fingerprintHash,
    ),
  ],
);

export const siteVisits = sqliteTable(
  "site_visits",
  {
    id: text("id").primaryKey(),
    visitorHash: text("visitor_hash").notNull(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    path: text("path").notNull(),
    countryCode: text("country_code", { length: 2 }),
    city: text("city"),
    region: text("region"),
    deviceType: text("device_type"),
    operatingSystem: text("operating_system"),
    browser: text("browser"),
    ipAddressCiphertext: text("ip_address_ciphertext"),
    durationSeconds: integer("duration_seconds").notNull().default(0),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [
    index("site_visits_visitor_date_idx").on(table.visitorHash, table.createdAt),
    index("site_visits_user_date_idx").on(table.userId, table.createdAt),
    index("site_visits_country_idx").on(table.countryCode),
    index("site_visits_device_idx").on(table.deviceType),
    index("site_visits_path_idx").on(table.path),
  ],
);

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    actorId: text("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [index("audit_actor_date_idx").on(table.actorId, table.createdAt)],
);

export const rateLimits = sqliteTable(
  "rate_limits",
  {
    key: text("key").primaryKey(),
    action: text("action").notNull(),
    count: integer("count").notNull().default(1),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("rate_limits_expiry_idx").on(table.expiresAt)],
);

export const newsletterSubscriptions = sqliteTable(
  "newsletter_subscriptions",
  {
    id: text("id").primaryKey(),
    emailHash: text("email_hash").notNull(),
    emailCiphertext: text("email_ciphertext").notNull(),
    status: text("status", { enum: ["active", "unsubscribed"] }).notNull().default("active"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [uniqueIndex("newsletter_email_hash_unique").on(table.emailHash)],
);

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  posts: many(posts),
  comments: many(comments),
  likes: many(commentLikes),
  devices: many(userDevices),
  visits: many(siteVisits),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
  comments: many(comments),
  prompts: many(episodePrompts),
}));

export const episodePromptsRelations = relations(episodePrompts, ({ one }) => ({
  post: one(posts, { fields: [episodePrompts.postId], references: [posts.id] }),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  post: one(posts, { fields: [comments.postId], references: [posts.id] }),
  author: one(users, { fields: [comments.authorId], references: [users.id] }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: "commentReplies",
  }),
  replies: many(comments, { relationName: "commentReplies" }),
  likes: many(commentLikes),
}));

export type User = typeof users.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Comment = typeof comments.$inferSelect;
