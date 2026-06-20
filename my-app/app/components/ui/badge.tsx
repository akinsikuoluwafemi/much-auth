type Variant =
  | "default"
  | "success"
  | "warning"
  | "destructive"
  | "indigo"
  | "zinc";

interface BadgeProps {
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<Variant, string> = {
  default: "bg-zinc-800 text-zinc-300 border-zinc-700",
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  destructive: "bg-red-500/10 text-red-400 border-red-500/20",
  indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  zinc: "bg-zinc-800/50 text-zinc-400 border-zinc-700/50",
};

// Maps auth roles to badge variants
export const roleBadgeVariant: Record<string, Variant> = {
  admin: "indigo",
  member: "default",
  viewer: "zinc",
  user: "zinc",
};

export function Badge({
  variant = "default",
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md border",
        variantClasses[variant],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
