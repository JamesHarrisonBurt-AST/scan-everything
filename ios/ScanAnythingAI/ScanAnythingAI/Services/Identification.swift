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
        let prepared = try await prepare(jpegForAI: nil, hints: hints, preferAI: false, settings: settings)
        let rendered = await journalImage(for: prepared)
        guard !rendered.data.isEmpty else { throw CameraError.noImage }
        var notice = prepared.notice
        if let facts = prepared.facts {
            notice = ProductAnalysis.notice(for: facts, picture: rendered.picture)
        }
        if settings.tagLocation { location.requestIfNeeded() }
        return try ScanLibrary.save(
            analysis: prepared.analysis,
            imageJPEG: rendered.data,
            hints: hints,
            location: settings.tagLocation ? location.location : nil,
            locationLabel: settings.tagLocation ? location.label : "",
            source: prepared.source,
            notice: notice,
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
        let prepared = try await prepare(jpegForAI: jpeg, hints: hints, preferAI: preferAI, settings: settings)
        return try ScanLibrary.save(
            analysis: prepared.analysis,
            imageJPEG: jpeg,
            hints: hints,
            location: settings.tagLocation ? location.location : nil,
            locationLabel: settings.tagLocation ? location.label : "",
            source: prepared.source,
            notice: prepared.notice,
            context: context
        )
    }

    private struct Prepared {
        var analysis: DiscoveryAnalysis
        var source: String
        var notice: String?
        var facts: ProductFacts?
    }

    /// Product catalogs run before the vision model. A hit names the packaged
    /// item and skips the AI call. A miss or an unreachable catalog falls
    /// through to the configured model, then to on-device text.
    private static func prepare(
        jpegForAI: Data?,
        hints: VisionHints,
        preferAI: Bool,
        settings: AppSettings
    ) async throws -> Prepared {
        let catalog = await ProductLookup.resolve(hints: hints, enabled: settings.lookupBarcodes)
        if case .hit(let facts) = catalog {
            let picture: ProductAnalysis.Picture = jpegForAI == nil ? .codeOnly : .userPhoto
            return Prepared(
                analysis: ProductAnalysis.analysis(from: facts),
                source: "catalog",
                notice: ProductAnalysis.notice(for: facts, picture: picture),
                facts: facts
            )
        }

        let preparedJPEG = jpegForAI.map { ImageEncoding.jpeg($0, maxEdge: 1280, quality: 0.72) }
        if preferAI, let preparedJPEG, settings.hasAPIKey {
            do {
                let analysis = try await settings.makeAnalyzer().analyze(jpeg: preparedJPEG, hints: hints)
                return Prepared(
                    analysis: analysis,
                    source: "ai",
                    notice: catalogNotice(catalog, usedAI: true),
                    facts: nil
                )
            } catch {
                if hints.hasSignal {
                    return onDevice(hints: hints, catalog: catalog, aiFailure: error.localizedDescription)
                }
                throw error
            }
        }
        return onDevice(hints: hints, catalog: catalog, aiFailure: nil)
    }

    private static func onDevice(hints: VisionHints, catalog: CatalogOutcome, aiFailure: String?) -> Prepared {
        let lead: String
        switch catalog {
        case .notListed:
            lead = "No public product listing for this barcode."
        case .unreachable:
            lead = "Product catalogs could not be reached."
        case .skipped, .hit:
            lead = ""
        }
        let notice: String
        if let aiFailure {
            let prefix = lead.isEmpty ? "" : lead + " "
            notice = prefix + "AI could not finish, so this find was read on device. \(aiFailure)"
        } else if !lead.isEmpty {
            notice = lead + " Saved from what the camera read on this iPhone. Add an API key in Profile for a fuller read."
        } else {
            notice = "Saved with on-device Vision. Add an API key in Profile for a full identification."
        }
        return Prepared(
            analysis: OnDeviceSynthesis.analysis(from: hints),
            source: "onDevice",
            notice: notice,
            facts: nil
        )
    }

    private static func catalogNotice(_ catalog: CatalogOutcome, usedAI: Bool) -> String? {
        switch catalog {
        case .skipped, .hit:
            return nil
        case .notListed:
            return ProductAnalysis.notListedNotice(usedAI: usedAI)
        case .unreachable:
            return ProductAnalysis.unreachableNotice(usedAI: usedAI)
        }
    }

    private static func journalImage(for prepared: Prepared) async -> (data: Data, picture: ProductAnalysis.Picture) {
        if let facts = prepared.facts,
           let downloaded = await ProductLookup.journalImage(from: facts.imageURL),
           let image = UIImage(data: downloaded),
           let jpeg = ImageEncoding.jpeg(image, maxEdge: 1200, quality: 0.86),
           !jpeg.isEmpty {
            return (jpeg, .catalogPhoto)
        }
        let card = labelCard(title: prepared.analysis.name, subtitle: prepared.analysis.summary)
        let jpeg = ImageEncoding.jpeg(card, maxEdge: 1200, quality: 0.86) ?? Data()
        return (jpeg, .codeOnly)
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
