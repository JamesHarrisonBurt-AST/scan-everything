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

    private func date(_ iso: String, calendar: Calendar) -> Date {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.date(from: iso)!
    }
}
