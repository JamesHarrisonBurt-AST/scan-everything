import Foundation

public enum QuestCadence: String, Equatable, Sendable {
    case daily
    case weekly
}

public enum QuestMatch: Equatable, Sendable {
    case categoryContains(String)
    case attributeContains(String)
    case eraOld
    case hasBarcode
    case hasText
    case anyDiscovery
    case distinctCategories
}

public struct QuestDefinition: Equatable, Sendable, Identifiable {
    public var id: String { code }
    public let code: String
    public let title: String
    public let detail: String
    public let match: QuestMatch
    public let targetCount: Int
    public let xpReward: Int
    public let cadence: QuestCadence

    public init(code: String, title: String, detail: String, match: QuestMatch, targetCount: Int, xpReward: Int, cadence: QuestCadence) {
        self.code = code
        self.title = title
        self.detail = detail
        self.match = match
        self.targetCount = targetCount
        self.xpReward = xpReward
        self.cadence = cadence
    }
}

public struct QuestSubject: Equatable, Sendable {
    public var category: String
    public var materials: [String]
    public var characteristics: [String]
    public var estimatedEra: String
    public var hasBarcode: Bool
    public var hasText: Bool

    public init(category: String, materials: [String], characteristics: [String], estimatedEra: String, hasBarcode: Bool, hasText: Bool) {
        self.category = category
        self.materials = materials
        self.characteristics = characteristics
        self.estimatedEra = estimatedEra
        self.hasBarcode = hasBarcode
        self.hasText = hasText
    }
}

public enum QuestCatalog {
    public static let daily: [QuestDefinition] = [
        QuestDefinition(code: "plant", title: "Green Thumb", detail: "Identify a plant.", match: .categoryContains("plant"), targetCount: 1, xpReward: 40, cadence: .daily),
        QuestDefinition(code: "electronics", title: "Circuit Spotter", detail: "Identify something electronic.", match: .categoryContains("electronics"), targetCount: 1, xpReward: 40, cadence: .daily),
        QuestDefinition(code: "vehicle", title: "Roadside", detail: "Identify a vehicle.", match: .categoryContains("vehicle"), targetCount: 1, xpReward: 40, cadence: .daily),
        QuestDefinition(code: "tool", title: "Workbench", detail: "Identify a tool.", match: .categoryContains("tool"), targetCount: 1, xpReward: 40, cadence: .daily),
        QuestDefinition(code: "food", title: "Kitchen Find", detail: "Identify something edible.", match: .categoryContains("food"), targetCount: 1, xpReward: 40, cadence: .daily),
        QuestDefinition(code: "book", title: "Shelf Check", detail: "Identify a book.", match: .categoryContains("book"), targetCount: 1, xpReward: 40, cadence: .daily),
        QuestDefinition(code: "outdoor", title: "Outside", detail: "Identify something outdoors.", match: .categoryContains("outdoor"), targetCount: 1, xpReward: 40, cadence: .daily),
        QuestDefinition(code: "household", title: "Around the House", detail: "Identify a household object.", match: .categoryContains("household"), targetCount: 1, xpReward: 35, cadence: .daily),
        QuestDefinition(code: "vintage", title: "Older Than It Looks", detail: "Find something that may be vintage or antique.", match: .eraOld, targetCount: 1, xpReward: 60, cadence: .daily),
        QuestDefinition(code: "metal", title: "Made of Metal", detail: "Find an object with metal in its materials.", match: .attributeContains("metal"), targetCount: 1, xpReward: 35, cadence: .daily),
        QuestDefinition(code: "label", title: "Read the Label", detail: "Capture a find with readable text.", match: .hasText, targetCount: 1, xpReward: 30, cadence: .daily),
        QuestDefinition(code: "barcode", title: "Scan a Code", detail: "Read a barcode on device.", match: .hasBarcode, targetCount: 1, xpReward: 30, cadence: .daily),
        QuestDefinition(code: "two", title: "Double Take", detail: "Save two discoveries today.", match: .anyDiscovery, targetCount: 2, xpReward: 45, cadence: .daily)
    ]

