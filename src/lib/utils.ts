import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


/**
 * Converts a score text (e.g., "(3.33 av 5)") to a float value.
 */
export function scoreTextToFloat(scoreText: string): number {

  const scoreString = scoreText
    .trim()
    .replace('&nbsp;', ' ') // Remove any non-breaking space artifacts
    .replace(/[()]/g, '')
    .split('av')[0]
    .trim();

  return parseFloat(scoreString) || 0;
}