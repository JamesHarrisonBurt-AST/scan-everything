import Foundation

public struct SeenBeforeHit: Equatable, Sendable, Identifiable {
    public enum Kind: String, Sendable, Equatable {
        case same
        case similar

        public var title: String {
            switch self {
            case .same: return "Same object"
            case .similar: return "Looks similar"
            }
        }
    }

    public var id: String
    public var distance: Float
    public var kind: Kind

    public init(id: String, distance: Float, kind: Kind) {
        self.id = id
        self.distance = distance
        self.kind = kind
    }
}

public enum SeenBefore {
    /// Vision feature-print distance. Identical frames sit near 0.
    /// A repeat of the same object usually lands under `sameCutoff`.
    /// A related object, different angle, lands under `similarCutoff`.
    public static let sameCutoff: Float = 0.45
    public static let similarCutoff: Float = 1.05

    public static func rank(distances: [(id: String, distance: Float)], limit: Int = 3) -> [SeenBeforeHit] {
        guard limit > 0 else { return [] }
        let hits = distances
            .filter { $0.distance.isFinite && $0.distance >= 0 && $0.distance <= similarCutoff }
            .sorted { lhs, rhs in
                if lhs.distance != rhs.distance { return lhs.distance < rhs.distance }
                return lhs.id < rhs.id
            }
            .prefix(limit)
        return hits.map { pair in
            SeenBeforeHit(
                id: pair.id,
                distance: pair.distance,
                kind: pair.distance <= sameCutoff ? .same : .similar
            )
        }
    }
}
