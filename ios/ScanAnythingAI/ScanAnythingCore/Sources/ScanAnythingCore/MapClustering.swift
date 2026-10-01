import Foundation

public struct GeoPoint: Equatable, Sendable, Hashable {
    public var latitude: Double
    public var longitude: Double

    public init(latitude: Double, longitude: Double) {
        self.latitude = latitude
        self.longitude = longitude
    }
}

public enum GeoDistance {
    /// Great-circle distance in meters. Accurate enough to group a walking journal.
    public static func meters(from start: GeoPoint, to end: GeoPoint) -> Double {
        let earth = 6_371_000.0
        let lat1 = start.latitude * .pi / 180
        let lat2 = end.latitude * .pi / 180
        let dLat = (end.latitude - start.latitude) * .pi / 180
        let dLon = (end.longitude - start.longitude) * .pi / 180
        let a = sin(dLat / 2) * sin(dLat / 2) + cos(lat1) * cos(lat2) * sin(dLon / 2) * sin(dLon / 2)
        let c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return earth * c
    }
}

public enum NearbyRadius: String, CaseIterable, Sendable, Equatable, Identifiable {
    case anywhere
    case oneKilometer
    case fiveKilometers
    case twentyFiveKilometers

    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .anywhere: return "Anywhere"
        case .oneKilometer: return "1 km"
        case .fiveKilometers: return "5 km"
        case .twentyFiveKilometers: return "25 km"
        }
    }

    /// Nil means no distance limit.
    public var meters: Double? {
        switch self {
        case .anywhere: return nil
        case .oneKilometer: return 1_000
        case .fiveKilometers: return 5_000
        case .twentyFiveKilometers: return 25_000
        }
    }
}

public struct MapPin: Equatable, Sendable, Identifiable {
    public var id: String
    public var coordinate: GeoPoint

    public init(id: String, coordinate: GeoPoint) {
        self.id = id
        self.coordinate = coordinate
    }
}

public struct MapCluster: Equatable, Sendable, Identifiable {
    public var id: String
    public var coordinate: GeoPoint
    public var memberIDs: [String]

    public var count: Int { memberIDs.count }
    public var isGroup: Bool { memberIDs.count > 1 }

    public init(id: String, coordinate: GeoPoint, memberIDs: [String]) {
        self.id = id
        self.coordinate = coordinate
        self.memberIDs = memberIDs
    }
}

public enum NearbyPins {
    /// Pins inside the radius of `origin`. Anywhere returns every pin.
    /// A limited radius with no origin returns nothing, because "near me" has no center yet.
    public static func filter(_ pins: [MapPin], around origin: GeoPoint?, radius: NearbyRadius) -> [MapPin] {
        guard let meters = radius.meters else { return pins }
        guard let origin else { return [] }
        return pins.filter { GeoDistance.meters(from: origin, to: $0.coordinate) <= meters }
    }
}

public enum MapClustering {
    /// Pins within this many meters of one another share a neighborhood pin.
    public static let neighborhoodMeters: Double = 350

    /// Single-link clusters: a pin joins a group when it is within `radiusMeters` of any member.
    /// The pin sits at the mean latitude and longitude. Member ids are sorted so the result is stable.
    public static func cluster(_ pins: [MapPin], radiusMeters: Double = neighborhoodMeters) -> [MapCluster] {
        guard radiusMeters > 0 else {
            return pins.map { pin in
                MapCluster(id: pin.id, coordinate: pin.coordinate, memberIDs: [pin.id])
            }
        }

        var remaining = pins
        var clusters: [MapCluster] = []
        while !remaining.isEmpty {
            var members = [remaining.removeFirst()]
            var grew = true
            while grew {
                grew = false
                var index = 0
                while index < remaining.count {
                    let pin = remaining[index]
                    let near = members.contains { member in
                        GeoDistance.meters(from: member.coordinate, to: pin.coordinate) <= radiusMeters
                    }
                    if near {
                        members.append(remaining.remove(at: index))
                        grew = true
                    } else {
                        index += 1
                    }
                }
            }
            let latitude = members.map(\.coordinate.latitude).reduce(0, +) / Double(members.count)
            let longitude = members.map(\.coordinate.longitude).reduce(0, +) / Double(members.count)
            let ids = members.map(\.id).sorted()
            clusters.append(MapCluster(
                id: ids.joined(separator: "+"),
                coordinate: GeoPoint(latitude: latitude, longitude: longitude),
                memberIDs: ids
            ))
        }
        return clusters.sorted { lhs, rhs in
            if lhs.count != rhs.count { return lhs.count > rhs.count }
            return lhs.id < rhs.id
        }
    }
}
