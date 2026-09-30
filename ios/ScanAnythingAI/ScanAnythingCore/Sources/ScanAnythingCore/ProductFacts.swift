import Foundation

public enum ProductCatalog: String, CaseIterable, Sendable {
    case food = "Open Food Facts"
    case beauty = "Open Beauty Facts"
    case products = "Open Products Facts"

    public var host: String {
        switch self {
        case .food: return "world.openfoodfacts.org"
        case .beauty: return "world.openbeautyfacts.org"
        case .products: return "world.openproductsfacts.org"
        }
    }

    /// Required by the Open * Facts servers. A default URLSession agent is refused.
    public static let userAgent = "ScanAnythingAI/1.0 (ai.scananything.app)"

    public static let fields = [
        "product_name", "product_name_en", "generic_name", "generic_name_en",
        "brands", "quantity", "categories", "categories_tags",
        "ingredients_text", "ingredients_text_en",
        "allergens", "allergens_tags", "traces", "traces_tags",
        "labels", "labels_tags", "nutriscore_grade", "nova_group",
        "packaging", "origins", "image_front_url", "image_front_small_url",
        "conservation_conditions", "code"
    ].joined(separator: ",")

    public func productURL(code: String) -> URL? {
        var components = URLComponents()
        components.scheme = "https"
        components.host = host
        components.path = "/api/v2/product/\(code).json"
        components.queryItems = [
            URLQueryItem(name: "fields", value: Self.fields),
            URLQueryItem(name: "lc", value: "en")
        ]
        return components.url
    }
}

public struct ProductFacts: Equatable, Sendable {
    public var barcode: String
    public var source: String
    public var name: String
    public var genericName: String
    public var brand: String
    public var quantity: String
    public var categories: [String]
    public var ingredients: String
    public var allergens: [String]
    public var traces: [String]
    public var labels: [String]
    public var nutriscore: String
    public var novaGroup: Int?
    public var packaging: [String]
    public var origins: String
    public var storage: String
    public var imageURL: String

    public init(
        barcode: String,
        source: String,
        name: String,
        genericName: String = "",
        brand: String = "",
        quantity: String = "",
        categories: [String] = [],
        ingredients: String = "",
        allergens: [String] = [],
        traces: [String] = [],
        labels: [String] = [],
        nutriscore: String = "",
        novaGroup: Int? = nil,
        packaging: [String] = [],
        origins: String = "",
        storage: String = "",
        imageURL: String = ""
    ) {
        self.barcode = barcode
        self.source = source
        self.name = name
        self.genericName = genericName
        self.brand = brand
        self.quantity = quantity
        self.categories = categories
        self.ingredients = ingredients
        self.allergens = allergens
        self.traces = traces
        self.labels = labels
        self.nutriscore = nutriscore
        self.novaGroup = novaGroup
        self.packaging = packaging
        self.origins = origins
        self.storage = storage
        self.imageURL = imageURL
    }
}

public enum ProductFactsJSON {
    /// Reads an Open * Facts v2 product response. A miss, an empty name, or
    /// malformed JSON returns nil so the caller can try the next catalog.
    public static func decode(_ data: Data, barcode: String, source: String) -> ProductFacts? {
        guard let root = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
        guard intValue(root["status"]) == 1, let product = root["product"] as? [String: Any] else { return nil }
        guard let name = first(
            string(product["product_name_en"]),
            string(product["product_name"]),
            string(product["generic_name_en"]),
            string(product["generic_name"])
        ) else { return nil }

        let generic = first(string(product["generic_name_en"]), string(product["generic_name"])) ?? ""
        let categories = displayCategories(product)
        let image = first(string(product["image_front_url"]), string(product["image_front_small_url"])) ?? ""
        return ProductFacts(
            barcode: barcode,
            source: source,
            name: String(name.prefix(80)),
            genericName: generic.caseInsensitiveCompare(name) == .orderedSame ? "" : generic,
            brand: string(product["brands"]) ?? "",
            quantity: string(product["quantity"]) ?? "",
            categories: categories,
            ingredients: first(string(product["ingredients_text_en"]), string(product["ingredients_text"])) ?? "",
            allergens: phrases(human: product["allergens"], tags: product["allergens_tags"]),
            traces: phrases(human: product["traces"], tags: product["traces_tags"]),
            labels: phrases(human: product["labels"], tags: product["labels_tags"]),
            nutriscore: (string(product["nutriscore_grade"]) ?? "").uppercased(),
            novaGroup: intValue(product["nova_group"]),
            packaging: commaList(product["packaging"]).prefix(6).map { String($0) },
            origins: string(product["origins"]) ?? "",
            storage: string(product["conservation_conditions"]) ?? "",
            imageURL: image.hasPrefix("https://") ? image : ""
        )
    }

