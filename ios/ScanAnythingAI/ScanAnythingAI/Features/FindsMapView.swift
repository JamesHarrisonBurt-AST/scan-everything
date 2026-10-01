import MapKit
import ScanAnythingCore
import SwiftUI

struct FindsMap: View {
    let discoveries: [DiscoveryRecord]
    @StateObject private var location = LocationProvider()
    @State private var radius: NearbyRadius = .anywhere
    @State private var selectedID: String?
    @State private var position: MapCameraPosition = .automatic

    private var located: [DiscoveryRecord] {
        discoveries.filter { $0.latitude != nil && $0.longitude != nil }
    }

    private var origin: GeoPoint? {
        guard let location = location.location else { return nil }
        return GeoPoint(latitude: location.coordinate.latitude, longitude: location.coordinate.longitude)
    }

    private var visiblePins: [MapPin] {
        let pins = located.map { discovery in
            MapPin(
                id: discovery.id.uuidString,
                coordinate: GeoPoint(latitude: discovery.latitude ?? 0, longitude: discovery.longitude ?? 0)
            )
        }
        return NearbyPins.filter(pins, around: origin, radius: radius)
    }

    private var clusters: [MapCluster] {
        MapClustering.cluster(visiblePins)
    }

    private var selected: MapCluster? {
        clusters.first { $0.id == selectedID }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            radiusRow
            map
            if let selected {
                clusterList(selected)
            }
            if radius != .anywhere && origin == nil {
                Text(location.authorized ? "Finding where you are…" : "Allow location to use Near me. Anywhere still shows every tagged find.")
                    .font(.caption)
                    .foregroundStyle(Theme.muted)
            }
        }
        .onAppear {
            if radius != .anywhere { location.requestIfNeeded() }
            fit()
        }
        .onChange(of: location.location?.coordinate.latitude) { old, _ in
            if old == nil { fit() }
        }
        .onChange(of: radius) { _, newRadius in
            if newRadius != .anywhere { location.requestIfNeeded() }
            selectedID = nil
            fit()
        }
        .onChange(of: clusters.map(\.id)) { _, _ in
            fit()
        }
    }

    private var radiusRow: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(NearbyRadius.allCases) { item in
                    Button {
                        radius = item
                    } label: {
                        Text(item.title)
                            .font(.system(.caption, design: .rounded, weight: .bold))
                            .padding(.horizontal, 12)
                            .frame(minHeight: 34)
                            .foregroundStyle(radius == item ? Color(red: 0.1, green: 0.07, blue: 0.04) : Theme.ink)
                            .background(radius == item ? AnyShapeStyle(Theme.amberGradient) : AnyShapeStyle(Theme.field), in: Capsule())
                    }
                    .buttonStyle(.plain)
                    .accessibilityAddTraits(radius == item ? .isSelected : [])
                }
            }
        }
        .accessibilityLabel("Distance")
    }

    private var map: some View {
        Map(position: $position) {
            ForEach(clusters) { cluster in
                Annotation(cluster.isGroup ? "\(cluster.count) finds" : "Find", coordinate: coordinate(cluster.coordinate)) {
                    Button {
                        selectedID = selectedID == cluster.id ? nil : cluster.id
                        Haptics.selection()
                    } label: {
                        ClusterPin(count: cluster.count, selected: selectedID == cluster.id)
                    }
                    .buttonStyle(.plain)
                }
            }
            if let origin, radius != .anywhere {
                Annotation("You", coordinate: coordinate(origin)) {
                    Circle()
                        .fill(Theme.teal)
                        .frame(width: 14, height: 14)
                        .overlay(Circle().stroke(.white, lineWidth: 2))
                        .shadow(color: Theme.teal.opacity(0.8), radius: 6)
                        .accessibilityLabel("Your location")
                }
            }
        }
        .mapStyle(.standard(elevation: .realistic, pointsOfInterest: .excludingAll))
        .frame(minHeight: 420)
        .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .strokeBorder(Theme.amber.opacity(0.35), lineWidth: 1)
        )
        .shadow(color: Theme.amber.opacity(0.2), radius: 18, y: 8)
        .accessibilityLabel("Map of discoveries with a saved location")
        .overlay {
            if visiblePins.isEmpty {
                Text(emptyMessage)
                    .font(.subheadline)
                    .foregroundStyle(Theme.ink)
                    .multilineTextAlignment(.center)
                    .padding(12)
                    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .padding(20)
            }
        }
    }

    private var emptyMessage: String {
        if located.isEmpty {
            return "No locations yet. Turn on location tags in Profile, then scan again."
        }
        return "Nothing tagged inside \(radius.title.lowercased()). Try a wider distance."
    }

    private func clusterList(_ cluster: MapCluster) -> some View {
        let members = cluster.memberIDs.compactMap { id in
            discoveries.first { $0.id.uuidString == id }
        }
        return VStack(alignment: .leading, spacing: 8) {
            Text(cluster.isGroup ? "\(cluster.count) finds in this neighborhood" : "One find here")
                .font(.system(.caption, design: .rounded, weight: .bold))
                .foregroundStyle(Theme.muted)
            ForEach(members) { discovery in
                NavigationLink(value: discovery.id) {
                    HStack(spacing: 10) {
                        DiscoveryThumbnail(filename: discovery.imageFilename)
                            .frame(width: 44, height: 44)
                            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                        VStack(alignment: .leading, spacing: 2) {
                            Text(discovery.title)
                                .font(.system(.subheadline, design: .serif, weight: .semibold))
                                .foregroundStyle(Theme.ink)
                                .lineLimit(1)
                            Text(discovery.locationLabel.isEmpty ? DiscoveryCategory.displayName(for: discovery.category) : discovery.locationLabel)
                                .font(.caption)
                                .foregroundStyle(Theme.muted)
                                .lineLimit(1)
                        }
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(Theme.muted)
                    }
                    .padding(10)
                    .glassPanel(radius: 16)
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func coordinate(_ point: GeoPoint) -> CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: point.latitude, longitude: point.longitude)
    }

    private func fit() {
        guard let region = region(for: clusters, origin: radius == .anywhere ? nil : origin) else { return }
        position = .region(region)
    }

    private func region(for clusters: [MapCluster], origin: GeoPoint?) -> MKCoordinateRegion? {
        var points = clusters.map(\.coordinate)
        if let origin { points.append(origin) }
        guard let first = points.first else { return nil }
        var minLat = first.latitude
        var maxLat = first.latitude
        var minLon = first.longitude
        var maxLon = first.longitude
        for point in points {
            minLat = min(minLat, point.latitude)
            maxLat = max(maxLat, point.latitude)
            minLon = min(minLon, point.longitude)
            maxLon = max(maxLon, point.longitude)
        }
        let center = CLLocationCoordinate2D(latitude: (minLat + maxLat) / 2, longitude: (minLon + maxLon) / 2)
        let span = MKCoordinateSpan(
            latitudeDelta: max(0.02, (maxLat - minLat) * 1.8),
            longitudeDelta: max(0.02, (maxLon - minLon) * 1.8)
        )
        return MKCoordinateRegion(center: center, span: span)
    }
}

private struct ClusterPin: View {
    let count: Int
    var selected: Bool

    var body: some View {
        Text(count > 1 ? "\(count)" : "")
            .font(.system(.caption, design: .rounded, weight: .heavy))
            .foregroundStyle(Color(red: 0.1, green: 0.07, blue: 0.04))
            .frame(width: count > 1 ? 42 : 18, height: count > 1 ? 42 : 18)
            .background(Theme.amberGradient, in: Circle())
            .overlay(Circle().strokeBorder(Color.white.opacity(selected ? 1 : 0.7), lineWidth: selected ? 3 : 2))
            .shadow(color: Theme.amber.opacity(0.85), radius: selected ? 12 : 6)
            .accessibilityLabel(count > 1 ? "\(count) finds clustered here" : "One find")
    }
}
