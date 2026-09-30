import XCTest
@testable import ScanAnythingCore

final class CoreTests: XCTestCase {
    func testXPMatchesWebRules() {
        XCTAssertEqual(
            Gamification.xpEarned(XPInput(confidence: 90, rarity: .exceptional, isNewCategory: true, isFirstDiscovery: true)),
            10 + 5 + 30 + 25 + 40
        )
        XCTAssertEqual(
            Gamification.xpEarned(XPInput(confidence: 70, rarity: .common, isNewCategory: false, isFirstDiscovery: false)),
            10
        )
        XCTAssertEqual(
            Gamification.xpEarned(XPInput(confidence: 80, rarity: .interesting, isNewCategory: false, isFirstDiscovery: false)),
            25
        )
    }

    func testLevels() {
        XCTAssertEqual(ExplorerLevels.level(for: 0).name, "Observer")
        XCTAssertEqual(ExplorerLevels.level(for: 100).level, 2)
        XCTAssertEqual(ExplorerLevels.level(for: 4499).name, "Field Expert")
        XCTAssertEqual(ExplorerLevels.level(for: 4500).name, "Visionary")
        let progress = ExplorerLevels.progress(for: 200)
        XCTAssertEqual(progress.current.level, 2)
        XCTAssertEqual(progress.xpInLevel, 100)
        XCTAssertEqual(progress.xpToNext, 200)
        XCTAssertEqual(progress.progress, 0.5, accuracy: 0.001)
        XCTAssertTrue(ExplorerLevels.progress(for: 9000).isMaxLevel)
    }

