import CoreLocation
import Foundation

@MainActor
final class LocationProvider: NSObject, ObservableObject, CLLocationManagerDelegate {
    @Published var location: CLLocation?
    @Published var label: String = ""
    @Published var authorized = false

    private let manager = CLLocationManager()
    private let geocoder = CLGeocoder()

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
    }

    func requestIfNeeded() {
        switch manager.authorizationStatus {
        case .notDetermined:
            manager.requestWhenInUseAuthorization()
        case .authorizedAlways, .authorizedWhenInUse:
            authorized = true
            manager.requestLocation()
        default:
            authorized = false
        }
    }

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        let allowed = status == .authorizedAlways || status == .authorizedWhenInUse
        Task { @MainActor in
            self.authorized = allowed
            if allowed { self.manager.requestLocation() }
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let latest = locations.last else { return }
        Task { @MainActor in
            self.location = latest
            self.geocoder.cancelGeocode()
            self.geocoder.reverseGeocodeLocation(latest) { [weak self] placemarks, _ in
                let place = placemarks?.first
                let parts = [place?.locality, place?.administrativeArea].compactMap { $0 }
                Task { @MainActor in
                    self?.label = parts.joined(separator: ", ")
                }
            }
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        // A missing fix should not block the scan. The discovery is still saved.
    }
}
