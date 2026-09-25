export const adminPermissionGroups = [
  { title: "Dashboard", items: [{ key: "analytics.view", label: "View analytics" }] },
  { title: "Episodes", items: [{ key: "episodes.create", label: "Create episodes" }, { key: "episodes.edit", label: "Edit episodes" }, { key: "episodes.delete", label: "Delete episodes" }, { key: "uploads.create", label: "Upload episode files" }] },
  { title: "Projects", items: [{ key: "projects.create", label: "Create projects" }, { key: "projects.edit", label: "Edit projects" }, { key: "projects.delete", label: "Delete projects" }] },
  { title: "Community", items: [{ key: "comments.delete", label: "Delete any comment" }, { key: "members.view", label: "View member details" }, { key: "members.block", label: "Block or unblock members" }, { key: "members.delete", label: "Delete members" }, { key: "members.sessions", label: "Revoke member sessions" }, { key: "members.roles", label: "Manage administrator roles" }] },
] as const;

export const adminPermissionKeys = adminPermissionGroups.flatMap((group) => group.items.map((item) => item.key));
export type AdminPermission = (typeof adminPermissionKeys)[number];

export function hasAdminPermission(user: { role: string; adminPermissions?: string[] | null } | null, permission: AdminPermission) {
  return user?.role === "admin" && (user.adminPermissions === null || (Array.isArray(user.adminPermissions) && user.adminPermissions.includes(permission)));
}

export function effectiveAdminPermissions(user: { role: string; adminPermissions?: string[] | null } | null): AdminPermission[] {
  return adminPermissionKeys.filter((permission) => hasAdminPermission(user, permission));
}
