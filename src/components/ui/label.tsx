import type { LabelHTMLAttributes } from "react";
import { cn } from "cn";

function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label data-slot="label" className={cn("text-sm leading-none font-medium select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50", className)} {...props} />;
}

export { Label };
