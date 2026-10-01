import ScanAnythingCore
import SwiftData
import SwiftUI

struct QuestsView: View {
    @Query private var earned: [EarnedAchievement]
    @Query private var progressRows: [QuestProgress]

    private var active: [QuestDefinition] { QuestSchedule.active(on: Date()) }
    private var earnedCodes: Set<String> { Set(earned.map(\.code)) }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Quests")
                            .font(.system(size: 36, weight: .bold, design: .serif))
                            .foregroundStyle(Theme.ink)
                        Text("A fresh set each day, plus one for the week.")
                            .font(.subheadline)
                            .foregroundStyle(Theme.muted)
                    }
                    VStack(alignment: .leading, spacing: 10) {
                        Text("ACTIVE")
                            .font(.system(.caption, design: .rounded, weight: .bold))
                            .tracking(1.2)
                            .foregroundStyle(Theme.muted)
                        ForEach(active) { quest in
                            let key = QuestSchedule.periodKey(for: quest, on: Date())
                            let row = progressRows.first { $0.periodKey == key }
                            QuestRow(quest: quest, count: row?.progressCount ?? 0, completed: row?.completed ?? false)
                        }
                    }
                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            Text("BADGES")
                                .font(.system(.caption, design: .rounded, weight: .bold))
                                .tracking(1.2)
                                .foregroundStyle(Theme.muted)
                            Spacer()
                            Text("\(earned.count) of \(Achievements.all.count)")
                                .font(.caption)
                                .foregroundStyle(Theme.muted)
                        }
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                            ForEach(Achievements.all) { achievement in
                                badge(achievement)
                            }
                        }
                    }
                }
                .padding(20)
            }
            .journalCanvas()
        }
    }

    private func badge(_ achievement: AchievementDefinition) -> some View {
        let unlocked = earnedCodes.contains(achievement.code)
        return VStack(spacing: 8) {
            Image(systemName: unlocked ? achievement.symbol : "lock")
                .font(.system(size: 22, weight: .semibold))
                .foregroundStyle(unlocked ? Theme.amberText : Theme.muted.opacity(0.45))
                .frame(width: 52, height: 52)
                .background(unlocked ? Theme.amber.opacity(0.16) : Theme.field, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            Text(achievement.title)
                .font(.system(.caption2, design: .rounded, weight: .bold))
                .foregroundStyle(unlocked ? Theme.ink : Theme.muted)
                .multilineTextAlignment(.center)
                .lineLimit(2)
            Text(achievement.detail)
                .font(.system(size: 10))
                .foregroundStyle(Theme.muted)
                .multilineTextAlignment(.center)
                .lineLimit(3)
        }
        .padding(10)
        .frame(maxWidth: .infinity, minHeight: 150, alignment: .top)
        .glassPanel(radius: 18)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(achievement.title). \(achievement.detail). \(unlocked ? "Earned, \(achievement.xpReward) XP" : "Locked")")
    }
}