    static func displayCategories(_ product: [String: Any]) -> [String] {
        let tags = stringList(product["categories_tags"])
        let english = tags.filter { $0.lowercased().hasPrefix("en:") }
        // Some listings put a local name in an en: tag. Prefer ASCII taxonomy slugs.
        let ascii = english.filter { displayTag($0).unicodeScalars.allSatisfy(\.isASCII) }
        let preferred = ascii.isEmpty ? english : ascii
        let chosen = preferred.isEmpty ? (tags.isEmpty ? commaList(product["categories"]) : tags) : preferred
        var seen = Set<String>()
        return chosen.compactMap { raw -> String? in
            let display = titleCase(displayTag(raw))
            let key = display.lowercased()
            guard !display.isEmpty, seen.insert(key).inserted else { return nil }
            return display
        }
    }

    static func displayTag(_ tag: String) -> String {
        var value = tag.trimmingCharacters(in: .whitespacesAndNewlines)
        if let colon = value.firstIndex(of: ":") {
            let prefix = value[..<colon]
            if prefix.count == 2 {
                value = String(value[value.index(after: colon)...])
            }
        }
        return value.replacingOccurrences(of: "-", with: " ").trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private static func phrases(human: Any?, tags: Any?) -> [String] {
        let readable = commaList(human)
        if !readable.isEmpty { return readable }
        return stringList(tags).map { titleCase(displayTag($0)) }.filter { !$0.isEmpty }
    }

    private static func commaList(_ value: Any?) -> [String] {
        guard let text = string(value) else { return [] }
        return text.split(separator: ",").map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }
    }

    private static func stringList(_ value: Any?) -> [String] {
        guard let values = value as? [Any] else { return commaList(value) }
        return values.compactMap { string($0) }
    }

    private static func string(_ value: Any?) -> String? {
        guard let text = value as? String else { return nil }
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }

    private static func intValue(_ value: Any?) -> Int? {
        if let value = value as? Int { return value }
        if let value = value as? NSNumber { return value.intValue }
        if let value = value as? String { return Int(value) }
        return nil
    }

    private static func first(_ values: String?...) -> String? {
        values.compactMap { $0 }.first { !$0.isEmpty }
    }

    private static func titleCase(_ value: String) -> String {
        value.split(separator: " ").map { part in
            part.prefix(1).uppercased() + part.dropFirst()
        }.joined(separator: " ")
    }
}

public enum ProductAnalysis {
    public enum Picture: Sendable {
        case userPhoto
        case catalogPhoto
        case codeOnly
    }

    public static func analysis(from facts: ProductFacts) -> DiscoveryAnalysis {
        let category = category(for: facts)
        let subcategory = facts.categories.last ?? defaultSubcategory(facts.source)
        var headline = [facts.brand, facts.quantity].filter { !$0.isEmpty }.joined(separator: " · ")
        if headline.isEmpty {
            headline = "Listed on \(facts.source)."
        } else {
            headline += ". Listed on \(facts.source)."
        }

        var factsList: [String] = []
        if !facts.genericName.isEmpty {
            factsList.append(facts.genericName)
        }
        if !facts.quantity.isEmpty {
            factsList.append("Pack size: \(facts.quantity).")
        }
        if let score = nutriScoreFact(facts.nutriscore) {
            factsList.append(score)
        }
        if let nova = novaFact(facts.novaGroup) {
            factsList.append(nova)
        }
        if !facts.origins.isEmpty {
            factsList.append("Origin listed as \(facts.origins).")
        }
        if factsList.count > 4 {
            factsList = Array(factsList.prefix(4))
        }
        factsList.append("This listing comes from \(facts.source).")

        var safety: [String] = []
        if !facts.allergens.isEmpty {
            safety.append("Contains \(facts.ingredientsList(facts.allergens)).")
        }
        if !facts.traces.isEmpty {
            safety.append("May contain traces of \(facts.ingredientsList(facts.traces)).")
        }

        var characteristics = facts.labels.prefix(5).map { String($0) }
        if ["A", "B", "C", "D", "E"].contains(facts.nutriscore) {
            characteristics.append("Nutri-Score \(facts.nutriscore)")
        }
        if let nova = facts.novaGroup, (1...4).contains(nova) {
            characteristics.append("NOVA \(nova)")
        }

        var questions = ["What should I know before using this?", "What do the labels mean?"]
        if !facts.ingredients.isEmpty {
            questions.insert("What are the main ingredients?", at: 0)
        }

        let details = narrative(facts)
        return DiscoveryAnalysis(
            name: facts.name,
            category: category,
            subcategory: String(subcategory.prefix(60)),
            summary: headline,
            details: details,
            possibleBrand: facts.brand,
            possibleModel: facts.quantity,
            confidence: facts.brand.isEmpty ? 86 : 93,
            materials: facts.packaging,
            characteristics: characteristics,
            estimatedEra: "modern",
            estimatedValue: "Everyday Item",
            interestingFacts: Array(factsList.prefix(5)),
            safetyNotes: safety,
            maintenanceTips: facts.storage.isEmpty ? [] : [facts.storage],
            searchTerms: unique([facts.name, facts.brand, facts.barcode, subcategory]),
            followUpSuggestions: questions,
            rarity: .common
        )
    }

