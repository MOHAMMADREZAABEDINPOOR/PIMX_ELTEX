export type FieldErrors = Record<string, string>;

export type FormResult = {
  message?: string;
  errors?: FieldErrors;
};

export async function readFormResult<T extends FormResult>(response: Response): Promise<T> {
  const body = await response.text();
  if (!body) throw new Error("The server returned an empty response. Please try again.");
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error("The server could not complete this request. Please try again.");
  }
}

export const passwordRequirements = [
  { key: "length", label: "At least 12 characters", test: (value: string) => value.length >= 12 },
  { key: "lowercase", label: "One lowercase letter", test: (value: string) => /[a-z]/.test(value) },
  { key: "uppercase", label: "One uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
  { key: "number", label: "One number", test: (value: string) => /[0-9]/.test(value) },
  { key: "symbol", label: "One symbol (!, @, #, _…)", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
] as const;

export function passwordError(value: string) {
  const missing = passwordRequirements.find((requirement) => !requirement.test(value));
  return missing ? `Password needs ${missing.label.toLowerCase()}.` : "";
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function displayNameError(value: string) {
  const name = value.trim();
  if (name.length < 2) return "Display name must contain at least 2 characters.";
  if (name.length > 80) return "Display name must contain no more than 80 characters.";
  if (/[\u0000-\u001f\u007f]/.test(name)) return "Display name contains an unsupported character.";
  return "";
}

export function birthDateErrors(yearValue = "", monthValue = "", dayValue = "", today = new Date()): FieldErrors {
  const errors: FieldErrors = {};
  const year = yearValue.trim();
  const month = monthValue.trim();
  const day = dayValue.trim();
  if (!year || !/^\d{4}$/.test(year)) errors.birthYear = "Select your birth year.";
  if (!month) errors.birthMonth = "Select your birth month.";
  else if (!/^(?:[1-9]|1[0-2])$/.test(month)) errors.birthMonth = "Select a valid birth month.";
  if (!day) errors.birthDay = "Select your birth day.";
  else if (!/^(?:[1-9]|[12][0-9]|3[01])$/.test(day)) errors.birthDay = "Select a valid birth day.";
  if (Object.keys(errors).length) return errors;
  const birthDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (birthDate.getUTCFullYear() !== Number(year) || birthDate.getUTCMonth() + 1 !== Number(month) || birthDate.getUTCDate() !== Number(day)) {
    errors.birthDay = "That day does not exist in the selected month and year.";
    return errors;
  }
  const currentYear = today.getUTCFullYear();
  const age = currentYear - Number(year) - (today.getUTCMonth() + 1 < Number(month) || (today.getUTCMonth() + 1 === Number(month) && today.getUTCDate() < Number(day)) ? 1 : 0);
  if (age < 13) errors.birthYear = "You must be at least 13 years old to sign up.";
  else if (age > 120) errors.birthYear = "Enter a valid birth year.";
  return errors;
}

export function validateAuthFields(mode: "login" | "signup" | "forgot", values: Record<string, string>): FieldErrors {
  const errors: FieldErrors = {};
  if (mode === "signup") {
    const name = values.name?.trim() || "";
    const username = values.username?.trim() || "";
    const nameError = displayNameError(name);
    if (nameError) errors.name = nameError;
    Object.assign(errors, birthDateErrors(values.birthYear, values.birthMonth, values.birthDay));
    if (!values.declaredCountryCode || !/^[A-Z]{2}$/.test(values.declaredCountryCode)) errors.declaredCountryCode = "Select your country.";
    if (!/^[A-Za-z0-9_]{3,24}$/.test(username)) errors.username = "Use 3–24 letters, numbers, or underscores.";
  }
  const email = values.email?.trim() || "";
  if (!isEmail(email)) errors.email = "Enter a valid email address.";
  if (mode !== "forgot") {
    const password = values.password || "";
    if (mode === "signup") {
      const error = passwordError(password);
      if (error) errors.password = error;
      else if (password.length > 128) errors.password = "Password must contain no more than 128 characters.";
      if (!values.confirmPassword) errors.confirmPassword = "Repeat your password.";
      else if (values.confirmPassword !== password) errors.confirmPassword = "Passwords do not match.";
    } else if (password.length < 8) errors.password = "Enter your password (at least 8 characters).";
  }
  return errors;
}

export function validateCode(code: string) {
  return /^\d{6}$/.test(code) ? "" : "Enter the complete six-digit code.";
}
