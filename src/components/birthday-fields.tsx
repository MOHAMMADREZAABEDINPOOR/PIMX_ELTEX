"use client";

import { useState } from "react";
import { BirthdaySelect } from "./birthday-select";
import { FieldError } from "./form-feedback";
import type { FieldErrors } from "@/lib/form-validation";

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const latestYear = new Date().getUTCFullYear() - 13;
const yearOptions = Array.from({ length: 108 }, (_, index) => ({ value: String(latestYear - index), label: String(latestYear - index) }));
const monthOptions = months.map((label, index) => ({ value: String(index + 1), label }));

export function BirthdayFields({ errors, clearField }: { errors: FieldErrors; clearField: (field: string) => void }) {
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const daysInMonth = year && month ? new Date(Number(year), Number(month), 0).getDate() : month ? new Date(2000, Number(month), 0).getDate() : 31;
  const dayOptions = Array.from({ length: daysInMonth }, (_, index) => ({ value: String(index + 1), label: String(index + 1) }));

  return <fieldset className="birthday-fields">
    <legend>Date of birth</legend>
    <div className="birthday-selects">
      <div className="field"><label htmlFor="birthYear">Year</label><BirthdaySelect id="birthYear" label="Year" value={year} options={yearOptions} error={errors.birthYear} onChange={(nextYear) => { setYear(nextYear); if (day && month && Number(day) > new Date(Number(nextYear), Number(month), 0).getDate()) setDay(""); clearField("birthYear"); clearField("birthDay"); }} /><FieldError id="birthYear-error" message={errors.birthYear} /></div>
      <div className="field"><label htmlFor="birthMonth">Month</label><BirthdaySelect id="birthMonth" label="Month" value={month} options={monthOptions} error={errors.birthMonth} onChange={(nextMonth) => { setMonth(nextMonth); if (day && Number(day) > new Date(Number(year || 2000), Number(nextMonth), 0).getDate()) setDay(""); clearField("birthMonth"); clearField("birthDay"); }} /><FieldError id="birthMonth-error" message={errors.birthMonth} /></div>
      <div className="field"><label htmlFor="birthDay">Day</label><BirthdaySelect id="birthDay" label="Day" value={day} options={dayOptions} error={errors.birthDay} onChange={(nextDay) => { setDay(nextDay); clearField("birthDay"); }} /><FieldError id="birthDay-error" message={errors.birthDay} /></div>
    </div>
    <p className="birthday-hint">Your full birth date is used to confirm the minimum age of 13.</p>
  </fieldset>;
}
