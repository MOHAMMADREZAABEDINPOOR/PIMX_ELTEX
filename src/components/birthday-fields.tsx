"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { FieldError } from "./form-feedback";
import type { FieldErrors } from "@/lib/form-validation";

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const latestYear = new Date().getUTCFullYear() - 13;
const years = Array.from({ length: 108 }, (_, index) => latestYear - index);

export function BirthdayFields({ errors, clearField }: { errors: FieldErrors; clearField: (field: string) => void }) {
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const daysInMonth = year && month ? new Date(Number(year), Number(month), 0).getDate() : month ? new Date(2000, Number(month), 0).getDate() : 31;

  return <fieldset className="birthday-fields">
    <legend>Date of birth</legend>
    <div className="birthday-selects">
      <div className="field"><label htmlFor="birthYear">Year</label><div className="birthday-select-wrap"><select id="birthYear" name="birthYear" required value={year} aria-invalid={Boolean(errors.birthYear) || undefined} aria-describedby={errors.birthYear ? "birthYear-error" : undefined} onChange={(event) => { setYear(event.target.value); if (day && month && Number(day) > new Date(Number(event.target.value || 2000), Number(month), 0).getDate()) setDay(""); clearField("birthYear"); clearField("birthDay"); }}><option value="">Year</option>{years.map((value) => <option key={value} value={value}>{value}</option>)}</select><ChevronDown size={15} aria-hidden="true" /></div><FieldError id="birthYear-error" message={errors.birthYear} /></div>
      <div className="field"><label htmlFor="birthMonth">Month</label><div className="birthday-select-wrap"><select id="birthMonth" name="birthMonth" required value={month} aria-invalid={Boolean(errors.birthMonth) || undefined} aria-describedby={errors.birthMonth ? "birthMonth-error" : undefined} onChange={(event) => { setMonth(event.target.value); if (day && Number(day) > new Date(Number(year || 2000), Number(event.target.value || 1), 0).getDate()) setDay(""); clearField("birthMonth"); clearField("birthDay"); }}><option value="">Month</option>{months.map((value, index) => <option key={value} value={index + 1}>{value}</option>)}</select><ChevronDown size={15} aria-hidden="true" /></div><FieldError id="birthMonth-error" message={errors.birthMonth} /></div>
      <div className="field"><label htmlFor="birthDay">Day</label><div className="birthday-select-wrap"><select id="birthDay" name="birthDay" required value={day} aria-invalid={Boolean(errors.birthDay) || undefined} aria-describedby={errors.birthDay ? "birthDay-error" : undefined} onChange={(event) => { setDay(event.target.value); clearField("birthDay"); }}><option value="">Day</option>{Array.from({ length: daysInMonth }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select><ChevronDown size={15} aria-hidden="true" /></div><FieldError id="birthDay-error" message={errors.birthDay} /></div>
    </div>
    <p className="birthday-hint">Your full birth date is used to confirm the minimum age of 13.</p>
  </fieldset>;
}