    func testStreak() {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0)!
        let now = date("2026-09-30T15:00:00Z", calendar: calendar)
        XCTAssertEqual(Gamification.updatedStreak(lastScan: nil, currentStreak: 0, now: now, calendar: calendar), 1)
        let todayEarlier = date("2026-09-30T01:00:00Z", calendar: calendar)
        XCTAssertEqual(Gamification.updatedStreak(lastScan: todayEarlier, currentStreak: 4, now: now, calendar: calendar), 4)
        let yesterday = date("2026-09-29T22:00:00Z", calendar: calendar)
        XCTAssertEqual(Gamification.updatedStreak(lastScan: yesterday, currentStreak: 4, now: now, calendar: calendar), 5)
        let gap = date("2026-09-20T12:00:00Z", calendar: calendar)
        XCTAssertEqual(Gamification.updatedStreak(lastScan: gap, currentStreak: 9, now: now, calendar: calendar), 1)
    }

    func testAchievementsAwardOnce() {
        let context = AchievementContext(
            totalDiscoveries: 1,
            categoryCounts: ["electronics": 1],
            uniqueCategoryCount: 1,
            currentStreak: 1,
            hasOldDiscovery: true,
            hasTextDiscovery: true,
            hasBarcodeDiscovery: false,
            alreadyEarned: ["first_sight"]
        )
        let earned = AchievementCheck.newlyEarned(context).map(\.code)
        XCTAssertFalse(earned.contains("first_sight"))
        XCTAssertTrue(earned.contains("century_find"))
        XCTAssertTrue(earned.contains("label_reader"))
        XCTAssertFalse(earned.contains("code_breaker"))
        XCTAssertFalse(earned.contains("tech_spotter"))
    }

    func testQuestMatchingAndStableSchedule() {
        let subject = QuestSubject(
            category: "plant",
            materials: ["cellulose"],
            characteristics: ["leafy"],
            estimatedEra: "modern",
            hasBarcode: false,
            hasText: true
        )
        let plant = QuestCatalog.daily.first { $0.code == "plant" }!
        let metal = QuestCatalog.daily.first { $0.code == "metal" }!
        XCTAssertTrue(QuestCatalog.matches(plant, subject: subject))
        XCTAssertFalse(QuestCatalog.matches(metal, subject: subject))
        XCTAssertTrue(Gamification.looksOld("mid-century modern, circa 1950"))
        XCTAssertFalse(Gamification.looksOld("modern"))

        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0)!
        let date = date("2026-09-30T12:00:00Z", calendar: calendar)
        let first = QuestSchedule.active(on: date, calendar: calendar)
        let second = QuestSchedule.active(on: date, calendar: calendar)
        XCTAssertEqual(first, second)
        XCTAssertEqual(first.count, 4)
        XCTAssertEqual(first.filter { $0.cadence == .daily }.count, 3)
        XCTAssertEqual(first.filter { $0.cadence == .weekly }.count, 1)
        let codes = Set(first.map(\.code))
        XCTAssertEqual(codes.count, 4)
    }

    func testAnalysisJSONIsForgiving() throws {
        let raw = """
        ```json
        {
          "name": "Monstera deliciosa",
          "category": "Plant",
          "subcategory": "houseplant",
          "summary": "A split-leaf tropical plant.",
          "description": "A common indoor aroid.",
          "possibleBrand": "",
          "possibleModel": "",
          "confidence": 0.91,
          "materials": "foliage",
          "characteristics": ["fenestrated leaves"],
          "estimatedEra": "modern",
          "estimatedValue": "Everyday Item",
          "interestingFacts": ["Native to tropical forests."],
          "safetyNotes": [],
          "maintenanceTips": ["Bright indirect light."],
          "searchTerms": ["monstera"],
          "followUpSuggestions": ["How often should I water it?"],
          "rarity": "interesting"
        }
        ```
        """
        let analysis = try AnalysisJSON.decode(from: raw)
        XCTAssertEqual(analysis.name, "Monstera deliciosa")
        XCTAssertEqual(analysis.category, "plant")
        XCTAssertEqual(analysis.confidence, 91)
        XCTAssertEqual(analysis.materials, ["foliage"])
        XCTAssertEqual(analysis.rarity, .interesting)
        XCTAssertEqual(analysis.details, "A common indoor aroid.")
    }

    func testOnDeviceSynthesis() {
        let barcode = OnDeviceSynthesis.analysis(from: VisionHints(textLines: ["ORGANIC"], barcodePayload: "012345678905", barcodeSymbology: "EAN-13"))
        XCTAssertTrue(barcode.name.contains("012345678905"))
        XCTAssertEqual(barcode.confidence, 78)

        let text = OnDeviceSynthesis.analysis(from: VisionHints(textLines: ["Field Guide", "Page 12"]))
        XCTAssertEqual(text.category, "document")
        XCTAssertEqual(text.name, "Field Guide")

        let empty = OnDeviceSynthesis.analysis(from: .empty)
        XCTAssertLessThan(empty.confidence, 40)
    }

    func testShareCardKeepsTheFindShort() {
        let draft = ShareDraft(
            title: "Brass compass",
            category: "tool",
            summary: "A pocket compass.",
            details: "Likely a hiking compass.",
            confidence: 84,
            rarity: "Interesting",
            facts: ["The needle aligns to magnetic north."],
            barcode: "012345678905",
            recognizedText: "MADE IN ENGLAND",
            location: "Golden Gate Park"
        )
        let copy = ShareCardComposer.compose(draft)
        XCTAssertEqual(copy.category, "Tool")
        XCTAssertEqual(copy.title, "Brass compass")
        XCTAssertEqual(copy.rarity, "Interesting")
        XCTAssertEqual(copy.confidence, "84%")
        XCTAssertEqual(copy.blurb, "A pocket compass.")
        XCTAssertEqual(copy.fact, "The needle aligns to magnetic north.")
        XCTAssertEqual(copy.place, "Golden Gate Park")
        XCTAssertEqual(copy.footer, "Scan Anything AI")
        XCTAssertFalse(copy.blurb.contains("012345678905"))
        let spoken = ShareCardComposer.accessibilityLabel(copy)
        XCTAssertTrue(spoken.contains("Brass compass"))
        XCTAssertTrue(spoken.contains("Found near Golden Gate Park"))
        XCTAssertTrue(DiscoveryShareText.plain(draft).contains("012345678905"))
    }

    func testShareCardFallsBackAndTruncates() {
        let emptyTitle = ShareCardComposer.compose(ShareDraft(
            title: "   ",
            category: "musical instrument",
            summary: "",
            details: "",
            confidence: 140,
            rarity: "exceptional",
            facts: ["  ", "A real fact that should show."],
            barcode: "3017620422003",
            recognizedText: "",
            location: ""
        ))
        XCTAssertEqual(emptyTitle.title, "Untitled find")
        XCTAssertEqual(emptyTitle.category, "Musical Instrument")
        XCTAssertEqual(emptyTitle.rarity, "Exceptional")
        XCTAssertEqual(emptyTitle.confidence, "100%")
        XCTAssertEqual(emptyTitle.blurb, "Barcode 3017620422003")
        XCTAssertEqual(emptyTitle.fact, "A real fact that should show.")
        XCTAssertEqual(emptyTitle.place, "")

        let fromDetails = ShareCardComposer.compose(ShareDraft(
            title: "Fern",
            category: "plant",
            summary: "  ",
            details: "A  common   indoor   fern.",
            confidence: -4,
            rarity: "",
            facts: ["A common indoor fern."],
            barcode: "",
            recognizedText: "CARE",
            location: "Kitchen window"
        ))
        XCTAssertEqual(fromDetails.confidence, "0%")
        XCTAssertEqual(fromDetails.rarity, "Common")
        XCTAssertEqual(fromDetails.blurb, "A common indoor fern.")
        XCTAssertEqual(fromDetails.fact, "")
        XCTAssertEqual(fromDetails.place, "Kitchen window")

        let fromPlace = ShareCardComposer.compose(ShareDraft(
            title: "Stone",
            category: "outdoor",
            summary: "",
            details: "",
            confidence: 40,
            rarity: "unusual",
            facts: [],
            barcode: "",
            recognizedText: "",
            location: "  Baker \n Beach "
        ))
        XCTAssertEqual(fromPlace.blurb, "Found near Baker Beach")
        XCTAssertEqual(fromPlace.place, "")
        XCTAssertEqual(fromPlace.rarity, "Unusual")

        let fromText = ShareCardComposer.compose(ShareDraft(
            title: "Label",
            category: "document",
            summary: "",
            details: "",
            confidence: 60,
            rarity: "common",
            facts: [],
            barcode: "3017620422003",
            recognizedText: "  Field   Guide ",
            location: ""
        ))
        XCTAssertEqual(fromText.blurb, "Field Guide")
        XCTAssertFalse(fromText.blurb.contains("3017620422003"))

        let longTitle = String(repeating: "Ancient ", count: 12).trimmingCharacters(in: .whitespaces)
        let long = ShareCardComposer.compose(ShareDraft(
            title: longTitle,
            category: "collectible",
            summary: String(repeating: "word ", count: 40),
            details: "",
            confidence: 50,
            rarity: "Rare find",
            facts: [String(repeating: "fact ", count: 40)],
            barcode: "",
            recognizedText: "",
            location: ""
        ))
        XCTAssertTrue(long.title.hasSuffix("…"))
        XCTAssertLessThanOrEqual(long.title.count, ShareCardComposer.titleLimit)
        XCTAssertTrue(long.blurb.hasSuffix("…"))
        XCTAssertLessThanOrEqual(long.blurb.count, ShareCardComposer.blurbLimit)
        XCTAssertTrue(long.fact.hasSuffix("…"))
        XCTAssertLessThanOrEqual(long.fact.count, ShareCardComposer.factLimit)
        XCTAssertEqual(long.rarity, "Rare find")
        XCTAssertFalse(long.title.contains("  "))
    }

    func testShareCardClippingBreaksOnWords() {
        XCTAssertEqual(ShareCardComposer.clipped("Brass pocket compass from the trail", limit: 20), "Brass pocket…")
        XCTAssertEqual(ShareCardComposer.clipped("Supercalifragilistic", limit: 10), "Supercali…")
        XCTAssertEqual(ShareCardComposer.clipped("  Nutella\n spread  ", limit: 40), "Nutella spread")
        XCTAssertEqual(ShareCardComposer.clipped("", limit: 10), "")
    }

    func testShareTextIncludesTheFind() {
        let text = DiscoveryShareText.plain(ShareDraft(
            title: "Brass compass",
            category: "tool",
            summary: "A pocket compass.",
            details: "Likely a hiking compass.",
            confidence: 84,
            rarity: "Interesting",
            facts: ["The needle aligns to magnetic north."],
            barcode: "",
            recognizedText: "",
            location: "Golden Gate Park"
        ))
        XCTAssertTrue(text.contains("Brass compass"))
        XCTAssertTrue(text.contains("Golden Gate Park"))
        XCTAssertTrue(text.contains("Scan Anything AI"))
    }

    func testGTINNormalization() {
        XCTAssertEqual(BarcodeIdentity.gtin(from: "3017620422003", symbology: "VNBarcodeSymbologyEAN13"), "3017620422003")
        XCTAssertEqual(BarcodeIdentity.gtin(from: "036000291452", symbology: "UPC-A"), "0036000291452")
        XCTAssertEqual(BarcodeIdentity.gtin(from: "96385074", symbology: "EAN8"), "96385074")
        XCTAssertEqual(BarcodeIdentity.gtin(from: "03017620422003", symbology: "ITF14"), "03017620422003")
        XCTAssertEqual(BarcodeIdentity.gtin(from: "04252614", symbology: "VNBarcodeSymbologyUPCE"), "0042100005264")
        XCTAssertEqual(BarcodeIdentity.gtin(from: "425261", symbology: "org.gs1.UPC-E"), "0042100005264")
        XCTAssertEqual(BarcodeIdentity.gtin(from: " 3017620422003 "), "3017620422003")
        XCTAssertNil(BarcodeIdentity.gtin(from: "3017620422004"))
        XCTAssertNil(BarcodeIdentity.gtin(from: "https://example.com/product/42", symbology: "QR"))
        XCTAssertNil(BarcodeIdentity.gtin(from: "12345", symbology: "Code128"))
        XCTAssertEqual(
            BarcodeIdentity.gtin(from: "https://id.gs1.org/01/03017620422003/10/ABC", symbology: "QR"),
            "03017620422003"
        )
        XCTAssertEqual(BarcodeIdentity.gtin(from: "(01)03017620422003"), "03017620422003")
    }

    func testProductFactsDecodeAndMapping() throws {
        let raw = """
        {
          "code": "3017620422003",
          "product": {
            "product_name": "Nutella",
            "product_name_en": "Nutella",
            "generic_name_en": "Hazelnut And Cocoa Spread",
            "brands": "Nutella, Ferrero",
            "quantity": "400 g",
            "categories_tags": ["en:breakfasts", "en:sweet-spreads", "en:Pâtes à tartiner", "fr:nutella"],
            "ingredients_text_en": "Sugar, palm oil, hazelnuts 13%, skimmed milk powder.",
            "allergens": "milk, nuts",
            "labels_tags": ["en:no-gluten"],
            "nutriscore_grade": "e",
            "nova_group": 4,
            "packaging": "Glass, Plastic lid",
            "origins": "",
            "conservation_conditions": "Store away from heat.",
            "image_front_url": "https://images.openfoodfacts.org/images/products/301/front.jpg",
            "image_front_small_url": "http://insecure.example/front.jpg"
          },
          "status": 1
        }
        """.data(using: .utf8)!
        let facts = try XCTUnwrap(ProductFactsJSON.decode(raw, barcode: "3017620422003", source: ProductCatalog.food.rawValue))
        XCTAssertEqual(facts.name, "Nutella")
        XCTAssertEqual(facts.brand, "Nutella, Ferrero")
        XCTAssertEqual(facts.allergens, ["milk", "nuts"])
        XCTAssertEqual(facts.categories, ["Breakfasts", "Sweet Spreads"])
        XCTAssertEqual(facts.imageURL, "https://images.openfoodfacts.org/images/products/301/front.jpg")
        XCTAssertEqual(facts.novaGroup, 4)

        let analysis = ProductAnalysis.analysis(from: facts)
        XCTAssertEqual(analysis.name, "Nutella")
        XCTAssertEqual(analysis.category, "food")
        XCTAssertEqual(analysis.subcategory, "Sweet Spreads")
        XCTAssertEqual(analysis.possibleBrand, "Nutella, Ferrero")
        XCTAssertEqual(analysis.confidence, 93)
        XCTAssertEqual(analysis.rarity, .common)
        XCTAssertEqual(analysis.materials, ["Glass", "Plastic lid"])
        XCTAssertTrue(analysis.safetyNotes.contains("Contains milk, nuts."))
        XCTAssertTrue(analysis.interestingFacts.contains { $0.contains("NOVA 4") })
        XCTAssertEqual(analysis.maintenanceTips, ["Store away from heat."])
        XCTAssertTrue(ProductAnalysis.notice(for: facts, picture: .userPhoto).contains("Open Food Facts"))
        XCTAssertTrue(ProductAnalysis.notice(for: facts, picture: .userPhoto).contains("photo stayed"))

        let miss = #"{"status":0,"status_verbose":"product not found"}"#.data(using: .utf8)!
        XCTAssertNil(ProductFactsJSON.decode(miss, barcode: "0000000000000", source: ProductCatalog.food.rawValue))
        let nameless = #"{"status":1,"product":{"brands":"Acme"}}"#.data(using: .utf8)!
        XCTAssertNil(ProductFactsJSON.decode(nameless, barcode: "3017620422003", source: ProductCatalog.food.rawValue))
    }

    func testProductCategoryDefaults() {
        let shampoo = ProductFacts(barcode: "1", source: ProductCatalog.beauty.rawValue, name: "Daily Wash", categories: ["Shampoo"])
        XCTAssertEqual(ProductAnalysis.analysis(from: shampoo).category, "household")
        let cable = ProductFacts(barcode: "2", source: ProductCatalog.products.rawValue, name: "USB Cable", categories: ["Phone accessories"])
        XCTAssertEqual(ProductAnalysis.analysis(from: cable).category, "electronics")
        let unknown = ProductFacts(barcode: "3", source: ProductCatalog.products.rawValue, name: "Mystery Tin")
        XCTAssertEqual(ProductAnalysis.analysis(from: unknown).category, "other")
        let url = ProductCatalog.food.productURL(code: "3017620422003")
        XCTAssertEqual(url?.host, "world.openfoodfacts.org")
        XCTAssertTrue(url?.absoluteString.contains("3017620422003") == true)
        XCTAssertTrue(url?.absoluteString.contains("product_name") == true)
    }

    private func date(_ iso: String, calendar: Calendar) -> Date {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.date(from: iso)!
    }
}
