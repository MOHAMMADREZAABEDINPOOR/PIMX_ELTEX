import assert from "node:assert/strict";
import test from "node:test";
import { birthDateErrors, validateAuthFields } from "../src/lib/form-validation.ts";
import { adminPermissionKeys, effectiveAdminPermissions, hasAdminPermission } from "../src/lib/admin-permissions.ts";

const today = new Date("2026-09-25T12:00:00Z");

test("a complete birth date validates real calendar days and age", () => {
  assert.deepEqual(birthDateErrors("2008", "2", "29", today), {});
  assert.match(birthDateErrors("2007", "2", "29", today).birthDay, /does not exist/);
  assert.match(birthDateErrors("2013", "9", "26", today).birthYear, /at least 13/);
  assert.deepEqual(birthDateErrors("2013", "9", "25", today), {});
  assert.equal(birthDateErrors("", "", "", today).birthYear, "Select your birth year.");
});

test("signup asks for birth date instead of age", () => {
  const errors = validateAuthFields("signup", { name: "Test User", username: "tester", email: "test@example.com", password: "StrongPass123!", confirmPassword: "StrongPass123!", age: "25" });
  assert.equal("age" in errors, false);
  assert.equal(errors.birthYear, "Select your birth year.");
  assert.equal(errors.birthMonth, "Select your birth month.");
  assert.equal(errors.birthDay, "Select your birth day.");
});

test("delegated admins only hold their selected permissions", () => {
  const delegate = { role: "admin", adminPermissions: ["projects.edit"] };
  assert.equal(hasAdminPermission(delegate, "projects.edit"), true);
  assert.equal(hasAdminPermission(delegate, "projects.delete"), false);
  assert.deepEqual(effectiveAdminPermissions(delegate), ["projects.edit"]);
  assert.equal(effectiveAdminPermissions({ role: "admin", adminPermissions: null }).length, adminPermissionKeys.length);
  assert.equal(hasAdminPermission({ role: "user", adminPermissions: null }, "projects.delete"), false);
});
