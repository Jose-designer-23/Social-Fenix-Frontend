import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md transition-all disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
        outline: "border border-input bg-transparent hover:bg-accent",
        ghost: "bg-transparent hover:bg-accent",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-3 text-sm",
        sm: "h-8 px-2 text-sm",
        lg: "h-11 px-4 text-base",
        // nuevo tamaño 'icon' para botones que solo contienen un icono
        icon: "h-8 w-8 p-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps extends ComponentPropsWithoutRef<"button"> {
  variant?: "default" | "destructive" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp: React.ElementType = asChild ? Slot : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...(props as any)} />;
}

export { buttonVariants };