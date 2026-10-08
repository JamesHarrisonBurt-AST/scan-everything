import Foundation
import ScanAnythingCore
import SwiftData

@Model
final class ExplorerProfile {
    var displayName: String
    var xp: Int
    var streakDays: Int
    var lastScanDate: Date?
    var lifetimeDiscoveries: Int
    var categoriesEverSeen: [String]
    var onboardingCompleted: Bool
    var createdAt: Date

    init(
        displayName: String = "Explorer",
        xp: Int = 0,
        streakDays: Int = 0,
        lastScanDate: Date? = nil,
        lifetimeDiscoveries: Int = 0,
        categoriesEverSeen: [String] = [],
        onboardingCompleted: Bool = false,
        createdAt: Date = .now
    ) {
        self.displayName = displayName
        self.xp = xp
        self.streakDays = streakDays
        self.lastScanDate = lastScanDate
        self.lifetimeDiscoveries = lifetimeDiscoveries
        self.categoriesEverSeen = categoriesEverSeen
        self.onboardingCompleted = onboardingCompleted
        self.createdAt = createdAt
    }
}

@Model
final class DiscoveryRecord {
    var id: UUID
    var title: String
    var category: String
    var subcategory: String
    var summary: String
    var narrative: String
    var possibleBrand: String
    var possibleModel: String
    var confidence: Int
    var imageFilename: String
    var materials: [String]
    var characteristics: [String]
    var estimatedEra: String
    var estimatedValue: String
    var interestingFacts: [String]
    var safetyNotes: [String]
    var maintenanceTips: [String]
    var searchTerms: [String]
    var followUpSuggestions: [String]
    var rarityRaw: String
    var xpEarned: Int
    var favorited: Bool
    var tags: [String]
    var notes: String
    var latitude: Double?
    var longitude: Double?
    var locationLabel: String
    var recognizedText: String
    var barcodePayload: String
    var barcodeSymbology: String
    var sourceRaw: String
    var featurePrint: Data?
    var createdAt: Date

    @Relationship(deleteRule: .cascade, inverse: \ChatMessageRecord.discovery)
    var messages: [ChatMessageRecord]

    init(
        id: UUID = UUID(),
        title: String,
        category: String,
        subcategory: String = "",
        summary: String = "",
        narrative: String = "",
        possibleBrand: String = "",
        possibleModel: String = "",
        confidence: Int = 0,
        imageFilename: String,
        materials: [String] = [],
        characteristics: [String] = [],
        estimatedEra: String = "",
        estimatedValue: String = "",
        interestingFacts: [String] = [],
        safetyNotes: [String] = [],
        maintenanceTips: [String] = [],
        searchTerms: [String] = [],
        followUpSuggestions: [String] = [],
        rarityRaw: String = Rarity.common.rawValue,
        xpEarned: Int = 0,
        favorited: Bool = false,
        tags: [String] = [],
        notes: String = "",
        latitude: Double? = nil,
        longitude: Double? = nil,
        locationLabel: String = "",
        recognizedText: String = "",
        barcodePayload: String = "",
        barcodeSymbology: String = "",
        sourceRaw: String = "ai",
        featurePrint: Data? = nil,
        createdAt: Date = .now,
        messages: [ChatMessageRecord] = []
    ) {
        self.id = id
        self.title = title
        self.category = category
        self.subcategory = subcategory
        self.summary = summary
        self.narrative = narrative
        self.possibleBrand = possibleBrand
        self.possibleModel = possibleModel
        self.confidence = confidence
        self.imageFilename = imageFilename
        self.materials = materials
        self.characteristics = characteristics
        self.estimatedEra = estimatedEra
        self.estimatedValue = estimatedValue
        self.interestingFacts = interestingFacts
        self.safetyNotes = safetyNotes
        self.maintenanceTips = maintenanceTips
        self.searchTerms = searchTerms
        self.followUpSuggestions = followUpSuggestions
        self.rarityRaw = rarityRaw
        self.xpEarned = xpEarned
        self.favorited = favorited
        self.tags = tags
        self.notes = notes
        self.latitude = latitude
        self.longitude = longitude
        self.locationLabel = locationLabel
        self.recognizedText = recognizedText
        self.barcodePayload = barcodePayload
        self.barcodeSymbology = barcodeSymbology
        self.sourceRaw = sourceRaw
        self.featurePrint = featurePrint
        self.createdAt = createdAt
        self.messages = messages
    }

    var rarity: Rarity {
        get { Rarity.parse(rarityRaw) }
        set { rarityRaw = newValue.rawValue }
    }
}

@Model
final class ChatMessageRecord {
    var id: UUID
    var roleRaw: String
    var content: String
    var createdAt: Date
    var discovery: DiscoveryRecord?

    init(id: UUID = UUID(), roleRaw: String, content: String, createdAt: Date = .now, discovery: DiscoveryRecord? = nil) {
        self.id = id
        self.roleRaw = roleRaw
        self.content = content
        self.createdAt = createdAt
        self.discovery = discovery
    }
}

@Model
final class ScanCollection {
    var id: UUID
    var name: String
    var summary: String
    var colorName: String
    var createdAt: Date

    @Relationship(deleteRule: .cascade, inverse: \CollectionLink.collection)
    var links: [CollectionLink]

    init(
        id: UUID = UUID(),
        name: String,
        summary: String = "",
        colorName: String = "amber",
        createdAt: Date = .now,
        links: [CollectionLink] = []
    ) {
        self.id = id
        self.name = name
        self.summary = summary
        self.colorName = colorName
        self.createdAt = createdAt
        self.links = links
    }
}

@Model
final class CollectionLink {
    var id: UUID
    var addedAt: Date
    var collection: ScanCollection?
    var discovery: DiscoveryRecord?

    init(id: UUID = UUID(), addedAt: Date = .now, collection: ScanCollection? = nil, discovery: DiscoveryRecord? = nil) {
        self.id = id
        self.addedAt = addedAt
        self.collection = collection
        self.discovery = discovery
    }
}

@Model
final class EarnedAchievement {
    var code: String
    var earnedAt: Date

    init(code: String, earnedAt: Date = .now) {
        self.code = code
        self.earnedAt = earnedAt
    }
}

@Model
final class QuestProgress {
    var periodKey: String
    var questCode: String
    var progressCount: Int
    var completed: Bool
    var completedAt: Date?

    init(periodKey: String, questCode: String, progressCount: Int = 0, completed: Bool = false, completedAt: Date? = nil) {
        self.periodKey = periodKey
        self.questCode = questCode
        self.progressCount = progressCount
        self.completed = completed
        self.completedAt = completedAt
    }
}
