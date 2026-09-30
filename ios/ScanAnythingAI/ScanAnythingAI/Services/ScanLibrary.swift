import CoreLocation
import Foundation
import ScanAnythingCore
import SwiftData

struct SaveOutcome: Equatable, Identifiable {
    var id: UUID { discoveryID }
    var discoveryID: UUID
    var title: String
    var category: String
    var summary: String
    var confidence: Int
    var rarity: Rarity
    var xpEarned: Int
    var totalXP: Int
    var levelName: String
    var leveledUp: Bool
    var streak: Int
    var newAchievements: [AchievementDefinition]
    var completedQuests: [QuestDefinition]
    var usedOnDeviceOnly: Bool
    var notice: String?
}

@MainActor
enum ScanLibrary {
    @discardableResult
    static func ensureProfile(_ context: ModelContext) -> ExplorerProfile {
        if let existing = try? context.fetch(FetchDescriptor<ExplorerProfile>()).first {
            return existing
        }
        let profile = ExplorerProfile()
        context.insert(profile)
        try? context.save()
        return profile
    }

    static func save(
        analysis: DiscoveryAnalysis,
        imageJPEG: Data,
        hints: VisionHints,
        location: CLLocation?,
        locationLabel: String,
        usedOnDeviceOnly: Bool,
        notice: String?,
        context: ModelContext
    ) throws -> SaveOutcome {
        let profile = ensureProfile(context)
        let now = Date()
        let id = UUID()
        let stored = ImageEncoding.jpeg(imageJPEG, maxEdge: 1600, quality: 0.82)
        let filename = try ImageStore.saveJPEG(stored, id: id)
        let isFirst = profile.lifetimeDiscoveries == 0
        let isNewCategory = !profile.categoriesEverSeen.contains(analysis.category)
        let scanXP = Gamification.xpEarned(XPInput(
            confidence: analysis.confidence,
            rarity: analysis.rarity,
            isNewCategory: isNewCategory,
            isFirstDiscovery: isFirst
        ))
        let xpBefore = profile.xp

        let record = DiscoveryRecord(
            id: id,
            title: analysis.name,
            category: analysis.category,
            subcategory: analysis.subcategory,
            summary: analysis.summary,
            narrative: analysis.details,
            possibleBrand: analysis.possibleBrand,
            possibleModel: analysis.possibleModel,
            confidence: analysis.confidence,
            imageFilename: filename,
            materials: analysis.materials,
            characteristics: analysis.characteristics,
            estimatedEra: analysis.estimatedEra,
            estimatedValue: analysis.estimatedValue,
            interestingFacts: analysis.interestingFacts,
            safetyNotes: analysis.safetyNotes,
            maintenanceTips: analysis.maintenanceTips,
            searchTerms: analysis.searchTerms,
            followUpSuggestions: analysis.followUpSuggestions,
            rarityRaw: analysis.rarity.rawValue,
            xpEarned: scanXP,
            latitude: location?.coordinate.latitude,
            longitude: location?.coordinate.longitude,
            locationLabel: locationLabel,
            recognizedText: hints.recognizedText,
            barcodePayload: hints.barcodePayload ?? "",
            barcodeSymbology: hints.barcodeSymbology ?? "",
            sourceRaw: usedOnDeviceOnly ? "onDevice" : "ai",
            createdAt: now
        )
        context.insert(record)

        profile.lifetimeDiscoveries += 1
        if isNewCategory {
            profile.categoriesEverSeen.append(analysis.category)
        }
        profile.streakDays = Gamification.updatedStreak(lastScan: profile.lastScanDate, currentStreak: profile.streakDays, now: now)
        profile.lastScanDate = now

        let discoveries = (try? context.fetch(FetchDescriptor<DiscoveryRecord>())) ?? [record]
        var counts: [String: Int] = [:]
        for item in discoveries {
            counts[item.category, default: 0] += 1
        }
        let earned = Set(((try? context.fetch(FetchDescriptor<EarnedAchievement>())) ?? []).map(\.code))
        let hasOld = discoveries.contains { Gamification.looksOld($0.estimatedEra) }
        let hasText = discoveries.contains { !$0.recognizedText.isEmpty }
        let hasBarcode = discoveries.contains { !$0.barcodePayload.isEmpty }
        let freshAchievements = AchievementCheck.newlyEarned(AchievementContext(
            totalDiscoveries: profile.lifetimeDiscoveries,
            categoryCounts: counts,
            uniqueCategoryCount: profile.categoriesEverSeen.count,
            currentStreak: profile.streakDays,
            hasOldDiscovery: hasOld,
            hasTextDiscovery: hasText,
            hasBarcodeDiscovery: hasBarcode,
            alreadyEarned: earned
        ))
        var bonus = 0
        for achievement in freshAchievements {
            context.insert(EarnedAchievement(code: achievement.code, earnedAt: now))
            bonus += achievement.xpReward
        }

        let completedQuests = try updateQuests(subject: QuestSubject(
            category: analysis.category,
            materials: analysis.materials,
            characteristics: analysis.characteristics,
            estimatedEra: analysis.estimatedEra,
            hasBarcode: !(hints.barcodePayload ?? "").isEmpty,
            hasText: !hints.recognizedText.isEmpty
        ), discoveries: discoveries, now: now, context: context)
        bonus += completedQuests.reduce(0) { $0 + $1.xpReward }

        profile.xp = xpBefore + scanXP + bonus
        record.xpEarned = scanXP + bonus
        try context.save()

        let level = ExplorerLevels.level(for: profile.xp)
        return SaveOutcome(
            discoveryID: id,
            title: analysis.name,
            category: analysis.category,
            summary: analysis.summary,
            confidence: analysis.confidence,
            rarity: analysis.rarity,
            xpEarned: scanXP + bonus,
            totalXP: profile.xp,
            levelName: level.name,
            leveledUp: level.level > ExplorerLevels.level(for: xpBefore).level,
            streak: profile.streakDays,
            newAchievements: freshAchievements,
            completedQuests: completedQuests,
            usedOnDeviceOnly: usedOnDeviceOnly,
            notice: notice
        )
    }

