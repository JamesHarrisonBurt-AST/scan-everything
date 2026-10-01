import AppIntents

struct OpenScannerIntent: AppIntent {
    static var title: LocalizedStringResource = "Scan an object"
    static var description = IntentDescription("Opens Scan Anything and turns on the camera.")
    static var openAppWhenRun = true

    func perform() async throws -> some IntentResult {
        ScannerLaunch.request()
        await MainActor.run {
            NotificationCenter.default.post(name: .scanAnythingOpenScanner, object: nil)
        }
        return .result()
    }
}

extension Notification.Name {
    static let scanAnythingOpenScanner = Notification.Name("ScanAnythingOpenScanner")
}
