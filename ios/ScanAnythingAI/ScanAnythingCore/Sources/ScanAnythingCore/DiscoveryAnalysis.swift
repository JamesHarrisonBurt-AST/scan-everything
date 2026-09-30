import Foundation

public struct DiscoveryAnalysis: Equatable, Sendable {
    public var name: String
    public var category: String
    public var subcategory: String
    public var summary: String
    public var details: String
    public var possibleBrand: String
    public var possibleModel: String
    public var confidence: Int
    public var materials: [String]
    public var characteristics: [String]
    public var estimatedEra: String
    public var estimatedValue: String
    public var interestingFacts: [String]
    public var safetyNotes: [String]
    public var maintenanceTips: [String]
    public var searchTerms: [String]
    public var followUpSuggestions: [String]
    public var rarity: Rarity

    public init(
        name: String,
        category: String,
        subcategory: String = "",
        summary: String = "",
        details: String = "",
        possibleBrand: String = "",
        possibleModel: String = "",
        confidence: Int = 50,
        materials: [String] = [],
        characteristics: [String] = [],
        estimatedEra: String = "modern",
        estimatedValue: String = "Everyday Item",
        interestingFacts: [String] = [],
        safetyNotes: [String] = [],
        maintenanceTips: [String] = [],
        searchTerms: [String] = [],
        followUpSuggestions: [String] = [],
        rarity: Rarity = .common
    ) {
        self.name = name
        self.category = DiscoveryCategory.normalize(category)
        self.subcategory = subcategory
        self.summary = summary
        self.details = details
        self.possibleBrand = possibleBrand
        self.possibleModel = possibleModel
        self.confidence = min(100, max(0, confidence))
        self.materials = materials
        self.characteristics = characteristics
        self.estimatedEra = estimatedEra
        self.estimatedValue = estimatedValue
        self.interestingFacts = interestingFacts
        self.safetyNotes = safetyNotes
        self.maintenanceTips = maintenanceTips
        self.searchTerms = searchTerms
        self.followUpSuggestions = followUpSuggestions
        self.rarity = rarity
    }
}

public enum AnalysisDecodeError: Error, Equatable {
    case invalidJSON
}

public enum AnalysisJSON {
    public static func decode(from raw: String) throws -> DiscoveryAnalysis {
        let text = extractObject(from: raw)
        guard let data = text.data(using: .utf8) else { throw AnalysisDecodeError.invalidJSON }
        let payload = try JSONDecoder().decode(Payload.self, from: data)
        return payload.analysis
    }

    static func extractObject(from raw: String) -> String {
        var text = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if text.hasPrefix("```") {
            if let firstNewline = text.firstIndex(of: "\n") {
                text = String(text[text.index(after: firstNewline)...])
            }
            if let closing = text.range(of: "```", options: .backwards) {
                text = String(text[..<closing.lowerBound])
            }
            text = text.trimmingCharacters(in: .whitespacesAndNewlines)
        }
        guard let start = text.firstIndex(of: "{"), let end = text.lastIndex(of: "}"), start <= end else {
            return text
        }
        return String(text[start...end])
    }
}

private struct Payload: Decodable {
    let analysis: DiscoveryAnalysis

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let name = Self.string(container, .name).ifEmpty("Unknown object")
        let category = DiscoveryCategory.normalize(Self.string(container, .category).ifEmpty("other"))
        let confidence = Self.confidence(container)
        let rarity = Rarity.parse(Self.string(container, .rarity))
        analysis = DiscoveryAnalysis(
            name: name,
            category: category,
            subcategory: Self.string(container, .subcategory),
            summary: Self.string(container, .summary),
            details: Self.string(container, .description),
            possibleBrand: Self.string(container, .possibleBrand),
            possibleModel: Self.string(container, .possibleModel),
            confidence: confidence,
            materials: Self.strings(container, .materials),
            characteristics: Self.strings(container, .characteristics),
            estimatedEra: Self.string(container, .estimatedEra).ifEmpty("modern"),
            estimatedValue: Self.string(container, .estimatedValue).ifEmpty("Everyday Item"),
            interestingFacts: Self.strings(container, .interestingFacts),
            safetyNotes: Self.strings(container, .safetyNotes),
            maintenanceTips: Self.strings(container, .maintenanceTips),
            searchTerms: Self.strings(container, .searchTerms),
            followUpSuggestions: Self.strings(container, .followUpSuggestions),
            rarity: rarity
        )
    }

    private enum CodingKeys: String, CodingKey {
        case name, category, subcategory, summary, description
        case possibleBrand, possibleModel, confidence
        case materials, characteristics, estimatedEra, estimatedValue
        case interestingFacts, safetyNotes, maintenanceTips
        case searchTerms, followUpSuggestions, rarity
    }

    private static func string(_ container: KeyedDecodingContainer<CodingKeys>, _ key: CodingKeys) -> String {
        if let value = try? container.decode(String.self, forKey: key) {
            return value.trimmingCharacters(in: .whitespacesAndNewlines)
        }
        if let value = try? container.decode(Double.self, forKey: key) {
            return String(value)
        }
        return ""
    }

    private static func strings(_ container: KeyedDecodingContainer<CodingKeys>, _ key: CodingKeys) -> [String] {
        if let values = try? container.decode([String].self, forKey: key) {
            return values.map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }
        }
        if let values = try? container.decode([Double].self, forKey: key) {
            return values.map { String($0) }
        }
        let single = string(container, key)
        return single.isEmpty ? [] : [single]
    }

    private static func confidence(_ container: KeyedDecodingContainer<CodingKeys>) -> Int {
        if let value = try? container.decode(Int.self, forKey: .confidence) {
            return clampConfidence(Double(value))
        }
        if let value = try? container.decode(Double.self, forKey: .confidence) {
            return clampConfidence(value)
        }
        if let value = try? container.decode(String.self, forKey: .confidence), let number = Double(value) {
            return clampConfidence(number)
        }
        return 50
    }

    private static func clampConfidence(_ value: Double) -> Int {
        let scaled = (value > 0 && value < 1) ? value * 100 : value
        return Int(min(100, max(0, scaled.rounded())))
    }
}

private extension String {
    func ifEmpty(_ fallback: String) -> String {
        isEmpty ? fallback : self
    }
}
