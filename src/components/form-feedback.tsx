import { Check, Circle } from "lucide-react";
import { passwordRequirements } from "@/lib/form-validation";

export function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <small className="field-error" id={id} role="alert">{message}</small> : null;
}

export function PasswordChecklist({ password }: { password: string }) {
  return <div className="password-checklist" aria-label="Password requirements">
    {passwordRequirements.map((requirement) => {
      const met = requirement.test(password);
      return <span key={requirement.key} className={met ? "met" : ""}><i>{met ? <Check size={12} /> : <Circle size={10} />}</i>{requirement.label}</span>;
    })}
  </div>;
}
