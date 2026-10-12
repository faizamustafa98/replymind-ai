const COLORS = ["6366f1", "ec4899", "10b981", "f59e0b", "3b82f6", "8b5cf6", "ef4444", "14b8a6"];

export function initialsAvatar(name?: string | null) {
  const label = (name ?? "").trim();
  const initial = (label[0] ?? "?").toUpperCase();

  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = label.charCodeAt(i) + ((hash << 5) - hash);
  const color = COLORS[Math.abs(hash) % COLORS.length];

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><rect width='96' height='96' rx='48' fill='#${color}'/><text x='50%' y='50%' dy='.35em' text-anchor='middle' font-family='sans-serif' font-size='40' fill='white'>${initial}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
