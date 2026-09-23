import { clsx, type ClassValue } from "clsx";

/** Tiny classname combinator so components can merge conditional Tailwind classes cleanly. */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
