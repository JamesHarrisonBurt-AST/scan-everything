import AVFoundation
import Combine
import CoreMedia
import CoreVideo
import ScanAnythingCore
import UIKit

enum CameraError: LocalizedError {
    case busy
    case noImage
    case unavailable

    var errorDescription: String? {
        switch self {
        case .busy: return "The camera is still taking the last photo."
        case .noImage: return "The camera did not return a photo."
        case .unavailable: return "This device does not have an available camera."
        }
    }
}

final class CameraModel: NSObject, ObservableObject, AVCapturePhotoCaptureDelegate, AVCaptureVideoDataOutputSampleBufferDelegate {
    let session = AVCaptureSession()
    @Published var isRunning = false
    @Published var permissionDenied = false
    @Published var unavailable = false
    @Published var torchAvailable = false
    @Published var torchOn = false
    @Published var liveHints = VisionHints.empty
    @Published var zoomFactor: CGFloat = 1

    private let sessionQueue = DispatchQueue(label: "ai.scananything.camera.session")
    private let visionQueue = DispatchQueue(label: "ai.scananything.camera.vision")
    private let photoOutput = AVCapturePhotoOutput()
    private let videoOutput = AVCaptureVideoDataOutput()
    private var configured = false
    private var device: AVCaptureDevice?
    private let photoLock = NSLock()
    private var photoHandler: ((Result<Data, Error>) -> Void)?
    private let visionLock = NSLock()
    private var lastVisionTime: CFTimeInterval = 0
    private var visionBusy = false

    func start() {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            sessionQueue.async { self.configureAndStart() }
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
                guard let self else { return }
                if granted {
                    self.sessionQueue.async { self.configureAndStart() }
                } else {
                    DispatchQueue.main.async { self.permissionDenied = true }
                }
            }
        default:
            permissionDenied = true
        }
    }

    func stop() {
        sessionQueue.async {
            guard self.session.isRunning else { return }
            self.session.stopRunning()
            DispatchQueue.main.async { self.isRunning = false }
        }
    }

    func capturePhoto() async throws -> Data {
        try await withCheckedThrowingContinuation { continuation in
            photoLock.lock()
            if photoHandler != nil {
                photoLock.unlock()
                continuation.resume(throwing: CameraError.busy)
                return
            }
            photoHandler = { result in
                continuation.resume(with: result)
            }
            photoLock.unlock()
            sessionQueue.async {
                guard self.configured, self.photoOutput.connection(with: .video) != nil else {
                    self.finishPhoto(.failure(CameraError.unavailable))
                    return
                }
                let settings = AVCapturePhotoSettings()
                if self.photoOutput.supportedFlashModes.contains(.off) {
                    settings.flashMode = .off
                }
                self.photoOutput.capturePhoto(with: settings, delegate: self)
            }
        }
    }

    private func finishPhoto(_ result: Result<Data, Error>) {
        photoLock.lock()
        let handler = photoHandler
        photoHandler = nil
        photoLock.unlock()
        handler?(result)
    }

    func toggleTorch() {
        sessionQueue.async {
            guard let device = self.device, device.hasTorch else { return }
            do {
                try device.lockForConfiguration()
                let nextOn = device.torchMode != .on
                device.torchMode = nextOn ? .on : .off
                device.unlockForConfiguration()
                DispatchQueue.main.async { self.torchOn = nextOn }
            } catch {
                return
            }
        }
    }

    func focus(at devicePoint: CGPoint) {
        sessionQueue.async {
            guard let device = self.device else { return }
            do {
                try device.lockForConfiguration()
                if device.isFocusPointOfInterestSupported {
                    device.focusPointOfInterest = devicePoint
                    device.focusMode = .autoFocus
                }
                if device.isExposurePointOfInterestSupported {
                    device.exposurePointOfInterest = devicePoint
                    device.exposureMode = .autoExpose
                }
                device.unlockForConfiguration()
            } catch {
                return
            }
        }
    }

    func setZoom(_ factor: CGFloat) {
        sessionQueue.async {
            guard let device = self.device else { return }
            let maxZoom = min(device.activeFormat.videoMaxZoomFactor, 6)
            let clamped = min(max(factor, 1), maxZoom)
            do {
                try device.lockForConfiguration()
                device.videoZoomFactor = clamped
                device.unlockForConfiguration()
                DispatchQueue.main.async { self.zoomFactor = clamped }
            } catch {
                return
            }
        }
    }

    private func configureAndStart() {
        if configured {
            if !session.isRunning { session.startRunning() }
            DispatchQueue.main.async { self.isRunning = self.session.isRunning }
            return
        }
        session.beginConfiguration()
        session.sessionPreset = .high
        guard let camera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back)
                ?? AVCaptureDevice.default(for: .video),
              let input = try? AVCaptureDeviceInput(device: camera),
              session.canAddInput(input) else {
            session.commitConfiguration()
            DispatchQueue.main.async { self.unavailable = true }
            return
        }
        session.addInput(input)
        device = camera
        videoOutput.alwaysDiscardsLateVideoFrames = true
        videoOutput.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA] as [String: Any]
        if session.canAddOutput(videoOutput) {
            session.addOutput(videoOutput)
            videoOutput.setSampleBufferDelegate(self, queue: visionQueue)
        }
        if session.canAddOutput(photoOutput) {
            session.addOutput(photoOutput)
        }
        rotate(videoOutput.connection(with: .video))
        rotate(photoOutput.connection(with: .video))
        session.commitConfiguration()
        configured = true
        session.startRunning()
        DispatchQueue.main.async {
            self.isRunning = true
            self.torchAvailable = camera.hasTorch
            self.unavailable = false
            self.permissionDenied = false
        }
    }

    private func rotate(_ connection: AVCaptureConnection?) {
        guard let connection, connection.isVideoRotationAngleSupported(90) else { return }
        connection.videoRotationAngle = 90
    }

    func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
        let result: Result<Data, Error>
        if let error {
            result = .failure(error)
        } else if let data = photo.fileDataRepresentation() {
            result = .success(data)
        } else {
            result = .failure(CameraError.noImage)
        }
        finishPhoto(result)
    }

    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        let now = CACurrentMediaTime()
        visionLock.lock()
        if visionBusy || now - lastVisionTime < 0.45 {
            visionLock.unlock()
            return
        }
        visionBusy = true
        lastVisionTime = now
        visionLock.unlock()

        let hints = VisionInspector.inspect(sampleBuffer: sampleBuffer)
        visionLock.lock()
        visionBusy = false
        visionLock.unlock()
        DispatchQueue.main.async { [weak self] in
            self?.liveHints = hints
        }
    }
}

