import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 select-none",
  {
    variants: {
      variant: {
        default:
          "rounded-xl bg-primary text-primary-foreground shadow-[0_2px_0_0_#0f172a,0_3px_6px_-2px_rgba(0,0,0,0.15)] hover:shadow-[0_1px_0_0_#0f172a,0_2px_4px_-1px_rgba(0,0,0,0.12)] hover:translate-y-[1px] active:shadow-[0_0px_0_0_#0f172a,0_1px_2px_-1px_rgba(0,0,0,0.1)] active:translate-y-[2px]",
        destructive:
          "rounded-xl bg-destructive text-destructive-foreground shadow-[0_2px_0_0_#d62d20,0_3px_6px_-2px_rgba(0,0,0,0.15)] hover:shadow-[0_1px_0_0_#d62d20,0_2px_4px_-1px_rgba(0,0,0,0.12)] hover:translate-y-[1px] active:shadow-[0_0px_0_0_#d62d20,0_1px_2px_-1px_rgba(0,0,0,0.1)] active:translate-y-[2px]",
        outline:
          "rounded-xl border-2 border-border bg-card shadow-sm hover:bg-muted hover:border-[#c7c7cc] active:shadow-inner",
        secondary:
          "rounded-xl bg-secondary text-secondary-foreground shadow-[0_2px_0_0_#d1d1d6,0_3px_6px_-2px_rgba(0,0,0,0.1)] hover:shadow-[0_1px_0_0_#d1d1d6,0_2px_4px_-1px_rgba(0,0,0,0.08)] hover:translate-y-[1px] active:shadow-[0_0px_0_0_#d1d1d6,0_1px_2px_-1px_rgba(0,0,0,0.05)] active:translate-y-[2px]",
        ghost: "rounded-xl hover:bg-muted",
        link: "text-[#007aff] underline-offset-4 hover:underline",
        success:
          "rounded-xl bg-success text-success-foreground shadow-[0_2px_0_0_#248a3d,0_3px_6px_-2px_rgba(0,0,0,0.15)] hover:shadow-[0_1px_0_0_#248a3d,0_2px_4px_-1px_rgba(0,0,0,0.12)] hover:translate-y-[1px] active:shadow-[0_0px_0_0_#248a3d,0_1px_2px_-1px_rgba(0,0,0,0.1)] active:translate-y-[2px]",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 rounded-xl px-4 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
