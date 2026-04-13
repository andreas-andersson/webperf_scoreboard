/**
 * Returns the CSS class for the background and hover colors based on the score.
 * @param score The score to determine the color for.
 * @returns A string with the CSS classes for the background and hover colors.
 */
export function getScoreTextColor(score: number): string {
  if (score >= 4.0) return "text-[#a6e3a1]";
  if (score >= 2.5) return "text-[#fab387]";
  return "text-[#f38ba8]";
}

export function getScoreColor(score: number | null) {
  if (score === null) return "bg-[#6c7086] hover:bg-[#585b70]"; // Overlay
  if (score >= 4.0) return "bg-[#a6e3a1] hover:bg-[#94e2d5] text-[#1e1e2e]"; // Green -> Teal hover
  if (score >= 2.5) return "bg-[#fab387] hover:bg-[#f9e2af] text-[#1e1e2e]"; // Peach -> Yellow hover
  return "bg-[#f38ba8] hover:bg-[#eba0ac] text-[#1e1e2e]"; // Red -> Maroonish hover
}