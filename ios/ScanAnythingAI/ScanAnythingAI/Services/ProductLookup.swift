import Foundation
import ScanAnythingCore

enum CatalogOutcome: Equatable {
    case skipped
    case hit(ProductFacts)
    case notListed
    case unreachable
}

/// Looks up a retail barcode on Open Food Facts, then Open Beauty Facts, then
/// Open Products Facts. Called before any vision-model request.
@MainActor
enum ProductLookup {
    private static var cache: [String: ProductFacts] = [:]

    static func resolve(hints: VisionHints, enabled: Bool) async -> CatalogOutcome {
        guard enabled else { return .skipped }
        guard let code = BarcodeIdentity.gtin(from: hints.barcodePayload ?? "", symbology: hints.barcodeSymbology) else {
            return .skipped
        }
        if let cached = cache[code] { return .hit(cached) }

        var notFound = 0
        var failures = 0
        for catalog in ProductCatalog.allCases {
            guard let url = catalog.productURL(code: code) else {
                failures += 1
                continue
            }
            switch await fetch(url) {
            case .found(let data):
                if let facts = ProductFactsJSON.decode(data, barcode: code, source: catalog.rawValue) {
                    cache[code] = facts
                    return .hit(facts)
                }
                notFound += 1
            case .notFound:
                notFound += 1
            case .failed:
                failures += 1
            }
        }
        if notFound > 0 && failures == 0 { return .notListed }
        return .unreachable
    }

    /// Downloads a catalog front photo when the journal has no camera still.
    static func journalImage(from imageURL: String) async -> Data? {
        guard let url = URL(string: imageURL), isCatalogImage(url) else { return nil }
        var request = URLRequest(url: url)
        request.timeoutInterval = 8
        request.setValue(ProductCatalog.userAgent, forHTTPHeaderField: "User-Agent")
        do {
            let (data, response) = try await session.data(for: request)
            guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else { return nil }
            guard data.count > 32, data.count < 2_500_000 else { return nil }
            return data
        } catch {
            return nil
        }
    }

    static func isCatalogImage(_ url: URL) -> Bool {
        guard url.scheme?.lowercased() == "https", let host = url.host?.lowercased() else { return false }
        let allowed = [
            "images.openfoodfacts.org",
            "images.openbeautyfacts.org",
            "images.openproductsfacts.org",
            "static.openfoodfacts.org"
        ]
        return allowed.contains(host)
    }

    private enum FetchResult {
        case found(Data)
        case notFound
        case failed
    }

    private static let session: URLSession = {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = 8
        configuration.timeoutIntervalForResource = 12
        configuration.waitsForConnectivity = false
        return URLSession(configuration: configuration)
    }()

    private static func fetch(_ url: URL) async -> FetchResult {
        var request = URLRequest(url: url)
        request.timeoutInterval = 8
        request.setValue(ProductCatalog.userAgent, forHTTPHeaderField: "User-Agent")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        do {
            let (data, response) = try await session.data(for: request)
            guard let http = response as? HTTPURLResponse else { return .failed }
            if http.statusCode == 404 { return .notFound }
            guard (200...299).contains(http.statusCode), data.count < 1_000_000 else { return .failed }
            return .found(data)
        } catch {
            return .failed
        }
    }
}
