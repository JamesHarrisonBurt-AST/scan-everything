import ScanAnythingCore
import SwiftData
import UIKit
import Vision

struct PriorSighting: Equatable, Identifiable, Sendable {
    var id: UUID
    var title: String
    var kind: SeenBeforeHit.Kind
}

enum FeaturePrints {
    static func archive(from jpeg: Data) -> Data? {
        guard let image = UIImage(data: jpeg)?.cgImage else { return nil }
        let request = VNGenerateImageFeaturePrintRequest()
        let handler = VNImageRequestHandler(cgImage: image, options: [:])
        do {
            try handler.perform([request])
        } catch {
            return nil
        }
        guard let observation = request.results?.first as? VNFeaturePrintObservation else { return nil }
        return try? NSKeyedArchiver.archivedData(withRootObject: observation, requiringSecureCoding: true)
    }

    static func distance(from query: Data, to stored: Data) -> Float? {
        guard
            let left = try? NSKeyedUnarchiver.unarchivedObject(ofClass: VNFeaturePrintObservation.self, from: query),
            let right = try? NSKeyedUnarchiver.unarchivedObject(ofClass: VNFeaturePrintObservation.self, from: stored)
        else { return nil }
        var distance: Float = 0
        do {
            try left.computeDistance(&distance, to: right)
            return distance
        } catch {
            return nil
        }
    }

    static func matches(query: Data?, records: [DiscoveryRecord]) -> [PriorSighting] {
        guard let query, !query.isEmpty else { return [] }
        var pairs: [(id: String, distance: Float)] = []
        var lookup: [String: DiscoveryRecord] = [:]
        for record in records {
            guard let stored = record.featurePrint, !stored.isEmpty, let distance = distance(from: query, to: stored) else { continue }
            let key = record.id.uuidString
            pairs.append((id: key, distance: distance))
            lookup[key] = record
        }
        return SeenBefore.rank(distances: pairs).compactMap { hit in
            guard let record = lookup[hit.id] else { return nil }
            return PriorSighting(id: record.id, title: record.title, kind: hit.kind)
        }
    }

    /// Fills missing prints from photos already on disk so older finds can be matched.
    static func backfill(_ records: [DiscoveryRecord], context: ModelContext) {
        var changed = false
        for record in records where record.featurePrint?.isEmpty != false {
            guard let image = ImageStore.load(record.imageFilename),
                  let jpeg = image.jpegData(compressionQuality: 0.82),
                  let printData = archive(from: jpeg) else { continue }
            record.featurePrint = printData
            changed = true
        }
        if changed { try? context.save() }
    }
}