    public static func notice(for facts: ProductFacts, picture: Picture) -> String {
        let matched = "Matched this barcode on \(facts.source). The code was sent to that public catalog."
        switch picture {
        case .userPhoto:
            return matched + " Your photo stayed on this iPhone."
        case .catalogPhoto:
            return matched + " The picture is that catalog's front photo."
        case .codeOnly:
            return matched
        }
    }

    public static func notListedNotice(usedAI: Bool) -> String {
        if usedAI {
            return "No public product listing for this barcode, so the photo went to your AI."
        }
        return "No public product listing for this barcode. Saved from the code on this iPhone. Add an API key in Profile for a fuller read."
    }

    public static func unreachableNotice(usedAI: Bool) -> String {
        if usedAI {
            return "Product catalogs could not be reached, so the photo went to your AI."
        }
        return "Product catalogs could not be reached. Saved from the code on this iPhone."
    }

    static func category(for facts: ProductFacts) -> String {
        let haystack = facts.categories.joined(separator: " ").lowercased()
        let rules: [(String, [String])] = [
            ("shoes", ["shoe", "sneaker", "footwear"]),
            ("clothing", ["clothing", "shirt", "apparel", "garment"]),
            ("electronics", ["electronic", "phone", "computer", "battery", "headphone", "charger"]),
            ("appliance", ["appliance", "blender", "toaster", "kettle"]),
            ("toy", ["toy", "board game", "puzzle"]),
            ("book", ["book", "magazine", "isbn"]),
            ("tool", ["tool", "hardware"]),
            ("furniture", ["furniture"]),
            ("household", ["household", "cleaning", "detergent", "soap", "shampoo", "cosmetic", "beauty", "toothpaste", "perfume", "skincare", "makeup", "lotion", "deodorant"]),
            ("food", ["food", "beverage", "drink", "snack", "dairy", "chocolate", "cereal", "sauce", "bread", "fruit", "vegetable", "juice", "coffee", "tea", "candy", "grocery", "meat", "seafood", "spread", "biscuit", "wine", "beer", "milk", "cheese", "yogurt", "pasta", "rice", "spice", "dessert", "breakfast", "confection", "pet food"])
        ]
        for (category, words) in rules where words.contains(where: { haystack.contains($0) }) {
            return category
        }
        if facts.source == ProductCatalog.food.rawValue { return "food" }
        if facts.source == ProductCatalog.beauty.rawValue { return "household" }
        return "other"
    }

    private static func defaultSubcategory(_ source: String) -> String {
        if source == ProductCatalog.food.rawValue { return "Packaged food" }
        if source == ProductCatalog.beauty.rawValue { return "Personal care" }
        return "Packaged product"
    }

    private static func narrative(_ facts: ProductFacts) -> String {
        var sentences: [String] = []
        if !facts.genericName.isEmpty {
            sentences.append(facts.genericName + (facts.genericName.hasSuffix(".") ? "" : "."))
        }
        if !facts.ingredients.isEmpty {
            let text = facts.ingredients.count > 500 ? String(facts.ingredients.prefix(500)) + "…" : facts.ingredients
            sentences.append("Ingredients: \(text)")
        }
        if sentences.isEmpty {
            sentences.append("A packaged product identified from its barcode.")
        }
        sentences.append("Catalog data can be incomplete, so check the package when it matters.")
        return sentences.joined(separator: " ")
    }

    private static func nutriScoreFact(_ grade: String) -> String? {
        guard ["A", "B", "C", "D", "E"].contains(grade) else { return nil }
        return "Nutri-Score \(grade). On this scale A is the highest nutritional quality and E is the lowest."
    }

    private static func novaFact(_ group: Int?) -> String? {
        switch group {
        case 1: return "NOVA 1: unprocessed or minimally processed."
        case 2: return "NOVA 2: processed culinary ingredient."
        case 3: return "NOVA 3: processed food."
        case 4: return "NOVA 4: ultra-processed food."
        default: return nil
        }
    }

    private static func unique(_ values: [String]) -> [String] {
        var seen = Set<String>()
        return values.map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { value in
            guard !value.isEmpty else { return false }
            return seen.insert(value.lowercased()).inserted
        }
    }
}

private extension ProductFacts {
    func ingredientsList(_ values: [String]) -> String {
        values.joined(separator: ", ")
    }
}
