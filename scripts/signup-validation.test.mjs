import assert from "node:assert/strict";
import { test } from "node:test";
import { birthDateErrors, validateAuthFields } from "../src/lib/form-validation.ts";

const validSignup = {
  name: "Example Member",
  age: "22",
  username: "example_member",
  email: "member@example.com",
  password: "A-valid-password-123!",
  confirmPassword: "A-valid-password-123!",
  birthMonth: "",
  birthDay: "",
};

test("birthday is optional but must be a real month and day when supplied", () => {
  assert.deepEqual(birthDateErrors(), {});
  assert.deepEqual(birthDateErrors("2", "29"), {});
  assert.ok(birthDateErrors("4", "31").birthDay);
  assert.ok(birthDateErrors("13", "1").birthMonth);
  assert.ok(birthDateErrors("4", "").birthDay);
  assert.ok(birthDateErrors("", "12").birthMonth);
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
