import clsx from "clsx";
import { twMerge } from "tailwind-merge";

type ClassValue = string | number | boolean | null | undefined | { [key: string]: any } | ClassValue[];

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(...inputs));
}