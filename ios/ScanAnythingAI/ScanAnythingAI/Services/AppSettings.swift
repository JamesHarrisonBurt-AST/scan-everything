import Foundation
import Observation

@MainActor
@Observable
final class AppSettings {
    static let shared = AppSettings()

    private enum Key {
        static let api = "openai_api_key"
        static let baseURL = "ai.baseURL"
        static let model = "ai.model"
        static let haptics = "ai.haptics"
        static let location = "ai.tagLocation"
    }

    var apiKey: String
    var baseURL: String
    var modelName: String
    var hapticsEnabled: Bool
    var tagLocation: Bool

    var hasAPIKey: Bool {
        !apiKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    private init() {
        let defaults = UserDefaults.standard
        apiKey = KeychainStore.get(account: Key.api) ?? bundledKey()
        baseURL = defaults.string(forKey: Key.baseURL) ?? "https://api.openai.com/v1"
        modelName = defaults.string(forKey: Key.model) ?? "gpt-4o-mini"
        if defaults.object(forKey: Key.haptics) == nil {
            hapticsEnabled = true
        } else {
            hapticsEnabled = defaults.bool(forKey: Key.haptics)
        }
        tagLocation = defaults.bool(forKey: Key.location)
    }

    func saveAI() {
        let trimmedKey = apiKey.trimmingCharacters(in: .whitespacesAndNewlines)
        apiKey = trimmedKey
        if trimmedKey.isEmpty {
            KeychainStore.delete(account: Key.api)
        } else {
            KeychainStore.set(trimmedKey, account: Key.api)
        }
        let defaults = UserDefaults.standard
        defaults.set(baseURL.trimmingCharacters(in: .whitespacesAndNewlines), forKey: Key.baseURL)
        defaults.set(modelName.trimmingCharacters(in: .whitespacesAndNewlines), forKey: Key.model)
        baseURL = defaults.string(forKey: Key.baseURL) ?? baseURL
        modelName = defaults.string(forKey: Key.model) ?? modelName
        savePreferences()
    }

    func savePreferences() {
        let defaults = UserDefaults.standard
        defaults.set(hapticsEnabled, forKey: Key.haptics)
        defaults.set(tagLocation, forKey: Key.location)
    }

    func makeAnalyzer() -> OpenAICompatibleAnalyzer {
        OpenAICompatibleAnalyzer(baseURL: baseURL, apiKey: apiKey, model: modelName)
    }

    private static func bundledKey() -> String {
        guard let url = Bundle.main.url(forResource: "AIConfig", withExtension: "plist"),
              let data = try? Data(contentsOf: url),
              let plist = try? PropertyListSerialization.propertyList(from: data, format: nil) as? [String: Any],
              let key = plist["APIKey"] as? String else {
            return ""
        }
        return key.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}
