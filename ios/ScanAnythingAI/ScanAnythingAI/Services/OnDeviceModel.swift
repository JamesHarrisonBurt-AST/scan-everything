import Foundation
import ScanAnythingCore

/// Names a find on the phone when Profile has no API key.
/// Apple Intelligence is used only when this SDK and the device both offer it.
/// Otherwise the caller keeps the Vision keyword read.
enum OnDeviceModel {
    static func identify(hints: VisionHints) async -> DiscoveryAnalysis? {
        guard hints.hasSignal else { return nil }
        #if canImport(FoundationModels)
        if #available(iOS 26.0, *) {
            return await AppleIntelligenceNaming.identify(hints: hints)
        }
        #endif
        return nil
    }
}

#if canImport(FoundationModels)
import FoundationModels

@available(iOS 26.0, *)
private enum AppleIntelligenceNaming {
    static func identify(hints: VisionHints) async -> DiscoveryAnalysis? {
        let model = SystemLanguageModel.default
        guard case .available = model.availability else { return nil }
        do {
            let session = LanguageModelSession(instructions: OnDeviceGuide.instructions)
            let response = try await session.respond(to: OnDeviceGuide.prompt(for: hints))
            return try AnalysisJSON.decode(from: response.content)
        } catch {
            return nil
        }
    }
}
#endif