    static func delete(_ record: DiscoveryRecord, context: ModelContext) throws {
        let links = (try? context.fetch(FetchDescriptor<CollectionLink>())) ?? []
        for link in links where link.discovery?.id == record.id {
            context.delete(link)
        }
        ImageStore.delete(record.imageFilename)
        context.delete(record)
        try context.save()
    }

    static func eraseAll(context: ModelContext) throws {
        for record in (try? context.fetch(FetchDescriptor<DiscoveryRecord>())) ?? [] {
            context.delete(record)
        }
        for collection in (try? context.fetch(FetchDescriptor<ScanCollection>())) ?? [] {
            context.delete(collection)
        }
        for earned in (try? context.fetch(FetchDescriptor<EarnedAchievement>())) ?? [] {
            context.delete(earned)
        }
        for progress in (try? context.fetch(FetchDescriptor<QuestProgress>())) ?? [] {
            context.delete(progress)
        }
        for profile in (try? context.fetch(FetchDescriptor<ExplorerProfile>())) ?? [] {
            context.delete(profile)
        }
        ImageStore.deleteAll()
        let fresh = ExplorerProfile(onboardingCompleted: true)
        context.insert(fresh)
        try context.save()
    }

    static func createCollection(name: String, context: ModelContext) -> ScanCollection {
        let colors = ["amber", "teal", "violet", "rose"]
        let existing = (try? context.fetch(FetchDescriptor<ScanCollection>()))?.count ?? 0
        let collection = ScanCollection(name: name, colorName: colors[existing % colors.count])
        context.insert(collection)
        try? context.save()
        return collection
    }

    static func add(_ discovery: DiscoveryRecord, to collection: ScanCollection, context: ModelContext) {
        if collection.links.contains(where: { $0.discovery?.id == discovery.id }) { return }
        let link = CollectionLink(collection: collection, discovery: discovery)
        context.insert(link)
        collection.links.append(link)
        try? context.save()
    }

    private static func updateQuests(subject: QuestSubject, discoveries: [DiscoveryRecord], now: Date, context: ModelContext) throws -> [QuestDefinition] {
        let calendar = Calendar.current
        let active = QuestSchedule.active(on: now, calendar: calendar)
        var stored = (try? context.fetch(FetchDescriptor<QuestProgress>())) ?? []
        var completed: [QuestDefinition] = []
        for quest in active {
            let key = QuestSchedule.periodKey(for: quest, on: now, calendar: calendar)
            let progress: QuestProgress
            if let existing = stored.first(where: { $0.periodKey == key }) {
                progress = existing
            } else {
                progress = QuestProgress(periodKey: key, questCode: quest.code)
                context.insert(progress)
                stored.append(progress)
            }
            if progress.completed { continue }

            if case .distinctCategories = quest.match {
                let weekItems = discoveries.filter { calendar.isDate($0.createdAt, equalTo: now, toGranularity: .weekOfYear) }
                progress.progressCount = Set(weekItems.map(\.category)).count
            } else if QuestCatalog.matches(quest, subject: subject) {
                progress.progressCount += 1
            } else {
                continue
            }

            if progress.progressCount >= quest.targetCount {
                progress.completed = true
                progress.completedAt = now
                completed.append(quest)
            }
        }
        return completed
    }
}
