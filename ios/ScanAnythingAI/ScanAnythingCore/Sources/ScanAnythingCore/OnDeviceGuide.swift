import Foundation

public enum OnDeviceGuide {
    /// Instructions for an on-device language model. The photo never leaves the phone;
    /// the model only sees text and barcode notes the camera already read.
    public static let instructions = """
    You name objects for a private journal that stays on this iPhone. Reply with one JSON object and no markdown.
    Use these keys: name, category, subcategory, summary, details, confidence, characteristics, interestingFacts, followUpSuggestions, rarity.
    category must be one of: electronics, vehicle, plant, clothing, shoes, musical instrument, collectible, toy, furniture, tool, household, book, artwork, appliance, food, landmark, outdoor, document, other.
    rarity is common, interesting, unusual, or exceptional.
    confidence is an integer from 0 to 100. If the notes are thin, keep confidence under 55 and say what is uncertain in details.
    Do not invent a brand, a price, or a story the notes do not support.
    """

    public static func prompt(for hints: VisionHints) -> String {
        var lines = ["On-device camera notes:"]
        if let code = hints.barcodePayload, !code.isEmpty {
            let symbology = hints.barcodeSymbology ?? "barcode"
            lines.append("Barcode (\(symbology)): \(code)")
        }
        let text = hints.recognizedText.trimmingCharacters(in: .whitespacesAndNewlines)
        if !text.isEmpty {
            lines.append("Text:\n\(text)")
        }
        if lines.count == 1 {
            lines.append("No text or barcode was readable.")
        }
        lines.append("Write the JSON journal entry.")
        return lines.joined(separator: "\n")
    }
}

public struct OnDeviceGuess: Equatable, Sendable {
    public var category: String
    public var summary: String
    public var details: String
    public var confidence: Int
    public var characteristics: [String]

    public init(category: String, summary: String, details: String, confidence: Int, characteristics: [String]) {
        self.category = category
        self.summary = summary
        self.details = details
        self.confidence = confidence
        self.characteristics = characteristics
    }
}

public enum OnDeviceGuessing {
    /// A small keyword read of on-device text. Used when no cloud key and no on-device model is available.
    /// Returns nil when the words do not point at a category, so plain text stays a document.
    public static func classify(_ lines: [String]) -> OnDeviceGuess? {
        let cleaned = lines.map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }
        guard !cleaned.isEmpty else { return nil }
        let blob = cleaned.joined(separator: " ").lowercased()
        guard let match = table.first(where: { item in item.words.contains { blob.contains($0) } }) else {
            return nil
        }
        let body = cleaned.joined(separator: " ")
        return OnDeviceGuess(
            category: match.category,
            summary: match.summary,
            details: "Read on this iPhone from the camera, without sending the photo away. \(body)",
            confidence: min(68, 46 + cleaned.count * 6),
            characteristics: match.characteristics
        )
    }

    private struct Rule {
        var category: String
        var summary: String
        var characteristics: [String]
        var words: [String]
    }

    private static let table: [Rule] = [
        Rule(category: "plant", summary: "A plant, guessed from text on this iPhone.", characteristics: ["plant"], words: ["leaf", "leaves", "flower", "fern", "moss", "succulent", "monstera", "cactus", "petal", "foliage", "vine"]),
        Rule(category: "food", summary: "Packaged food, guessed from the label text.", characteristics: ["packaged food"], words: ["ingredients", "calories", "nutrition", "snack", "beverage", "allergen"]),
        Rule(category: "book", summary: "A book, guessed from the printed words.", characteristics: ["book"], words: ["isbn", "novel", "publisher", "chapter"]),
        Rule(category: "electronics", summary: "An electronic item, guessed from the label.", characteristics: ["electronics"], words: ["bluetooth", "usb-c", "usb c", "lithium", "battery"]),
        Rule(category: "tool", summary: "A tool, guessed from the printed words.", characteristics: ["tool"], words: ["wrench", "drill", "hammer", "screwdriver"])
    ]
}
