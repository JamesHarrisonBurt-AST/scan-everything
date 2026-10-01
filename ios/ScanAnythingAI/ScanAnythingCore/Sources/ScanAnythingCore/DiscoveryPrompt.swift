import Foundation

public enum DiscoveryPrompt {
    /// Mirrors the web app's server prompt so identifications stay comparable.
    public static let text = """
    You are an expert object identification AI for a discovery app. Analyze the image and identify the object.

    Return ONLY a JSON object with these exact fields:
    {
      "name": "object name (use confidence-aware language like 'Likely Fender-style guitar' if unsure)",
      "category": "one of: electronics, vehicle, plant, clothing, shoes, musical instrument, collectible, toy, furniture, tool, household, book, artwork, appliance, food, landmark, outdoor, document, other",
      "subcategory": "more specific type",
      "summary": "one sentence summary",
      "description": "2-3 sentence description of what it is",
      "possibleBrand": "likely brand or empty string",
      "possibleModel": "likely model or empty string",
      "confidence": 0-100,
      "materials": ["list of materials"],
      "characteristics": ["list of notable characteristics"],
      "estimatedEra": "estimated decade/period or 'modern'",
      "estimatedValue": "one of: Everyday Item, Notable Find, Collector's Piece, Rare Discovery",
      "interestingFacts": ["2-3 interesting facts"],
      "safetyNotes": ["any safety notes or empty array"],
      "maintenanceTips": ["care/maintenance tips or empty array"],
      "searchTerms": ["search terms"],
      "followUpSuggestions": ["3-4 suggested follow-up questions"],
      "rarity": "one of: common, interesting, unusual, exceptional"
    }

    Set rarity based on how unusual the find is. Set estimatedValue based on the object's collectibility, scarcity, and cultural significance — this is a qualitative assessment, NOT a monetary price. Return only valid JSON.
    """

    public static func text(including hints: VisionHints) -> String {
        guard hints.hasSignal else { return text }
        var extra = "\n\nOn-device observations from Apple Vision (may be partial or noisy):\n"
        if let payload = hints.barcodePayload, !payload.isEmpty {
            let symbology = hints.barcodeSymbology ?? "barcode"
            extra += "- Barcode (\(symbology)): \(payload)\n"
        }
        if !hints.textLines.isEmpty {
            let joined = hints.textLines.prefix(12).joined(separator: " | ")
            extra += "- Visible text: \(joined)\n"
        }
        extra += "Prefer the image. Use these observations when they agree with what you see.\n"
        return text + extra
    }

    public static func dialogueSystem(context: DialogueContext) -> String {
        """
        You are answering questions about a specific object the user discovered through their camera.

        OBJECT DETAILS:
        - Name: \(context.name)
        - Category: \(context.category)
        - Subcategory: \(context.subcategory.isEmpty ? "unknown" : context.subcategory)
        - Description: \(context.details.isEmpty ? "N/A" : context.details)
        - Possible brand: \(context.possibleBrand.isEmpty ? "unknown" : context.possibleBrand)
        - Possible model: \(context.possibleModel.isEmpty ? "unknown" : context.possibleModel)
        - Materials: \(context.materials.isEmpty ? "unknown" : context.materials.joined(separator: ", "))
        - Characteristics: \(context.characteristics.isEmpty ? "unknown" : context.characteristics.joined(separator: ", "))
        - Estimated era: \(context.estimatedEra.isEmpty ? "modern" : context.estimatedEra)
        - Interesting facts: \(context.interestingFacts.isEmpty ? "none" : context.interestingFacts.joined(separator: "; "))
        - Recognized text: \(context.recognizedText.isEmpty ? "none" : context.recognizedText)
        - Barcode: \(context.barcodePayload.isEmpty ? "none" : context.barcodePayload)

        Answer the user's question about this object. Be helpful, accurate, and concise (under 150 words). If you're not sure about something, say so rather than guessing.
        """
    }
}

public struct DialogueContext: Equatable, Sendable {
    public var name: String
    public var category: String
    public var subcategory: String
    public var details: String
    public var possibleBrand: String
    public var possibleModel: String
    public var materials: [String]
    public var characteristics: [String]
    public var estimatedEra: String
    public var interestingFacts: [String]
    public var recognizedText: String
    public var barcodePayload: String

    public init(
        name: String,
        category: String,
        subcategory: String,
        details: String,
        possibleBrand: String,
        possibleModel: String,
        materials: [String],
        characteristics: [String],
        estimatedEra: String,
        interestingFacts: [String],
        recognizedText: String,
        barcodePayload: String
    ) {
        self.name = name
        self.category = category
        self.subcategory = subcategory
        self.details = details
        self.possibleBrand = possibleBrand
        self.possibleModel = possibleModel
        self.materials = materials
        self.characteristics = characteristics
        self.estimatedEra = estimatedEra
        self.interestingFacts = interestingFacts
        self.recognizedText = recognizedText
        self.barcodePayload = barcodePayload
    }
}

public struct DialogueTurn: Equatable, Sendable {
    public var role: String
    public var content: String

    public init(role: String, content: String) {
        self.role = role
        self.content = content
    }
}
