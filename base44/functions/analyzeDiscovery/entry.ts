import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import OpenAI from 'npm:openai@4.77.0';
import { secrets } from 'base44:runtime';
import { calculateXp, calculateLevel, updateStreak, checkAchievements, matchChallenges } from '../../shared/gamification.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { image_url, location_lat, location_lng } = body;
    if (!image_url) return Response.json({ error: 'Image URL required' }, { status: 400 });

    // 1. AI Vision Analysis
    const openai = new OpenAI({ apiKey: secrets.get("OPENAI_API_KEY") });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are an expert object identification AI for a discovery app. Analyze the image and identify the object.

Return ONLY a JSON object with these exact fields:
{
  "name": "object name (use confidence-aware language like 'Likely Fender-style guitar' if unsure)",
  "category": "one of: electronics, vehicle, plant, clothing, shoes, musical instrument, collectible, toy, furniture, tool, household, book, artwork, appliance, food, landmark, outdoor, other",
  "subcategory": "more specific type",
  "summary": "one sentence summary",
  "description": "2-3 sentence description of what it is",
  "possibleBrand": "likely brand or empty string",
  "possibleModel": "likely model or empty string",
  "confidence": 0-100,
  "materials": ["list of materials"],
  "characteristics": ["list of notable characteristics"],
  "estimatedEra": "estimated decade/period or 'modern'",
  "interestingFacts": ["2-3 interesting facts"],
  "safetyNotes": ["any safety notes or empty array"],
  "maintenanceTips": ["care/maintenance tips or empty array"],
  "searchTerms": ["search terms"],
  "followUpSuggestions": ["3-4 suggested follow-up questions"],
  "rarity": "one of: common, interesting, unusual, exceptional"
}

Set rarity based on how unusual the find is. Return only valid JSON.`
            },
            { type: "image_url", image_url: { url: image_url } }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500
    });

    const analysis = JSON.parse(response.choices[0].message.content);

    // 2. Calculate gamification
    const totalDiscoveries = (user.data?.total_discoveries || 0) + 1;
    const uniqueCategories = JSON.parse(user.data?.unique_categories || "[]");
    const isNewCategory = !uniqueCategories.includes(analysis.category);
    if (isNewCategory) uniqueCategories.push(analysis.category);
    const isFirstDiscovery = totalDiscoveries === 1;
    const xp = calculateXp(analysis, isNewCategory, isFirstDiscovery);

    // 3. Create Discovery record
    const discovery = await base44.entities.Discovery.create({
      title: analysis.name || 'Unknown Object',
      category: analysis.category || 'other',
      subcategory: analysis.subcategory || '',
      summary: analysis.summary || '',
      description: analysis.description || '',
      possible_brand: analysis.possibleBrand || '',
      possible_model: analysis.possibleModel || '',
      confidence_score: analysis.confidence || 50,
      image_url,
      materials: JSON.stringify(analysis.materials || []),
      characteristics: JSON.stringify(analysis.characteristics || []),
      estimated_era: analysis.estimatedEra || 'modern',
      interesting_facts: JSON.stringify(analysis.interestingFacts || []),
      safety_notes: JSON.stringify(analysis.safetyNotes || []),
      maintenance_tips: JSON.stringify(analysis.maintenanceTips || []),
      search_terms: JSON.stringify(analysis.searchTerms || []),
      follow_up_suggestions: JSON.stringify(analysis.followUpSuggestions || []),
      rarity: analysis.rarity || 'common',
      xp_earned: xp,
      favorited: false,
      location_lat,
      location_lng
    });

    // 4. Update user progression
    const newTotalXp = (user.data?.xp || 0) + xp;
    const newLevel = calculateLevel(newTotalXp);
    const oldLevel = calculateLevel(user.data?.xp || 0);
    const newStreak = updateStreak(user.data?.last_scan_date, user.data?.streak_days || 0);
    const now = new Date().toISOString();

    await base44.auth.updateMe({
      xp: newTotalXp,
      level: newLevel.level,
      streak_days: newStreak,
      last_scan_date: now,
      total_discoveries: totalDiscoveries,
      unique_categories: JSON.stringify(uniqueCategories)
    });

    // 5. Check achievements
    const existingDiscoveries = await base44.entities.Discovery.list('-created_date', 200);
    const categoryCounts = {};
    existingDiscoveries.forEach(d => {
      categoryCounts[d.category] = (categoryCounts[d.category] || 0) + 1;
    });
    categoryCounts[analysis.category] = (categoryCounts[analysis.category] || 0) + 1;

    const hasOldDiscovery = /old|vintage|antique|century|1950|1940|1930|1920|1800/i.test(analysis.estimatedEra || '');

    const existingAchievements = await base44.entities.UserAchievement.list();
    const alreadyEarned = existingAchievements.map(a => a.achievement_code);
    const newlyEarned = checkAchievements({
      totalDiscoveries,
      categoryCounts,
      uniqueCategoryCount: uniqueCategories.length,
      currentStreak: newStreak,
      hasOldDiscovery,
      alreadyEarned
    });

    for (const ach of newlyEarned) {
      await base44.entities.UserAchievement.create({
        achievement_code: ach.code,
        earned_date: now
      });
    }

    // 6. Check challenges
    const activeChallenges = await base44.entities.Challenge.filter({ active: true });
    const matchedChallenges = matchChallenges(discovery, activeChallenges);
    const challengeUpdates = [];

    for (const ch of matchedChallenges) {
      const progress = await base44.entities.ChallengeProgress.filter({ challenge_id: ch.id });
      if (progress.length > 0 && !progress[0].completed) {
        const newCount = progress[0].progress_count + 1;
        const completed = newCount >= ch.target_count;
        await base44.entities.ChallengeProgress.update(progress[0].id, {
          progress_count: newCount,
          completed,
          completed_date: completed ? now : undefined
        });
        challengeUpdates.push({ challenge_id: ch.id, title: ch.title, completed, progress: newCount, target: ch.target_count });
      } else if (progress.length === 0) {
        const completed = 1 >= ch.target_count;
        await base44.entities.ChallengeProgress.create({
          challenge_id: ch.id,
          progress_count: 1,
          completed,
          completed_date: completed ? now : undefined
        });
        challengeUpdates.push({ challenge_id: ch.id, title: ch.title, completed, progress: 1, target: ch.target_count });
      }
    }

    // 7. Return
    return Response.json({
      discovery,
      analysis,
      xp_earned: xp,
      new_total_xp: newTotalXp,
      level: newLevel,
      leveled_up: newLevel.level > oldLevel.level,
      new_streak: newStreak,
      new_achievements: newlyEarned,
      challenge_updates: challengeUpdates,
      is_new_category: isNewCategory
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}