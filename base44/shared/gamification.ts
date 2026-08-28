// Level system — explorer progression
export const LEVELS = [
  { level: 1, name: "Observer", minXp: 0 },
  { level: 2, name: "Explorer", minXp: 100 },
  { level: 3, name: "Investigator", minXp: 300 },
  { level: 4, name: "Pathfinder", minXp: 700 },
  { level: 5, name: "Discoverer", minXp: 1400 },
  { level: 6, name: "Field Expert", minXp: 2500 },
  { level: 7, name: "Visionary", minXp: 4500 },
];

export function calculateLevel(totalXp) {
  let current = LEVELS[0];
  for (const l of LEVELS) {
    if (totalXp >= l.minXp) current = l;
  }
  return current;
}

export function calculateXp(analysis, isNewCategory, isFirstDiscovery) {
  let xp = 10;
  if (analysis.confidence >= 80) xp += 5;
  if (analysis.rarity === "interesting") xp += 10;
  else if (analysis.rarity === "unusual") xp += 20;
  else if (analysis.rarity === "exceptional") xp += 30;
  if (isNewCategory) xp += 25;
  if (isFirstDiscovery) xp += 40;
  return xp;
}

export function updateStreak(lastScanDate, currentStreak) {
  const today = new Date().toISOString().split('T')[0];
  if (!lastScanDate) return 1;
  const last = lastScanDate.split('T')[0];
  if (last === today) return currentStreak || 1;
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (last === yesterday) return (currentStreak || 0) + 1;
  return 1;
}

export const ACHIEVEMENT_DEFS = [
  { code: "first_sight", title: "First Sight", description: "Capture your first discovery", icon: "Eye", category: "discovery", threshold: 1, xp_reward: 50 },
  { code: "tech_spotter", title: "Tech Spotter", description: "Discover 10 electronic objects", icon: "Cpu", category: "category", threshold: 10, xp_reward: 100 },
  { code: "road_watcher", title: "Road Watcher", description: "Discover 10 vehicles", icon: "Car", category: "category", threshold: 10, xp_reward: 100 },
  { code: "music_hunter", title: "Music Hunter", description: "Discover 10 musical instruments", icon: "Music", category: "category", threshold: 10, xp_reward: 100 },
  { code: "world_explorer", title: "World Explorer", description: "Discover objects from 10 categories", icon: "Globe", category: "discovery", threshold: 10, xp_reward: 150 },
  { code: "century_find", title: "Century Find", description: "Discover an object potentially 50+ years old", icon: "Clock", category: "special", threshold: 1, xp_reward: 200 },
  { code: "week_explorer", title: "7 Day Explorer", description: "Maintain a 7-day discovery streak", icon: "Flame", category: "streak", threshold: 7, xp_reward: 150 },
];

export function checkAchievements(context) {
  const { totalDiscoveries, categoryCounts, uniqueCategoryCount, currentStreak, hasOldDiscovery, alreadyEarned } = context;
  const newlyEarned = [];
  for (const ach of ACHIEVEMENT_DEFS) {
    if (alreadyEarned.includes(ach.code)) continue;
    let earned = false;
    switch (ach.code) {
      case "first_sight": earned = totalDiscoveries >= 1; break;
      case "tech_spotter": earned = (categoryCounts["electronics"] || 0) >= 10; break;
      case "road_watcher": earned = (categoryCounts["vehicle"] || 0) >= 10; break;
      case "music_hunter": earned = (categoryCounts["musical instrument"] || 0) >= 10; break;
      case "world_explorer": earned = uniqueCategoryCount >= 10; break;
      case "century_find": earned = hasOldDiscovery; break;
      case "week_explorer": earned = currentStreak >= 7; break;
    }
    if (earned) newlyEarned.push(ach);
  }
  return newlyEarned;
}

export function matchChallenges(discovery, challenges) {
  const matched = [];
  for (const ch of challenges) {
    if (!ch.active) continue;
    let isMatch = false;
    switch (ch.match_type) {
      case "category_match":
        if (discovery.category && discovery.category.toLowerCase().includes((ch.match_value || "").toLowerCase())) isMatch = true;
        break;
      case "attribute_match":
        try {
          const chars = JSON.parse(discovery.characteristics || "[]");
          const mats = JSON.parse(discovery.materials || "[]");
          const allAttrs = [...chars, ...mats].map(a => String(a).toLowerCase());
          if (allAttrs.some(a => a.includes((ch.match_value || "").toLowerCase()))) isMatch = true;
        } catch {}
        break;
      case "era_old":
        if (discovery.estimated_era && /old|vintage|antique|century|1950|1940|1930|1920|1800/i.test(discovery.estimated_era)) isMatch = true;
        break;
    }
    if (isMatch) matched.push(ch);
  }
  return matched;
}