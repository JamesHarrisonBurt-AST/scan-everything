import Foundation

public enum Rarity: String, Codable, CaseIterable, Sendable, Equatable {
    case common
    case interesting
    case unusual
    case exceptional

    public var title: String {
        switch self {
        case .common: return "Common"
        case .interesting: return "Interesting"
        case .unusual: return "Unusual"
        case .exceptional: return "Exceptional"
        }
    }

    public static func parse(_ raw: String) -> Rarity {
        let value = raw.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        return Rarity(rawValue: value) ?? .common
    }
}

public enum DiscoveryCategory {
    public static let canonical = [
        "electronics", "vehicle", "plant", "clothing", "shoes",
        "musical instrument", "collectible", "toy", "furniture",
        "tool", "household", "book", "artwork", "appliance",
        "food", "landmark", "outdoor", "document", "other"
    ]

    public static func normalize(_ raw: String) -> String {
        let lowered = raw.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if lowered.isEmpty { return "other" }
        if canonical.contains(lowered) { return lowered }
        if let match = canonical.first(where: { lowered.contains($0) || $0.contains(lowered) }) {
            return match
        }
        return lowered
    }

    public static func displayName(for category: String) -> String {
        category.split(separator: " ").map { part in
            part.prefix(1).uppercased() + part.dropFirst()
        }.joined(separator: " ")
    }
}
