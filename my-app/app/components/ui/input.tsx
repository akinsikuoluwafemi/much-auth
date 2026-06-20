import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={id}
            className="text-xs font-medium text-zinc-400 uppercase tracking-wider"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={[
            "w-full px-3 py-2 text-sm rounded-lg",
            "bg-zinc-900 border text-zinc-100 placeholder:text-zinc-600",
            "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 focus:ring-offset-zinc-950",
            "transition-colors duration-150",
            error
              ? "border-red-500/50 focus:ring-red-500"
              : "border-zinc-800 hover:border-zinc-700",
            className,
          ].join(" ")}
          {...props}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  },
);

Input.displayName = "Input";
