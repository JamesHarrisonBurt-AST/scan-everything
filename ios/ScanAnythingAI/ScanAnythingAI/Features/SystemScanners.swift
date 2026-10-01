import ScanAnythingCore
import SwiftUI
import UIKit
import VisionKit

struct SystemScanners {
    static var liveDataScannerAvailable: Bool {
        DataScannerViewController.isSupported && DataScannerViewController.isAvailable
    }
}

struct LiveDataScanner: UIViewControllerRepresentable {
    var onBarcode: (String, String) -> Void
    var onText: (String) -> Void

    func makeUIViewController(context: Context) -> DataScannerViewController {
        let scanner = DataScannerViewController(
            recognizedDataTypes: [.barcode(), .text()],
            qualityLevel: .balanced,
            recognizesMultipleItems: true,
            isHighFrameRateTrackingEnabled: false,
            isPinchToZoomEnabled: true,
            isGuidanceEnabled: true,
            isHighlightingEnabled: true
        )
        scanner.delegate = context.coordinator
        return scanner
    }

    func updateUIViewController(_ scanner: DataScannerViewController, context: Context) {
        context.coordinator.onBarcode = onBarcode
        context.coordinator.onText = onText
        guard DataScannerViewController.isSupported, DataScannerViewController.isAvailable, !scanner.isScanning else { return }
        try? scanner.startScanning()
    }

    static func dismantleUIViewController(_ scanner: DataScannerViewController, coordinator: Coordinator) {
        scanner.stopScanning()
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(onBarcode: onBarcode, onText: onText)
    }

    final class Coordinator: NSObject, DataScannerViewControllerDelegate {
        var onBarcode: (String, String) -> Void
        var onText: (String) -> Void

        init(onBarcode: @escaping (String, String) -> Void, onText: @escaping (String) -> Void) {
            self.onBarcode = onBarcode
            self.onText = onText
        }

        func dataScanner(_ dataScanner: DataScannerViewController, didTapOn item: RecognizedItem) {
            switch item {
            case .barcode(let barcode):
                let payload = barcode.payloadStringValue ?? ""
                guard !payload.isEmpty else { return }
                onBarcode(payload, barcode.observation.symbology.rawValue)
            case .text(let text):
                let transcript = text.transcript.trimmingCharacters(in: .whitespacesAndNewlines)
                guard !transcript.isEmpty else { return }
                onText(transcript)
            @unknown default:
                break
            }
        }
    }
}

struct DocumentScanner: UIViewControllerRepresentable {
    var onScan: ([UIImage]) -> Void
    var onCancel: () -> Void

    func makeUIViewController(context: Context) -> DocumentHostController {
        let host = DocumentHostController()
        host.onScan = onScan
        host.onCancel = onCancel
        return host
    }

    func updateUIViewController(_ uiViewController: DocumentHostController, context: Context) {
        uiViewController.onScan = onScan
        uiViewController.onCancel = onCancel
    }

    final class DocumentHostController: UIViewController, VNDocumentCameraViewControllerDelegate {
        var onScan: ([UIImage]) -> Void = { _ in }
        var onCancel: () -> Void = {}
        private var presentedScanner = false

        override func viewDidAppear(_ animated: Bool) {
            super.viewDidAppear(animated)
            guard !presentedScanner, presentedViewController == nil else { return }
            presentedScanner = true
            let scanner = VNDocumentCameraViewController()
            scanner.delegate = self
            present(scanner, animated: true)
        }

        func documentCameraViewController(_ controller: VNDocumentCameraViewController, didFinishWith scan: VNDocumentCameraScan) {
            var images: [UIImage] = []
            for index in 0..<scan.pageCount {
                images.append(scan.imageOfPage(at: index))
            }
            controller.dismiss(animated: true) {
                self.onScan(images)
            }
        }

        func documentCameraViewControllerDidCancel(_ controller: VNDocumentCameraViewController) {
            controller.dismiss(animated: true) {
                self.onCancel()
            }
        }

        func documentCameraViewController(_ controller: VNDocumentCameraViewController, didFailWithError error: Error) {
            controller.dismiss(animated: true) {
                self.onCancel()
            }
        }
    }
}
