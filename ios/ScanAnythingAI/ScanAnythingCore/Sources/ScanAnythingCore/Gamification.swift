import Foundation

public struct LevelInfo: Equatable, Sendable {
    public let level: Int
    public let name: String
    public let minXP: Int

    public init(level: Int, name: String, minXP: Int) {
        self.level = level
        self.name = name
        self.minXP = minXP
    }
}

public struct LevelProgress: Equatable, Sendable {
    public let current: LevelInfo
    public let next: LevelInfo
    public let progress: Double
    public let xpInLevel: Int
    public let xpToNext: Int
    public let isMaxLevel: Bool
}

public enum ExplorerLevels {
    public static let all: [LevelInfo] = [
        LevelInfo(level: 1, name: "Observer", minXP: 0),
        LevelInfo(level: 2, name: "Explorer", minXP: 100),
        LevelInfo(level: 3, name: "Investigator", minXP: 300),
        LevelInfo(level: 4, name: "Pathfinder", minXP: 700),
        LevelInfo(level: 5, name: "Discoverer", minXP: 1400),
        LevelInfo(level: 6, name: "Field Expert", minXP: 2500),
        LevelInfo(level: 7, name: "Visionary", minXP: 4500)
    ]

    public static func level(for totalXP: Int) -> LevelInfo {
        var current = all[0]
        for item in all where totalXP >= item.minXP {
            current = item
        }
        return current
    }

    public static func progress(for totalXP: Int) -> LevelProgress {
        let current = level(for: totalXP)
        let next = all.first { $0.level == current.level + 1 } ?? current
        let isMax = next.level == current.level
        let span = max(1, next.minXP - current.minXP)
        let gained = totalXP - current.minXP
        let fraction = isMax ? 1 : min(1, max(0, Double(gained) / Double(span)))
        return LevelProgress(
            current: current,
            next: next,
            progress: fraction,
            xpInLevel: gained,
            xpToNext: isMax ? gained : span,
            isMaxLevel: isMax
        )
    }
}

public struct XPInput: Equatable, Sendable {
    public var confidence: Int
    public var rarity: Rarity
    public var isNewCategory: Bool
    public var isFirstDiscovery: Bool

    public init(confidence: Int, rarity: Rarity, isNewCategory: Bool, isFirstDiscovery: Bool) {
        self.confidence = confidence
        self.rarity = rarity
        self.isNewCategory = isNewCategory
        self.isFirstDiscovery = isFirstDiscovery
    }
}

public enum Gamification {
    public static func xpEarned(_ input: XPInput) -> Int {
        var xp = 10
        if input.confidence >= 80 { xp += 5 }
        switch input.rarity {
        case .common: break
        case .interesting: xp += 10
        case .unusual: xp += 20
        case .exceptional: xp += 30
        }
        if input.isNewCategory { xp += 25 }
        if input.isFirstDiscovery { xp += 40 }
        return xp
    }

    /// Streaks follow the device calendar so a late-night scan still counts as today.
    public static func updatedStreak(lastScan: Date?, currentStreak: Int, now: Date, calendar: Calendar = .current) -> Int {
        guard let lastScan else { return 1 }
        if calendar.isDate(lastScan, inSameDayAs: now) {
            return max(currentStreak, 1)
        }
        if let yesterday = calendar.date(byAdding: .day, value: -1, to: calendar.startOfDay(for: now)),
           calendar.isDate(lastScan, inSameDayAs: yesterday) {
            return max(currentStreak, 0) + 1
        }
        return 1
    }

    public static func looksOld(_ estimatedEra: String) -> Bool {
        estimatedEra.range(of: #"old|vintage|antique|century|1950|1940|1930|1920|1800"#, options: .regularExpression) != nil
    }
}

public struct AchievementDefinition: Equatable, Sendable, Identifiable {
    public var id: String { code }
    public let code: String
    public let title: String
    public let detail: String
    public let symbol: String
    public let group: String
    public let threshold: Int
    public let xpReward: Int

