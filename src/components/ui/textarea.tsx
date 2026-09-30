import * as React from "react"
import { cn } from "@/src/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, onChange, ...props }, ref) => {
    const lastValueRef = React.useRef<string>(
      (props.value !== undefined ? props.value : props.defaultValue)?.toString() || ""
    );

    React.useEffect(() => {
      if (props.value !== undefined) {
        lastValueRef.current = props.value.toString();
      }
    }, [props.value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      let val = e.target.value;

      if (
        val.length > 0 &&
        lastValueRef.current === "" &&
        /^[a-z]/.test(val)
      ) {
        val = val.charAt(0).toUpperCase() + val.slice(1);
        e.target.value = val;
      }

      lastValueRef.current = val;
      if (onChange) {
        onChange(e);
      }
    };

    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm ring-offset-white dark:ring-offset-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        onChange={handleChange}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
