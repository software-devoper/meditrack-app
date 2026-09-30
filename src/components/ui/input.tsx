import * as React from "react"
import { cn } from "@/src/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  disableAutoCapitalize?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, onChange, disableAutoCapitalize = false, ...props }, ref) => {
    // Track the last value to detect when we should apply auto-capitalization
    // We initialize it with the current value to avoid re-capitalizing existing data
    const lastValueRef = React.useRef<string>(
      (props.value !== undefined ? props.value : props.defaultValue)?.toString() || ""
    );

    // Sync lastValueRef if props.value changes externally
    React.useEffect(() => {
      if (props.value !== undefined) {
        lastValueRef.current = props.value.toString();
      }
    }, [props.value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value;

      // Behavior: Every text input should defaultly start with a capital letter,
      // but only if it's a new entry (last value was empty) and it's a text-like field.
      // We skip this for passwords (even when shown as text) and if disabled.
      if (
        !disableAutoCapitalize &&
        (type === "text" || !type) &&
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
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm ring-offset-white dark:ring-offset-slate-900 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        onChange={handleChange}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
