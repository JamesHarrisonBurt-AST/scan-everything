// Frontend gamification constants — mirrors base44/shared/gamification.ts

export const LEVELS = [
  { level: 1, name: "Observer", minXp: 0 },
  { level: 2, name: "Explorer", minXp: 100 },
  { level: 3, name: "Investigator", minXp: 300 },
  { level: 4, name: "Pathfinder", minXp: 700 },
  { level: 5, name: "Discoverer", minXp: 1400 },
  { level: 6, name: "Field Expert", minXp: 2500 },
  { level: 7, name: "Visionary", minXp: 4500 },
];

export function getLevelInfo(totalXp) {
  let current = LEVELS[0];
  let next = LEVELS[1];
  for (let i = 0; i < LEVELS.length; i++) {
    if (totalXp >= LEVELS[i].minXp) {
      current = LEVELS[i];
      next = LEVELS[i + 1] || LEVELS[i];
    }
  }
  const progress = next === current ? 100 : ((totalXp - current.minXp) / (next.minXp - current.minXp)) * 100;
  return { current, next, progress, xpInLevel: totalXp - current.minXp, xpToNext: next.minXp - current.minXp };
}

export function getUserField(user, field) {
  return user?.data?.[field] ?? user?.[field] ?? null;
}

export const RARITY_STYLES = {
  common: { color: '#888', bg: 'hsl(220 12% 14%)', label: 'Common' },
  interesting: { color: '#2dd4bf', bg: 'hsl(175 65% 42% / 0.12)', label: 'Interesting' },
  unusual: { color: '#c084fc', bg: 'hsl(263 70% 58% / 0.12)', label: 'Unusual' },
  exceptional: { color: '#fbbf24', bg: 'hsl(35 95% 55% / 0.12)', label: 'Exceptional' },
};