    public init(code: String, title: String, detail: String, symbol: String, group: String, threshold: Int, xpReward: Int) {
        self.code = code
        self.title = title
        self.detail = detail
        self.symbol = symbol
        self.group = group
        self.threshold = threshold
        self.xpReward = xpReward
    }
}

public enum Achievements {
    public static let all: [AchievementDefinition] = [
        AchievementDefinition(code: "first_sight", title: "First Sight", detail: "Capture your first discovery", symbol: "eye", group: "discovery", threshold: 1, xpReward: 50),
        AchievementDefinition(code: "tech_spotter", title: "Tech Spotter", detail: "Discover 10 electronic objects", symbol: "cpu", group: "category", threshold: 10, xpReward: 100),
        AchievementDefinition(code: "road_watcher", title: "Road Watcher", detail: "Discover 10 vehicles", symbol: "car", group: "category", threshold: 10, xpReward: 100),
        AchievementDefinition(code: "music_hunter", title: "Music Hunter", detail: "Discover 10 musical instruments", symbol: "music.note", group: "category", threshold: 10, xpReward: 100),
        AchievementDefinition(code: "world_explorer", title: "World Explorer", detail: "Discover objects from 10 categories", symbol: "globe", group: "discovery", threshold: 10, xpReward: 150),
        AchievementDefinition(code: "century_find", title: "Century Find", detail: "Discover an object that may be 50+ years old", symbol: "clock", group: "special", threshold: 1, xpReward: 200),
        AchievementDefinition(code: "week_explorer", title: "7 Day Explorer", detail: "Maintain a 7-day discovery streak", symbol: "flame", group: "streak", threshold: 7, xpReward: 150),
        AchievementDefinition(code: "label_reader", title: "Label Reader", detail: "Capture a find with readable text", symbol: "text.viewfinder", group: "special", threshold: 1, xpReward: 40),
        AchievementDefinition(code: "code_breaker", title: "Code Breaker", detail: "Scan a barcode on device", symbol: "barcode.viewfinder", group: "special", threshold: 1, xpReward: 40),
        AchievementDefinition(code: "field_notes", title: "Field Notes", detail: "Save 25 discoveries", symbol: "book", group: "discovery", threshold: 25, xpReward: 120)
    ]

    public static func definition(for code: String) -> AchievementDefinition? {
        all.first { $0.code == code }
    }
}

public struct AchievementContext: Equatable, Sendable {
    public var totalDiscoveries: Int
    public var categoryCounts: [String: Int]
    public var uniqueCategoryCount: Int
    public var currentStreak: Int
    public var hasOldDiscovery: Bool
    public var hasTextDiscovery: Bool
    public var hasBarcodeDiscovery: Bool
    public var alreadyEarned: Set<String>

    public init(
        totalDiscoveries: Int,
        categoryCounts: [String: Int],
        uniqueCategoryCount: Int,
        currentStreak: Int,
        hasOldDiscovery: Bool,
        hasTextDiscovery: Bool,
        hasBarcodeDiscovery: Bool,
        alreadyEarned: Set<String>
    ) {
        self.totalDiscoveries = totalDiscoveries
        self.categoryCounts = categoryCounts
        self.uniqueCategoryCount = uniqueCategoryCount
        self.currentStreak = currentStreak
        self.hasOldDiscovery = hasOldDiscovery
        self.hasTextDiscovery = hasTextDiscovery
        self.hasBarcodeDiscovery = hasBarcodeDiscovery
        self.alreadyEarned = alreadyEarned
    }
}

public enum AchievementCheck {
    public static func newlyEarned(_ context: AchievementContext) -> [AchievementDefinition] {
        Achievements.all.filter { achievement in
            guard !context.alreadyEarned.contains(achievement.code) else { return false }
            switch achievement.code {
            case "first_sight":
                return context.totalDiscoveries >= 1
            case "tech_spotter":
                return (context.categoryCounts["electronics"] ?? 0) >= 10
            case "road_watcher":
                return (context.categoryCounts["vehicle"] ?? 0) >= 10
            case "music_hunter":
                return (context.categoryCounts["musical instrument"] ?? 0) >= 10
            case "world_explorer":
                return context.uniqueCategoryCount >= 10
            case "century_find":
                return context.hasOldDiscovery
            case "week_explorer":
                return context.currentStreak >= 7
            case "label_reader":
                return context.hasTextDiscovery
            case "code_breaker":
                return context.hasBarcodeDiscovery
            case "field_notes":
                return context.totalDiscoveries >= 25
            default:
                return false
            }
        }
    }
}
