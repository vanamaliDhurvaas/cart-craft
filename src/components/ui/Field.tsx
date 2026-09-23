import { forwardRef } from "react";
import { cn } from "@/lib/cn";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mt-4 mb-1.5 block text-sm font-semibold text-fg-muted", className)} {...props} />;
}

const controlBase =
  "w-full rounded-[var(--radius-control)] border border-line-strong/70 bg-surface-solid px-4 py-2.5 text-[15px] text-fg " +
  "placeholder:text-fg-faint transition-all duration-300 " +
  "hover:border-line-strong " +
  "focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(controlBase, className)} {...props} />
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(controlBase, "min-h-[120px] resize-y leading-relaxed", className)} {...props} />
  )
);
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(controlBase, "cursor-pointer", className)} {...props}>
      {children}
    </select>
  )
);
Select.displayName = "Select";

export function Hint({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-2 text-xs leading-relaxed text-fg-faint", className)} {...props} />;
}

export function ErrorText({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-2 text-sm font-medium text-danger", className)} {...props} />;
}

export function SuccessText({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-2 text-sm font-medium text-accent", className)} {...props} />;
}
