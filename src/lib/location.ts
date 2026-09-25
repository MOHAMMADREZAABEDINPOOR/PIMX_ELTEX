const countryNames = new Intl.DisplayNames(["en"], { type: "region" });
const nonCountryCodes = new Set(["AC", "CP", "DG", "EA", "EU", "EZ", "IC", "QO", "TA", "UN", "XX", "ZZ"]);

export function countryName(code: string | null | undefined) {
  const normalized = code?.trim().toUpperCase();
  if (!normalized || nonCountryCodes.has(normalized) || !/^[A-Z]{2}$/.test(normalized)) return "Not available";
  const name = countryNames.of(normalized);
  return name && name !== normalized ? name : "Not available";
}

export function locationName(city: string | null | undefined, region: string | null | undefined, countryCode: string | null | undefined) {
  const country = countryName(countryCode);
  const parts = [city, region, country === "Not available" ? null : country].filter((part): part is string => Boolean(part?.trim()));
  return [...new Set(parts)].join(", ") || "Not available";
}

export const countryOptions = Array.from({ length: 26 * 26 }, (_, index) => String.fromCharCode(65 + Math.floor(index / 26), 65 + index % 26))
  .map((code) => ({ value: code, label: countryName(code) }))
  .filter((option) => option.label !== "Not available")
  .sort((left, right) => left.label.localeCompare(right.label, "en"));