    public static let weekly: [QuestDefinition] = [
        QuestDefinition(code: "week-five", title: "Field Week", detail: "Save 5 discoveries this week.", match: .anyDiscovery, targetCount: 5, xpReward: 120, cadence: .weekly),
        QuestDefinition(code: "week-categories", title: "Category Tour", detail: "Discover 3 different categories this week.", match: .distinctCategories, targetCount: 3, xpReward: 100, cadence: .weekly),
        QuestDefinition(code: "week-text", title: "Archivist", detail: "Capture 3 finds with readable text this week.", match: .hasText, targetCount: 3, xpReward: 90, cadence: .weekly)
    ]

    public static func matches(_ quest: QuestDefinition, subject: QuestSubject) -> Bool {
        switch quest.match {
        case .categoryContains(let needle):
            return subject.category.lowercased().contains(needle.lowercased())
        case .attributeContains(let needle):
            let haystack = (subject.materials + subject.characteristics).map { $0.lowercased() }
            return haystack.contains { $0.contains(needle.lowercased()) }
        case .eraOld:
            return Gamification.looksOld(subject.estimatedEra)
        case .hasBarcode:
            return subject.hasBarcode
        case .hasText:
            return subject.hasText
        case .anyDiscovery:
            return true
        case .distinctCategories:
            return true
        }
    }
}

public enum QuestSchedule {
    public static func active(on date: Date, calendar: Calendar = .current) -> [QuestDefinition] {
        var dailyRNG = SplitMix64(seed: stableHash(dayKey(date, calendar: calendar)))
        let daily = pick(3, from: QuestCatalog.daily, using: &dailyRNG)
        let weeklyIndex = Int(stableHash(weekKey(date, calendar: calendar)) % UInt64(QuestCatalog.weekly.count))
        return daily + [QuestCatalog.weekly[weeklyIndex]]
    }

    public static func periodKey(for quest: QuestDefinition, on date: Date, calendar: Calendar = .current) -> String {
        switch quest.cadence {
        case .daily:
            return "d:" + dayKey(date, calendar: calendar) + ":" + quest.code
        case .weekly:
            return "w:" + weekKey(date, calendar: calendar) + ":" + quest.code
        }
    }

    public static func dayKey(_ date: Date, calendar: Calendar = .current) -> String {
        let parts = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", parts.year ?? 0, parts.month ?? 0, parts.day ?? 0)
    }

    public static func weekKey(_ date: Date, calendar: Calendar = .current) -> String {
        let parts = calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: date)
        return String(format: "%04d-W%02d", parts.yearForWeekOfYear ?? 0, parts.weekOfYear ?? 0)
    }

    static func stableHash(_ string: String) -> UInt64 {
        var hash: UInt64 = 14695981039346656037
        for byte in string.utf8 {
            hash ^= UInt64(byte)
            hash &*= 1099511628211
        }
        return hash
    }

    static func pick(_ count: Int, from pool: [QuestDefinition], using rng: inout SplitMix64) -> [QuestDefinition] {
        var remaining = pool
        var chosen: [QuestDefinition] = []
        while chosen.count < count && !remaining.isEmpty {
            let index = Int(rng.next() % UInt64(remaining.count))
            chosen.append(remaining.remove(at: index))
        }
        return chosen
    }
}

struct SplitMix64: RandomNumberGenerator {
    var state: UInt64

    init(seed: UInt64) {
        state = seed
    }

    mutating func next() -> UInt64 {
        state &+= 0x9E3779B97F4A7C15
        var z = state
        z = (z ^ (z >> 30)) &* 0xBF58476D1CE4E5B9
        z = (z ^ (z >> 27)) &* 0x94D049BB133111EB
        return z ^ (z >> 31)
    }
}
