import Foundation
#if canImport(WidgetKit)
import WidgetKit
#endif

struct JournalSnapshot: Codable, Equatable, Sendable {
    var displayName: String
    var xp: Int
    var streakDays: Int
    var level: Int
    var levelName: String
    var updatedAt: Date

    static let empty = JournalSnapshot(
        displayName: "Explorer",
        xp: 0,
        streakDays: 0,
        level: 1,
        levelName: "Observer",
        updatedAt: .distantPast
    )
}

enum AppGroup {
    static let identifier = "group.ai.scananything.app"
    static let snapshotName = "journal-snapshot.json"
    static let scannerFlag = "open-scanner"

    static var container: URL? {
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: identifier)
    }
}

enum JournalSnapshotStore {
    static func publish(displayName: String, xp: Int, streakDays: Int, level: Int, levelName: String) {
        let snapshot = JournalSnapshot(
            displayName: displayName,
            xp: xp,
            streakDays: streakDays,
            level: level,
            levelName: levelName,
            updatedAt: .now
        )
        guard let data = try? JSONEncoder().encode(snapshot), let url = fileURL(AppGroup.snapshotName) else { return }
        try? data.write(to: url, options: .atomic)
        #if canImport(WidgetKit)
        WidgetCenter.shared.reloadAllTimelines()
        #endif
    }

    static func load() -> JournalSnapshot {
        guard let url = fileURL(AppGroup.snapshotName), let data = try? Data(contentsOf: url) else {
            return .empty
        }
        return (try? JSONDecoder().decode(JournalSnapshot.self, from: data)) ?? .empty
    }

    private static func fileURL(_ name: String) -> URL? {
        guard let container = AppGroup.container else { return nil }
        if !FileManager.default.fileExists(atPath: container.path) {
            try? FileManager.default.createDirectory(at: container, withIntermediateDirectories: true)
        }
        return container.appendingPathComponent(name)
    }
}

enum ScannerLaunch {
    static func request() {
        guard let url = flagURL() else { return }
        try? Data("1".utf8).write(to: url, options: .atomic)
    }

    static func consume() -> Bool {
        guard let url = flagURL(), FileManager.default.fileExists(atPath: url.path) else { return false }
        try? FileManager.default.removeItem(at: url)
        return true
    }

    private static func flagURL() -> URL? {
        guard let container = AppGroup.container else { return nil }
        if !FileManager.default.fileExists(atPath: container.path) {
            try? FileManager.default.createDirectory(at: container, withIntermediateDirectories: true)
        }
        return container.appendingPathComponent(AppGroup.scannerFlag)
    }
}