struct CameraPreview: UIViewRepresentable {
    let session: AVCaptureSession
    var onTap: (CGPoint) -> Void
    var onPinch: (CGFloat, UIGestureRecognizer.State) -> Void

    func makeUIView(context: Context) -> PreviewView {
        let view = PreviewView()
        view.previewLayer.session = session
        view.previewLayer.videoGravity = .resizeAspectFill
        let tap = UITapGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.handleTap(_:)))
        view.addGestureRecognizer(tap)
        let pinch = UIPinchGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.handlePinch(_:)))
        view.addGestureRecognizer(pinch)
        return view
    }

    func updateUIView(_ uiView: PreviewView, context: Context) {
        context.coordinator.onTap = onTap
        context.coordinator.onPinch = onPinch
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(onTap: onTap, onPinch: onPinch)
    }

    final class Coordinator: NSObject {
        var onTap: (CGPoint) -> Void
        var onPinch: (CGFloat, UIGestureRecognizer.State) -> Void

        init(onTap: @escaping (CGPoint) -> Void, onPinch: @escaping (CGFloat, UIGestureRecognizer.State) -> Void) {
            self.onTap = onTap
            self.onPinch = onPinch
        }

        @objc func handleTap(_ gesture: UITapGestureRecognizer) {
            guard let view = gesture.view as? PreviewView else { return }
            let point = gesture.location(in: view)
            let devicePoint = view.previewLayer.captureDevicePointConverted(fromLayerPoint: point)
            onTap(devicePoint)
        }

        @objc func handlePinch(_ gesture: UIPinchGestureRecognizer) {
            onPinch(gesture.scale, gesture.state)
        }
    }
}

final class PreviewView: UIView {
    override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }
    var previewLayer: AVCaptureVideoPreviewLayer { layer as! AVCaptureVideoPreviewLayer }

    override func layoutSubviews() {
        super.layoutSubviews()
        if let connection = previewLayer.connection, connection.isVideoRotationAngleSupported(90) {
            connection.videoRotationAngle = 90
        }
    }
}
