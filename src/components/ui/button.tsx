import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  children: React.ReactNode;
}

export function Button({ variant = "primary", className, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={cn(
        "rounded-md px-4 py-2 text-sm font-medium transition-colors",
        variant === "primary" && !disabled && "bg-black text-white hover:bg-gray-800",
        variant === "secondary" && !disabled && "bg-gray-100 text-gray-900 hover:bg-gray-200",
        variant === "danger" && !disabled && "bg-red-600 text-white hover:bg-red-700",
        disabled && "cursor-not-allowed bg-gray-100 text-gray-400",
        !disabled && className,
        disabled && className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
