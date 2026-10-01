import UIKit

enum ImageStore {
    static var directory: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        let dir = base.appendingPathComponent("Discoveries", isDirectory: true)
        if !FileManager.default.fileExists(atPath: dir.path) {
            try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        }
        return dir
    }

    @discardableResult
    static func saveJPEG(_ data: Data, id: UUID) throws -> String {
        let name = "\(id.uuidString).jpg"
        try data.write(to: directory.appendingPathComponent(name), options: .atomic)
        return name
    }

    static func url(for filename: String) -> URL {
        directory.appendingPathComponent(filename)
    }

    static func load(_ filename: String) -> UIImage? {
        guard !filename.isEmpty else { return nil }
        guard let data = try? Data(contentsOf: url(for: filename)) else { return nil }
        return UIImage(data: data)
    }

    static func delete(_ filename: String) {
        guard !filename.isEmpty else { return }
        try? FileManager.default.removeItem(at: url(for: filename))
    }

    static func deleteAll() {
        try? FileManager.default.removeItem(at: directory)
    }
}

enum ImageEncoding {
    static func jpeg(_ data: Data, maxEdge: CGFloat, quality: CGFloat) -> Data {
        guard let image = UIImage(data: data) else { return data }
        return jpeg(image, maxEdge: maxEdge, quality: quality) ?? data
    }

    static func jpeg(_ image: UIImage, maxEdge: CGFloat, quality: CGFloat) -> Data? {
        let size = image.size
        let longest = max(size.width, size.height)
        guard longest > 0 else { return image.jpegData(compressionQuality: quality) }
        let scale = min(1, maxEdge / longest)
        let newSize = CGSize(width: max(1, floor(size.width * scale)), height: max(1, floor(size.height * scale)))
        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 1
        let renderer = UIGraphicsImageRenderer(size: newSize, format: format)
        let rendered = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: newSize))
        }
        return rendered.jpegData(compressionQuality: quality)
    }
}

extension UIImage {
    var visionOrientation: CGImagePropertyOrientation {
        switch imageOrientation {
        case .up: return .up
        case .down: return .down
        case .left: return .left
        case .right: return .right
        case .upMirrored: return .upMirrored
        case .downMirrored: return .downMirrored
        case .leftMirrored: return .leftMirrored
        case .rightMirrored: return .rightMirrored
        @unknown default: return .up
        }
    }
}
