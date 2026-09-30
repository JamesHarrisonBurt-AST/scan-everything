import ScanAnythingCore
import SwiftData
import SwiftUI

struct ExploreView: View {
    var openScanner: () -> Void
    @Query(sort: \DiscoveryRecord.createdAt, order: .reverse) private var discoveries: [DiscoveryRecord]
    @Query private var profiles: [ExplorerProfile]
    @Query private var earned: [EarnedAchievement]
    @Query private var progressRows: [QuestProgress]

    private var profile: ExplorerProfile? { profiles.first }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    header
                    discoverButton
                    if let profile, profile.streakDays > 0 {
                        streak(profile.streakDays)
                    }
                    quests
                    recent
                    achievements
                    if let profile, profile.lifetimeDiscoveries > 0 {
                        stats(profile)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 12)
                .padding(.bottom, 24)
            }
            .background(Theme.canvas)
            .navigationDestination(for: UUID.self) { id in
                DiscoveryDetailView(discoveryID: id)
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(greeting.uppercased())
                .font(.system(.caption, design: .rounded, weight: .bold))
                .tracking(1.4)
                .foregroundStyle(Theme.muted)
            Text(profile.map { "Level \(ExplorerLevels.level(for: $0.xp).level)" } ?? "Welcome")
                .font(.system(size: 34, weight: .bold, design: .serif))
                .foregroundStyle(Theme.ink)
            Text(profile?.displayName ?? "Explorer")
                .font(.system(.title3, design: .serif))
                .foregroundStyle(Theme.amberText)
            if let profile, profile.xp > 0 {
                XPBar(xp: profile.xp)
                    .padding(.top, 8)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }

    private var discoverButton: some View {
        Button(action: openScanner) {
            VStack(spacing: 8) {
                Image(systemName: "viewfinder")
                    .font(.system(size: 36, weight: .light))
                Text("DISCOVER")
                    .font(.system(.title2, design: .rounded, weight: .heavy))
                Text("Point your camera at anything")
                    .font(.system(.subheadline, design: .rounded))
                    .opacity(0.85)
            }
            .foregroundStyle(Color(red: 0.1, green: 0.07, blue: 0.04))
            .frame(maxWidth: .infinity)
            .frame(minHeight: 168)
            .background(Theme.amberGradient, in: RoundedRectangle(cornerRadius: 28, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityHint("Opens the camera")
    }

    private func streak(_ days: Int) -> some View {
        HStack(spacing: 12) {
            Image(systemName: "flame.fill")
                .foregroundStyle(Theme.amberText)
                .frame(width: 42, height: 42)
                .background(Theme.amber.opacity(0.14), in: Circle())
            VStack(alignment: .leading, spacing: 2) {
                Text("\(days) day streak")
                    .font(.system(.headline, design: .rounded))
                    .foregroundStyle(Theme.ink)
                Text("Come back tomorrow to keep it.")
                    .font(.caption)
                    .foregroundStyle(Theme.muted)
            }
            Spacer()
        }
        .padding(14)
        .glassPanel(radius: 18)
        .accessibilityElement(children: .combine)
    }

    private var quests: some View {
        let active = QuestSchedule.active(on: Date())
        return VStack(alignment: .leading, spacing: 10) {
            Text("TODAY")
                .font(.system(.caption, design: .rounded, weight: .bold))
                .tracking(1.2)
                .foregroundStyle(Theme.muted)
            ForEach(active.prefix(2)) { quest in
                let key = QuestSchedule.periodKey(for: quest, on: Date())
                let row = progressRows.first { $0.periodKey == key }
                QuestRow(quest: quest, count: row?.progressCount ?? 0, completed: row?.completed ?? false)
            }
        }
    }

    private var recent: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("RECENT")
                .font(.system(.caption, design: .rounded, weight: .bold))
                .tracking(1.2)
                .foregroundStyle(Theme.muted)
            if discoveries.isEmpty {
                EmptyJournal(
                    symbol: "safari",
                    title: "Your world is waiting",
                    message: "The first thing you scan becomes the start of the journal.",
                    actionTitle: "Start exploring",
                    action: openScanner
                )
                .glassPanel()
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(discoveries.prefix(8)) { discovery in
                            NavigationLink(value: discovery.id) {
                                DiscoveryCard(discovery: discovery)
                                    .frame(width: 148)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
        }
    }

    private var achievements: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("ACHIEVEMENTS")
                    .font(.system(.caption, design: .rounded, weight: .bold))
                    .tracking(1.2)
                    .foregroundStyle(Theme.muted)
                Spacer()
                Text("\(earned.count)/\(Achievements.all.count)")
                    .font(.caption)
                    .foregroundStyle(Theme.muted)
            }
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(Achievements.all) { achievement in
                        let unlocked = earned.contains { $0.code == achievement.code }
                        VStack(spacing: 6) {
                            Image(systemName: unlocked ? achievement.symbol : "lock")
                                .font(.system(size: 18, weight: .semibold))
                                .foregroundStyle(unlocked ? Theme.amberText : Theme.muted.opacity(0.5))
                                .frame(width: 52, height: 52)
                                .background(unlocked ? Theme.amber.opacity(0.14) : Theme.field, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                            Text(achievement.title)
                                .font(.system(size: 11, weight: .semibold, design: .rounded))
                                .foregroundStyle(unlocked ? Theme.ink : Theme.muted)
                                .lineLimit(2)
                                .multilineTextAlignment(.center)
                                .frame(width: 72)
                        }
                        .accessibilityElement(children: .combine)
                        .accessibilityLabel("\(achievement.title), \(unlocked ? "earned" : "locked"). \(achievement.detail)")
                    }
                }
            }
        }
    }

    private func stats(_ profile: ExplorerProfile) -> some View {
        HStack(spacing: 10) {
            stat("\(discoveries.count)", "In journal")
            stat("\(earned.count)", "Badges")
            stat("\(profile.categoriesEverSeen.count)", "Categories")
        }
    }

    private func stat(_ value: String, _ label: String) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(.title2, design: .rounded, weight: .bold))
                .foregroundStyle(Theme.ink)
            Text(label)
                .font(.caption2)
                .foregroundStyle(Theme.muted)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .glassPanel(radius: 16)
        .accessibilityElement(children: .combine)
    }

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 5..<12: return "Good morning"
        case 12..<17: return "Good afternoon"
        case 17..<22: return "Good evening"
        default: return "Good night"
        }
    }
}

