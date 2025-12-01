import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef } from "react";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:ring-ring focus-visible:ring-[3px]",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-white",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps extends ComponentPropsWithoutRef<"span"> {
  variant?: "default" | "secondary" | "destructive" | "outline";
  asChild?: boolean;
}

export function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: BadgeProps) {
  const Comp: React.ElementType = asChild ? Slot : "span";
  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...(props as any)}
    />
  );
}

export { badgeVariants };
