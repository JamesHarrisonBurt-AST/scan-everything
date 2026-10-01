import SwiftUI
import WidgetKit

struct StreakEntry: TimelineEntry {
    var date: Date
    var snapshot: JournalSnapshot
}

struct StreakProvider: TimelineProvider {
    func placeholder(in context: Context) -> StreakEntry {
        StreakEntry(date: .now, snapshot: JournalSnapshot(
            displayName: "Explorer",
            xp: 120,
            streakDays: 3,
            level: 2,
            levelName: "Explorer",
            updatedAt: .now
        ))
    }

    func getSnapshot(in context: Context, completion: @escaping (StreakEntry) -> Void) {
        completion(StreakEntry(date: .now, snapshot: JournalSnapshotStore.load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<StreakEntry>) -> Void) {
        let entry = StreakEntry(date: .now, snapshot: JournalSnapshotStore.load())
        let next = Calendar.current.date(byAdding: .minute, value: 30, to: .now) ?? .now.addingTimeInterval(1800)
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

struct StreakWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "ai.scananything.app.streak", provider: StreakProvider()) { entry in
            StreakWidgetView(snapshot: entry.snapshot)
                .containerBackground(for: .widget) {
                    LinearGradient(
                        colors: [
                            Color(red: 0.09, green: 0.07, blue: 0.05),
                            Color(red: 0.16, green: 0.09, blue: 0.03)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                }
        }
        .configurationDisplayName("Streak")
        .description("Your exploration streak, level, and a way back to the camera.")
        .supportedFamilies([
            .systemSmall,
            .systemMedium,
            .accessoryCircular,
            .accessoryRectangular,
            .accessoryInline
        ])
    }
}

private struct StreakWidgetView: View {
    @Environment(\.widgetFamily) private var family
    var snapshot: JournalSnapshot

    private var scanURL: URL { URL(string: "scananything://scan")! }

    var body: some View {
        Group {
            switch family {
            case .accessoryInline:
                Text("\(snapshot.streakDays) day streak · Lv \(snapshot.level)")
            case .accessoryCircular:
                VStack(spacing: 0) {
                    Image(systemName: "flame.fill")
                    Text("\(snapshot.streakDays)")
                        .font(.headline.weight(.bold))
                }
            case .accessoryRectangular:
                VStack(alignment: .leading, spacing: 2) {
                    Text("\(snapshot.streakDays) day streak")
                        .font(.headline.weight(.bold))
                    Text("Level \(snapshot.level) · \(snapshot.levelName)")
                        .font(.caption)
                    Text("\(snapshot.xp) XP")
                        .font(.caption2)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            default:
                home
            }
        }
        .widgetURL(scanURL)
        .accessibilityLabel("\(snapshot.streakDays) day streak. Level \(snapshot.level), \(snapshot.levelName). \(snapshot.xp) experience points. Opens the scanner.")
    }

    private var home: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                Image(systemName: "flame.fill")
                    .foregroundStyle(Color(red: 0.98, green: 0.75, blue: 0.38))
                Text(snapshot.streakDays == 1 ? "1 day streak" : "\(snapshot.streakDays) day streak")
                    .font(.headline.weight(.bold))
                    .foregroundStyle(.white)
            }
            Text(snapshot.displayName)
                .font(.caption)
                .foregroundStyle(.white.opacity(0.7))
            Spacer(minLength: 0)
            Text("Level \(snapshot.level)")
                .font(.system(.title2, design: .serif, weight: .bold))
                .foregroundStyle(.white)
            Text("\(snapshot.levelName) · \(snapshot.xp) XP")
                .font(.caption.weight(.semibold))
                .foregroundStyle(Color(red: 0.98, green: 0.75, blue: 0.38))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}