struct DiscoveryCard: View {
    let discovery: DiscoveryRecord

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ZStack(alignment: .bottomLeading) {
                DiscoveryThumbnail(filename: discovery.imageFilename)
                    .frame(height: 120)
                    .frame(maxWidth: .infinity)
                if discovery.rarity != .common {
                    RarityPill(rarity: discovery.rarity)
                        .padding(8)
                }
            }
            VStack(alignment: .leading, spacing: 4) {
                Text(discovery.title)
                    .font(.system(.subheadline, design: .serif, weight: .semibold))
                    .foregroundStyle(Theme.ink)
                    .lineLimit(2)
                HStack {
                    Text(DiscoveryCategory.displayName(for: discovery.category))
                        .lineLimit(1)
                    Spacer()
                    Text("\(discovery.confidence)%")
                        .foregroundStyle(Theme.amberText)
                }
                .font(.system(.caption2, design: .rounded, weight: .semibold))
                .foregroundStyle(Theme.muted)
            }
            .padding(10)
        }
        .glassPanel(radius: 18)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(discovery.title), \(DiscoveryCategory.displayName(for: discovery.category)), \(discovery.confidence) percent confidence")
        .accessibilityHint("Opens this discovery")
    }
}

struct QuestRow: View {
    let quest: QuestDefinition
    let count: Int
    let completed: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(quest.title)
                        .font(.system(.subheadline, design: .rounded, weight: .bold))
                        .foregroundStyle(Theme.ink)
                    Text(quest.detail)
                        .font(.caption)
                        .foregroundStyle(Theme.muted)
                }
                Spacer()
                if completed {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(Theme.teal)
                        .accessibilityLabel("Completed")
                } else {
                    Text("+\(quest.xpReward) XP")
                        .font(.system(.caption, design: .rounded, weight: .bold))
                        .foregroundStyle(Theme.amberText)
                }
            }
            ProgressView(value: Double(min(count, quest.targetCount)), total: Double(max(quest.targetCount, 1)))
                .tint(completed ? Theme.teal : Theme.amber)
            Text("\(min(count, quest.targetCount)) of \(quest.targetCount)")
                .font(.caption2)
                .foregroundStyle(Theme.muted)
        }
        .padding(14)
        .glassPanel(radius: 18)
        .accessibilityElement(children: .combine)
    }
}
