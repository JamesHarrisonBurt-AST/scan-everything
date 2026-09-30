import Foundation

public struct VisionHints: Equatable, Sendable, Codable {
    public var textLines: [String]
    public var barcodePayload: String?
    public var barcodeSymbology: String?

    public init(textLines: [String] = [], barcodePayload: String? = nil, barcodeSymbology: String? = nil) {
        self.textLines = textLines
        self.barcodePayload = barcodePayload
        self.barcodeSymbology = barcodeSymbology
    }

    public static let empty = VisionHints()

    public var hasSignal: Bool {
        barcodePayload?.isEmpty == false || textLines.contains { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
    }

    public var recognizedText: String {
        textLines
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
            .joined(separator: "\n")
    }
}
