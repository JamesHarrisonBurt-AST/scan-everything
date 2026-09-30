import PhotosUI
import ScanAnythingCore
import SwiftData
import SwiftUI
import UniformTypeIdentifiers

enum CaptureMode: String, CaseIterable, Identifiable {
    case identify = "Identify"
    case live = "Live"
    var id: String { rawValue }
}

struct ScannerView: View {
    var onOpen: (UUID) -> Void
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var context
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(AppSettings.self) private var settings
    @StateObject private var camera = CameraModel()
    @StateObject private var location = LocationProvider()
    @State private var mode: CaptureMode = .identify
    @State private var photoItem: PhotosPickerItem?
    @State private var showDocuments = false
    @State private var analyzing = false
    @State private var outcome: SaveOutcome?
    @State private var failure: String?
    @State private var flash = false
    @State private var zoomBaseline: CGFloat = 1
    @State private var status = "Point at any object"
    @State private var shareRoute: DiscoveryRoute?
    @Query private var discoveries: [DiscoveryRecord]

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            preview
            if flash {
                Color.white.opacity(0.85).ignoresSafeArea()
            }
            chrome
            if analyzing { analyzingOverlay }
            if let outcome { resultOverlay(outcome) }
            if let failure { failureOverlay(failure) }
        }
        .preferredColorScheme(.dark)
        .onAppear {
            camera.start()
            if settings.tagLocation { location.requestIfNeeded() }
        }
        .onDisappear { camera.stop() }
        .onChange(of: mode) { _, newMode in
            if newMode == .live && SystemScanners.liveDataScannerAvailable {
                camera.stop()
            } else {
                camera.start()
            }
        }
        .onChange(of: photoItem) { _, item in
            guard let item else { return }
            Task { await loadPhoto(item) }
        }
        .sheet(item: $shareRoute) { route in
            if let discovery = discoveries.first(where: { $0.id == route.id }) {
                ShareCardSheet(discovery: discovery)
            } else {
                NavigationStack {
                    VStack(spacing: 12) {
                        Text("This find is not in the journal yet.")
                            .font(.system(.headline, design: .serif))
                            .foregroundStyle(Theme.ink)
                        Text("Open it from Finds once it has finished saving.")
                            .font(.subheadline)
                            .foregroundStyle(Theme.muted)
                            .multilineTextAlignment(.center)
                    }
                    .padding(24)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Theme.canvas)
                    .navigationTitle("Share card")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Close") { shareRoute = nil }
                        }
                    }
                }
                .presentationDetents([.medium])
            }
        }
        .fullScreenCover(isPresented: $showDocuments) {
            DocumentScanner { images in
                showDocuments = false
                Task { await identify(images: images) }
            } onCancel: {
                showDocuments = false
            }
            .ignoresSafeArea()
        }
    }

    @ViewBuilder
    private var preview: some View {
        if mode == .live && SystemScanners.liveDataScannerAvailable {
            LiveDataScanner { payload, symbology in
                Task { await saveReading(VisionHints(barcodePayload: payload, barcodeSymbology: symbology)) }
            } onText: { text in
                Task { await saveReading(VisionHints(textLines: [text])) }
            }
            .ignoresSafeArea()
        } else if camera.permissionDenied || camera.unavailable {
            permission
        } else {
            CameraPreview(session: camera.session, onTap: { point in
                camera.focus(at: point)
                Haptics.selection()
            }, onPinch: { scale, state in
                if state == .began { zoomBaseline = camera.zoomFactor }
                if state == .changed { camera.setZoom(zoomBaseline * scale) }
            })
            .ignoresSafeArea()
            reticle
        }
    }

    private var reticle: some View {
        ZStack {
            Reticle()
                .stroke(Color(red: 0.98, green: 0.75, blue: 0.38).opacity(0.85), style: StrokeStyle(lineWidth: 3, lineCap: .round))
                .frame(width: 210, height: 210)
            if !reduceMotion && mode == .identify && outcome == nil && !analyzing {
                ScanBeam()
                    .frame(width: 180, height: 180)
            }
        }
        .allowsHitTesting(false)
        .opacity(mode == .identify && outcome == nil && failure == nil ? 1 : 0.25)
        .accessibilityHidden(true)
    }

    private var chrome: some View {
        VStack {
            topBar
            Spacer()
            if mode == .live && !SystemScanners.liveDataScannerAvailable {
                liveChips
            }
            Text(hint)
                .font(.system(.footnote, design: .rounded))
                .foregroundStyle(.white.opacity(0.78))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 28)
                .padding(.bottom, 14)
            controls
        }
        .opacity(outcome == nil && failure == nil && !analyzing ? 1 : 0)
        .allowsHitTesting(outcome == nil && failure == nil && !analyzing)
    }

    private var topBar: some View {
        HStack {
            Button { dismiss() } label: {
                Image(systemName: "xmark")
                    .font(.headline)
                    .foregroundStyle(.white)
                    .frame(width: 44, height: 44)
                    .background(.black.opacity(0.35), in: Circle())
            }
            .accessibilityLabel("Close scanner")
            Spacer()
            Picker("Mode", selection: $mode) {
                ForEach(CaptureMode.allCases) { item in
                    Text(item.rawValue).tag(item)
                }
            }
            .pickerStyle(.segmented)
            .frame(maxWidth: 210)
            .accessibilityLabel("Scanner mode")
            Spacer()
            Button { showDocuments = true } label: {
                Image(systemName: "doc.viewfinder")
                    .font(.headline)
                    .foregroundStyle(.white)
                    .frame(width: 44, height: 44)
                    .background(.black.opacity(0.35), in: Circle())
            }
            .accessibilityLabel("Scan a document")
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
    }

    private var liveChips: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let code = camera.liveHints.barcodePayload, !code.isEmpty {
                Button {
                    Task { await saveReading(camera.liveHints) }
                } label: {
                    Label(code, systemImage: "barcode.viewfinder")
                        .font(.system(.caption, design: .monospaced, weight: .semibold))
                        .lineLimit(1)
                        .padding(.horizontal, 12)
                        .frame(minHeight: 36)
                        .background(.ultraThinMaterial, in: Capsule())
                }
                .accessibilityLabel("Save barcode \(code)")
            }
            if !camera.liveHints.textLines.isEmpty {
                Text(camera.liveHints.textLines.prefix(3).joined(separator: " · "))
                    .font(.caption)
                    .foregroundStyle(.white)
                    .lineLimit(2)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(.black.opacity(0.45), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
        }
        .padding(.horizontal, 20)
        .padding(.bottom, 8)
    }

    private var controls: some View {
        HStack {
            PhotosPicker(selection: $photoItem, matching: .images) {
                Image(systemName: "photo")
                    .font(.title3)
                    .foregroundStyle(.white)
                    .frame(width: 52, height: 52)
                    .background(.black.opacity(0.35), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
            .accessibilityLabel("Choose a photo")
            Spacer()
            Button {
                Task { await capture() }
            } label: {
                ZStack {
                    Circle().stroke(.white, lineWidth: 4).frame(width: 78, height: 78)
                    Circle().fill(Color(red: 0.98, green: 0.75, blue: 0.38)).frame(width: 62, height: 62)
                }
            }
            .disabled(!camera.isRunning && mode != .live)
            .accessibilityLabel(mode == .live ? "Capture and read" : "Capture and identify")
            Spacer()
            Button { camera.toggleTorch() } label: {
                Image(systemName: camera.torchOn ? "bolt.fill" : "bolt.slash")
                    .font(.title3)
                    .foregroundStyle(.white)
                    .frame(width: 52, height: 52)
                    .background(.black.opacity(0.35), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
            .disabled(!camera.torchAvailable)
            .accessibilityLabel(camera.torchOn ? "Turn torch off" : "Turn torch on")
        }
        .padding(.horizontal, 28)
        .padding(.bottom, 24)
    }

    private var hint: String {
        if mode == .live && SystemScanners.liveDataScannerAvailable {
            return "Tap a highlighted barcode or line of text to save it."
        }
        if mode == .live {
            return "Live text and barcodes update as you move. Tap a code to save it."
        }
        if !settings.hasAPIKey {
            if settings.lookupBarcodes {
                return "Product barcodes are checked in public catalogs. Add an AI key in Profile for other objects."
            }
            return "On-device reading is ready. Add an AI key in Profile for names, facts, and care tips."
        }
        return status
    }

    private var permission: some View {
        VStack(spacing: 14) {
            Image(systemName: "camera")
                .font(.system(size: 36, weight: .light))
                .foregroundStyle(Color(red: 0.98, green: 0.75, blue: 0.38))
            Text(camera.permissionDenied ? "Camera access is off" : "Camera unavailable")
                .font(.system(.title3, design: .serif, weight: .bold))
                .foregroundStyle(.white)
            Text(camera.permissionDenied
                 ? "Turn on the camera in Settings, or identify a photo from your library."
                 : "This device has no camera right now. You can still identify a photo.")
                .font(.subheadline)
                .foregroundStyle(.white.opacity(0.7))
                .multilineTextAlignment(.center)
            if camera.permissionDenied {
                Button("Open Settings") {
                    if let url = URL(string: UIApplication.openSettingsURLString) {
                        UIApplication.shared.open(url)
                    }
                }
                .buttonStyle(PrimaryButtonStyle())
            }
            Button("Try the camera again") { camera.start() }
                .buttonStyle(QuietButtonStyle())
        }
        .padding(28)
    }

    private var analyzingDetail: String {
        if settings.lookupBarcodes && settings.hasAPIKey {
            return "Checking public product catalogs, then your AI if the barcode is unknown."
        }
        if settings.lookupBarcodes {
            return "Checking public product catalogs, and reading what stays on device."
        }
        if settings.hasAPIKey {
            return "Reading the frame, then asking your AI."
        }
        return "Reading text and barcodes on device."
    }

    private var analyzingOverlay: some View {
        VStack(spacing: 14) {
            ProgressView()
                .controlSize(.large)
                .tint(Color(red: 0.98, green: 0.75, blue: 0.38))
            Text("Looking closely")
                .font(.system(.title3, design: .serif, weight: .bold))
                .foregroundStyle(.white)
            Text(analyzingDetail)
                .font(.subheadline)
                .foregroundStyle(.white.opacity(0.7))
        }
        .padding(28)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(.black.opacity(0.55))
        .accessibilityElement(children: .combine)
    }

    private func resultOverlay(_ outcome: SaveOutcome) -> some View {
        VStack {
            Spacer()
            VStack(alignment: .leading, spacing: 12) {
                if outcome.leveledUp {
                    Text("Level up · \(outcome.levelName)")
                        .font(.system(.caption, design: .rounded, weight: .bold))
                        .foregroundStyle(Color(red: 0.1, green: 0.07, blue: 0.04))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Theme.amberGradient, in: Capsule())
                }
                Text(outcome.category.uppercased())
                    .font(.system(.caption2, design: .rounded, weight: .bold))
                    .tracking(1.1)
                    .foregroundStyle(.white.opacity(0.65))
                Text(outcome.title)
                    .font(.system(.title2, design: .serif, weight: .bold))
                    .foregroundStyle(.white)
                HStack(spacing: 8) {
                    Text("\(outcome.confidence)%")
                    RarityPill(rarity: outcome.rarity)
                    Text("+\(outcome.xpEarned) XP")
                        .foregroundStyle(Color(red: 0.98, green: 0.75, blue: 0.38))
                }
                .font(.system(.caption, design: .rounded, weight: .bold))
                .foregroundStyle(.white.opacity(0.85))
                if !outcome.summary.isEmpty {
                    Text(outcome.summary)
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.78))
                }
                if let notice = outcome.notice {
                    Text(notice)
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.7))
                }
                if !outcome.newAchievements.isEmpty {
                    Text(outcome.newAchievements.map(\.title).joined(separator: " · "))
                        .font(.caption.weight(.bold))
                        .foregroundStyle(Color(red: 0.98, green: 0.75, blue: 0.38))
                }
                HStack(spacing: 10) {
                    Button("Keep scanning") { self.outcome = nil }
                        .buttonStyle(QuietButtonStyle())
                    Button("Open find") { onOpen(outcome.discoveryID) }
                        .buttonStyle(PrimaryButtonStyle())
                }
                Button {
                    shareRoute = DiscoveryRoute(id: outcome.discoveryID)
                } label: {
                    Label("Share card", systemImage: "square.and.arrow.up")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(QuietButtonStyle())
                .accessibilityHint("Shows a card you can send or save")
            }
            .padding(20)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 28, style: .continuous))
            .padding(16)
        }
        .onAppear {
            if outcome.confidence < 40 { Haptics.notify(.warning) } else { Haptics.notify(.success) }
            AccessibilityNotification.Announcement(outcome.title).post()
        }
    }

    private func failureOverlay(_ message: String) -> some View {
        VStack(spacing: 12) {
            Text("That scan didn't land")
                .font(.system(.title3, design: .serif, weight: .bold))
                .foregroundStyle(.white)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(.white.opacity(0.75))
                .multilineTextAlignment(.center)
            Button("Try again") { failure = nil }
                .buttonStyle(PrimaryButtonStyle())
        }
        .padding(24)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
        .padding(24)
    }

    private func capture() async {
        guard !analyzing else { return }
        Haptics.impact(.rigid)
        withAnimation(.easeOut(duration: 0.12)) { flash = true }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.18) { flash = false }
        do {
            if mode == .live && SystemScanners.liveDataScannerAvailable {
                failure = "Tap a highlighted barcode or line of text to save it."
                return
            }
            let data: Data
            if camera.isRunning {
                data = try await camera.capturePhoto()
            } else if mode == .live {
                await saveReading(camera.liveHints)
                return
            } else {
                failure = CameraError.unavailable.localizedDescription
                return
            }
            await identify(data: data)
        } catch {
            failure = error.localizedDescription
            Haptics.notify(.error)
        }
    }

    private func loadPhoto(_ item: PhotosPickerItem) async {
        do {
            if let picked = try await item.loadTransferable(type: PickedImage.self) {
                await identify(data: picked.data)
            } else {
                failure = "That photo could not be read."
            }
        } catch {
            failure = error.localizedDescription
        }
        photoItem = nil
    }

    private func identify(data: Data) async {
        await run {
            try await Identification.savePhoto(data, settings: settings, location: location, context: context)
        }
    }

    private func identify(images: [UIImage]) async {
        guard let first = images.first else { return }
        await run {
            var latest: SaveOutcome?
            for image in images {
                latest = try await Identification.saveImage(image, settings: settings, location: location, context: context)
            }
            guard var latest else { throw CameraError.noImage }
            if images.count > 1 {
                latest.notice = "Saved \(images.count) pages. \(latest.notice ?? "")"
            }
            return latest
        }
    }

    private func saveReading(_ hints: VisionHints) async {
        guard hints.hasSignal else {
            failure = "Nothing readable yet. Move closer to the text or code."
            return
        }
        await run {
            try await Identification.saveReading(hints: hints, settings: settings, location: location, context: context)
        }
    }

    private func run(_ operation: () async throws -> SaveOutcome) async {
        guard !analyzing else { return }
        analyzing = true
        failure = nil
        do {
            outcome = try await operation()
        } catch {
            failure = error.localizedDescription
            Haptics.notify(.error)
        }
        analyzing = false
    }
}

