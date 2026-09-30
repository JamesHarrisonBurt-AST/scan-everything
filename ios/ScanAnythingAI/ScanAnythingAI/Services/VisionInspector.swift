import CoreMedia
import ScanAnythingCore
import UIKit
import Vision

enum VisionInspector {
    static func inspect(data: Data) -> VisionHints {
        guard let image = UIImage(data: data) else { return .empty }
        return inspect(image: image)
    }

    static func inspect(image: UIImage) -> VisionHints {
        guard let cgImage = image.cgImage else { return .empty }
        let handler = VNImageRequestHandler(cgImage: cgImage, orientation: image.visionOrientation, options: [:])
        return perform(handler)
    }

    static func inspect(sampleBuffer: CMSampleBuffer) -> VisionHints {
        let handler = VNImageRequestHandler(cmSampleBuffer: sampleBuffer, orientation: .up, options: [:])
        return perform(handler, fastText: true)
    }

    private static func perform(_ handler: VNImageRequestHandler, fastText: Bool = false) -> VisionHints {
        let textRequest = VNRecognizeTextRequest()
        textRequest.recognitionLevel = fastText ? .fast : .accurate
        textRequest.usesLanguageCorrection = !fastText
        let barcodeRequest = VNDetectBarcodesRequest()
        do {
            try handler.perform([textRequest, barcodeRequest])
        } catch {
            return .empty
        }
        let lines = (textRequest.results ?? [])
            .prefix(8)
            .compactMap { $0.topCandidates(1).first?.string }
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
        let barcode = barcodeRequest.results?.first
        return VisionHints(
            textLines: lines,
            barcodePayload: barcode?.payloadStringValue,
            barcodeSymbology: barcode.map { $0.symbology.rawValue }
        )
    }
}
