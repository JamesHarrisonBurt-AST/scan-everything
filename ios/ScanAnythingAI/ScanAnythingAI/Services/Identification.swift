import CoreLocation
import Foundation
import ScanAnythingCore
import SwiftData
import UIKit

@MainActor
enum Identification {
    static func savePhoto(
        _ data: Data,
        settings: AppSettings,
        location: LocationProvider,
        context: ModelContext
    ) async throws -> SaveOutcome {
        let jpeg = ImageEncoding.jpeg(data, maxEdge: 1600, quality: 0.84)
        let hints = VisionInspector.inspect(data: jpeg)
        return try await save(jpeg: jpeg, hints: hints, preferAI: true, settings: settings, location: location, context: context)
    }

    static func saveImage(
        _ image: UIImage,
        settings: AppSettings,
        location: LocationProvider,
        context: ModelContext
    ) async throws -> SaveOutcome {
        guard let data = ImageEncoding.jpeg(image, maxEdge: 1600, quality: 0.84) else {
            throw CameraError.noImage
        }
        return try await savePhoto(data, settings: settings, location: location, context: context)
    }

    static func saveReading(
        hints: VisionHints,
        settings: AppSettings,
        location: LocationProvider,
        context: ModelContext
    ) async throws -> SaveOutcome {
        let analysis = OnDeviceSynthesis.analysis(from: hints)
        let image = labelCard(title: analysis.name, subtitle: analysis.summary)
        guard let jpeg = ImageEncoding.jpeg(image, maxEdge: 1200, quality: 0.86) else {
            throw CameraError.noImage
        }
        if settings.tagLocation { location.requestIfNeeded() }
        return try ScanLibrary.save(
            analysis: analysis,
            imageJPEG: jpeg,
            hints: hints,
            location: settings.tagLocation ? location.location : nil,
            locationLabel: settings.tagLocation ? location.label : "",
            usedOnDeviceOnly: true,
            notice: "Saved from on-device text or a barcode. Use Identify for a full AI read of the object.",
            context: context
        )
    }

    private static func save(
        jpeg: Data,
        hints: VisionHints,
        preferAI: Bool,
        settings: AppSettings,
        location: LocationProvider,
        context: ModelContext
    ) async throws -> SaveOutcome {
        if settings.tagLocation { location.requestIfNeeded() }
        let prepared = ImageEncoding.jpeg(jpeg, maxEdge: 1280, quality: 0.72)
        var analysis: DiscoveryAnalysis
        var onDevice = false
        var notice: String?

        if preferAI && settings.hasAPIKey {
            do {
                analysis = try await settings.makeAnalyzer().analyze(jpeg: prepared, hints: hints)
            } catch {
                if hints.hasSignal {
                    analysis = OnDeviceSynthesis.analysis(from: hints)
                    onDevice = true
                    notice = "AI could not finish, so this find was read on device. \(error.localizedDescription)"
                } else {
                    throw error
                }
            }
        } else {
            analysis = OnDeviceSynthesis.analysis(from: hints)
            onDevice = true
            notice = "Saved with on-device Vision. Add an API key in Profile for a full identification."
        }

        return try ScanLibrary.save(
            analysis: analysis,
            imageJPEG: jpeg,
            hints: hints,
            location: settings.tagLocation ? location.location : nil,
            locationLabel: settings.tagLocation ? location.label : "",
            usedOnDeviceOnly: onDevice,
            notice: notice,
            context: context
        )
    }

    private static func labelCard(title: String, subtitle: String) -> UIImage {
        let size = CGSize(width: 1200, height: 1500)
        let renderer = UIGraphicsImageRenderer(size: size)
        return renderer.image { context in
            UIColor(red: 0.07, green: 0.08, blue: 0.11, alpha: 1).setFill()
            context.fill(CGRect(origin: .zero, size: size))
            UIColor(red: 0.96, green: 0.65, blue: 0.14, alpha: 1).setStroke()
            let border = CGRect(x: 80, y: 80, width: 1040, height: 1340)
            context.cgContext.setLineWidth(6)
            context.cgContext.stroke(border)
            let style = NSMutableParagraphStyle()
            style.alignment = .center
            let titleRect = CGRect(x: 120, y: 560, width: 960, height: 220)
            (title as NSString).draw(in: titleRect, withAttributes: [
                .font: UIFont.systemFont(ofSize: 52, weight: .bold),
                .foregroundColor: UIColor.white,
                .paragraphStyle: style
            ])
            let subtitleRect = CGRect(x: 140, y: 800, width: 920, height: 280)
            (subtitle as NSString).draw(in: subtitleRect, withAttributes: [
                .font: UIFont.systemFont(ofSize: 28, weight: .regular),
                .foregroundColor: UIColor(white: 0.75, alpha: 1),
                .paragraphStyle: style
            ])
        }
    }
}
