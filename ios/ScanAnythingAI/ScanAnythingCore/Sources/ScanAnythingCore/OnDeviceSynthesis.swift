import Foundation

public enum OnDeviceSynthesis {
    /// Builds a useful journal entry from Apple Vision output when a cloud model is unavailable.
    public static func analysis(from hints: VisionHints) -> DiscoveryAnalysis {
        if let payload = hints.barcodePayload, !payload.isEmpty {
            let symbology = hints.barcodeSymbology ?? "barcode"
            let title = "Barcode \(payload)"
            let text = hints.recognizedText
            return DiscoveryAnalysis(
                name: title,
                category: "other",
                subcategory: symbology,
                summary: "A \(symbology) code read on device.",
                details: text.isEmpty
                    ? "The camera read a \(symbology) symbol. Add an AI key in Profile for a full identification of the object it belongs to."
                    : "The camera read a \(symbology) symbol. Nearby text: \(text)",
                confidence: 78,
                characteristics: ["machine-readable code"],
                searchTerms: [payload, symbology],
                followUpSuggestions: [
                    "What product might this code refer to?",
                    "How do I look this barcode up?",
                    "What should I record with this find?"
                ],
                rarity: .common
            )
        }

        let lines = hints.textLines.map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }
        if let headline = lines.first {
            let body = lines.joined(separator: " ")
            return DiscoveryAnalysis(
                name: String(headline.prefix(80)),
                category: "document",
                subcategory: "printed text",
                summary: "Text read on device from the camera.",
                details: "Apple Vision read this without a cloud model: \(body)",
                confidence: min(70, 40 + lines.count * 8),
                characteristics: ["printed text"],
                searchTerms: Array(lines.prefix(5)),
                followUpSuggestions: [
                    "Summarize this text",
                    "What kind of object is this printed on?",
                    "Is there anything I should be careful about?"
                ],
                rarity: .common
            )
        }

        return DiscoveryAnalysis(
            name: "Unidentified object",
            category: "other",
            subcategory: "",
            summary: "Captured, but not identified yet.",
            details: "No text or barcode was readable, and an AI model is not configured. Add an API key in Profile, then scan again for a full identification.",
            confidence: 12,
            followUpSuggestions: [
                "What should I photograph to get a better read?"
            ],
            rarity: .common
        )
    }
}