private struct PickedImage: Transferable {
    let data: Data
    static var transferRepresentation: some TransferRepresentation {
        DataRepresentation(importedContentType: .image) { data in
            PickedImage(data: data)
        }
    }
}

private struct Reticle: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let length = rect.width * 0.18
        let corners = [
            (CGPoint(x: rect.minX, y: rect.minY), CGPoint(x: 1, y: 0), CGPoint(x: 0, y: 1)),
            (CGPoint(x: rect.maxX, y: rect.minY), CGPoint(x: -1, y: 0), CGPoint(x: 0, y: 1)),
            (CGPoint(x: rect.minX, y: rect.maxY), CGPoint(x: 1, y: 0), CGPoint(x: 0, y: -1)),
            (CGPoint(x: rect.maxX, y: rect.maxY), CGPoint(x: -1, y: 0), CGPoint(x: 0, y: -1))
        ]
        for corner in corners {
            path.move(to: corner.0)
            path.addLine(to: CGPoint(x: corner.0.x + corner.1.x * length, y: corner.0.y + corner.1.y * length))
            path.move(to: corner.0)
            path.addLine(to: CGPoint(x: corner.0.x + corner.2.x * length, y: corner.0.y + corner.2.y * length))
        }
        return path
    }
}

private struct ScanBeam: View {
    @State private var phase: CGFloat = 0
    var body: some View {
        GeometryReader { geo in
            Rectangle()
                .fill(Color(red: 0.98, green: 0.75, blue: 0.38).opacity(0.55))
                .frame(height: 2)
                .offset(y: phase * geo.size.height)
                .onAppear {
                    withAnimation(.easeInOut(duration: 2.2).repeatForever(autoreverses: true)) {
                        phase = 1
                    }
                }
        }
    }
}
