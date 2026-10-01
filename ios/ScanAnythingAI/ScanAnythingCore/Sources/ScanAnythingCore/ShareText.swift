import Foundation

public struct ShareDraft: Equatable, Sendable {
    public var title: String
    public var category: String
    public var summary: String
    public var details: String
    public var confidence: Int
    public var rarity: String
    public var facts: [String]
    public var barcode: String
    public var recognizedText: String
    public var location: String

    public init(
        title: String,
        category: String,
        summary: String,
        details: String,
        confidence: Int,
        rarity: String,
        facts: [String],
        barcode: String,
        recognizedText: String,
        location: String
    ) {
        self.title = title
        self.category = category
        self.summary = summary
        self.details = details
        self.confidence = confidence
        self.rarity = rarity
        self.facts = facts
        self.barcode = barcode
        self.recognizedText = recognizedText
        self.location = location
    }
}

public enum DiscoveryShareText {
    public static func plain(_ draft: ShareDraft) -> String {
        var lines: [String] = []
        lines.append(draft.title)
        lines.append("\(DiscoveryCategory.displayName(for: draft.category)) · \(draft.confidence)% · \(draft.rarity)")
        if !draft.summary.isEmpty { lines.append("") ; lines.append(draft.summary) }
        if !draft.details.isEmpty { lines.append("") ; lines.append(draft.details) }
        if !draft.facts.isEmpty {
            lines.append("")
            lines.append("Facts")
            draft.facts.forEach { lines.append("• \($0)") }
        }
        if !draft.barcode.isEmpty {
            lines.append("")
            lines.append("Barcode: \(draft.barcode)")
        }
        if !draft.recognizedText.isEmpty {
            lines.append("")
            lines.append("Text seen: \(draft.recognizedText)")
        }
        if !draft.location.isEmpty {
            lines.append("")
            lines.append("Found near \(draft.location)")
        }
        lines.append("")
        lines.append("Saved with Scan Anything AI")
        return lines.joined(separator: "\n")
    }
}
