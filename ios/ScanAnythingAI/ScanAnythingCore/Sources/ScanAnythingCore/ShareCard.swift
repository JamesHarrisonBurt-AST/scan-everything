import Foundation

/// Short copy laid onto a share card. The written journal entry still travels
/// separately, so the card stays readable at a glance.
public struct ShareCardCopy: Equatable, Sendable {
    public var category: String
    public var title: String
    public var rarity: String
    public var confidence: String
    public var blurb: String
    public var fact: String
    public var place: String
    public var footer: String

    public init(
        category: String,
        title: String,
        rarity: String,
        confidence: String,
        blurb: String,
        fact: String,
        place: String,
        footer: String
    ) {
        self.category = category
        self.title = title
        self.rarity = rarity
        self.confidence = confidence
        self.blurb = blurb
        self.fact = fact
        self.place = place
        self.footer = footer
    }
}

public enum ShareCardComposer {
    static let titleLimit = 48
    static let blurbLimit = 120
    static let factLimit = 90
    static let placeLimit = 36
    public static let footer = "Scan Anything AI"

    public static func compose(_ draft: ShareDraft) -> ShareCardCopy {
        let title = clipped(draft.title, limit: titleLimit)
        let summary = clipped(draft.summary, limit: blurbLimit)
        let details = clipped(draft.details, limit: blurbLimit)
        let seen = clipped(draft.recognizedText, limit: blurbLimit)
        let location = collapse(draft.location)
        let barcode = collapse(draft.barcode)

        let blurb: String
        let usedLocationAsBlurb: Bool
        if !summary.isEmpty {
            blurb = summary
            usedLocationAsBlurb = false
        } else if !details.isEmpty {
            blurb = details
            usedLocationAsBlurb = false
        } else if !seen.isEmpty {
            blurb = seen
            usedLocationAsBlurb = false
        } else if !location.isEmpty {
            blurb = clipped("Found near \(location)", limit: blurbLimit)
            usedLocationAsBlurb = true
        } else if !barcode.isEmpty {
            blurb = clipped("Barcode \(barcode)", limit: blurbLimit)
            usedLocationAsBlurb = false
        } else {
            blurb = ""
            usedLocationAsBlurb = false
        }

        let place = usedLocationAsBlurb || location.isEmpty ? "" : clipped(location, limit: placeLimit)

        let fact = draft.facts
            .map { clipped($0, limit: factLimit) }
            .first { candidate in
                !candidate.isEmpty && !sameText(candidate, blurb)
            } ?? ""

        return ShareCardCopy(
            category: DiscoveryCategory.displayName(for: draft.category),
            title: title.isEmpty ? "Untitled find" : title,
            rarity: displayRarity(draft.rarity),
            confidence: "\(min(100, max(0, draft.confidence)))%",
            blurb: blurb,
            fact: fact,
            place: place,
            footer: footer
        )
    }

    public static func accessibilityLabel(_ copy: ShareCardCopy) -> String {
        var parts = [copy.title, copy.category, copy.rarity, "\(copy.confidence) confidence"]
        if !copy.blurb.isEmpty { parts.append(copy.blurb) }
        if !copy.fact.isEmpty { parts.append(copy.fact) }
        if !copy.place.isEmpty { parts.append("Found near \(copy.place)") }
        parts.append(copy.footer)
        return parts.joined(separator: ". ")
    }

    static func clipped(_ text: String, limit: Int) -> String {
        let trimmed = collapse(text)
        guard !trimmed.isEmpty else { return "" }
        guard limit > 1, trimmed.count > limit else { return trimmed }
        let budget = limit - 1
        let end = trimmed.index(trimmed.startIndex, offsetBy: budget)
        var slice = trimmed[..<end]
        if let space = slice.lastIndex(of: " ") {
            let kept = slice.distance(from: slice.startIndex, to: space)
            if kept >= budget / 2 {
                slice = slice[..<space]
            }
        }
        return slice.trimmingCharacters(in: .whitespacesAndNewlines) + "…"
    }

    private static func collapse(_ text: String) -> String {
        text.split(whereSeparator: \.isWhitespace).joined(separator: " ")
    }

    private static func sameText(_ lhs: String, _ rhs: String) -> Bool {
        lhs.caseInsensitiveCompare(rhs) == .orderedSame
    }

    private static func displayRarity(_ raw: String) -> String {
        let trimmed = collapse(raw)
        if trimmed.isEmpty { return Rarity.common.title }
        if let known = Rarity(rawValue: trimmed.lowercased()) {
            return known.title
        }
        return trimmed.prefix(1).uppercased() + trimmed.dropFirst()
    }
}
