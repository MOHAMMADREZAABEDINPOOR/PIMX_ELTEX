import assert from "node:assert/strict";
import { test } from "node:test";
import { birthDateErrors, validateAuthFields } from "../src/lib/form-validation.ts";

const validSignup = {
  name: "Example Member",
  birthYear: "2004",
  username: "example_member",
  email: "member@example.com",
  password: "A-valid-password-123!",
  confirmPassword: "A-valid-password-123!",
  birthMonth: "2",
  birthDay: "28",
};

test("birth date requires a real year, month, and day", () => {
  assert.ok(birthDateErrors().birthYear);
  assert.deepEqual(birthDateErrors("2004", "2", "29"), {});
  assert.ok(birthDateErrors("2003", "2", "29").birthDay);
  assert.ok(birthDateErrors("2004", "13", "1").birthMonth);
  assert.ok(birthDateErrors("2004", "4", "").birthDay);
  assert.ok(birthDateErrors("", "4", "12").birthYear);
});

test("signup errors identify only the incorrect password confirmation", () => {
  assert.deepEqual(validateAuthFields("signup", validSignup), {});
  assert.deepEqual(validateAuthFields("signup", { ...validSignup, confirmPassword: "wrong" }), {
    confirmPassword: "Passwords do not match.",
  });
  assert.deepEqual(validateAuthFields("signup", { ...validSignup, confirmPassword: "" }), {
    confirmPassword: "Repeat your password.",
  });
});
