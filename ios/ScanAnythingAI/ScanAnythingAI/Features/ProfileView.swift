import ScanAnythingCore
import SwiftData
import SwiftUI

struct ProfileView: View {
    @Environment(\.modelContext) private var context
    @Environment(AppSettings.self) private var settings
    @Query private var profiles: [ExplorerProfile]
    @Query(sort: \DiscoveryRecord.createdAt, order: .reverse) private var discoveries: [DiscoveryRecord]
    @Query private var earned: [EarnedAchievement]
    @State private var name = ""
    @State private var loadedName = false
    @State private var connectionStatus = ""
    @State private var checking = false
    @State private var confirmErase = false
    @State private var exportURL: ExportFile?

    private var profile: ExplorerProfile? { profiles.first }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Text("Profile")
                        .font(.system(size: 32, weight: .bold, design: .serif))
                        .foregroundStyle(Theme.ink)
                    if let profile {
                        identity(profile)
                        stats(profile)
                    }
                    aiSection
                    preferences
                    legal
                    dataSection
                }
                .padding(20)
            }
            .journalCanvas()
            .navigationDestination(for: LegalDocument.self) { document in
                LegalView(document: document)
            }
            .sheet(item: $exportURL) { file in
                ActivityView(items: [file.url])
                    .presentationDetents([.medium])
            }
            .confirmationDialog("Erase the journal on this iPhone?", isPresented: $confirmErase, titleVisibility: .visible) {
                Button("Erase everything", role: .destructive) {
                    try? ScanLibrary.eraseAll(context: context)
                    Haptics.notify(.warning)
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("Photos, XP, collections, and quest progress are deleted. Your API key stays in the Keychain until you clear it.")
            }
        }
    }

    private func identity(_ profile: ExplorerProfile) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 14) {
                Text(String(profile.displayName.prefix(1)).uppercased())
                    .font(.system(.title2, design: .serif, weight: .bold))
                    .foregroundStyle(Color(red: 0.1, green: 0.07, blue: 0.04))
                    .frame(width: 58, height: 58)
                    .background(Theme.amberGradient, in: Circle())
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 2) {
                    Text(profile.displayName)
                        .font(.system(.headline, design: .serif))
                        .foregroundStyle(Theme.ink)
                    Text(ExplorerLevels.level(for: profile.xp).name)
                        .font(.subheadline)
                        .foregroundStyle(Theme.muted)
                }
            }
            XPBar(xp: profile.xp)
            TextField("Display name", text: $name)
                .textFieldStyle(.roundedBorder)
                .onAppear {
                    if !loadedName {
                        name = profile.displayName
                        loadedName = true
                    }
                }
            Button("Save name") {
                let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
                profile.displayName = trimmed.isEmpty ? "Explorer" : trimmed
                try? context.save()
                ScanLibrary.publishWidget(profile)
                Haptics.notify(.success)
            }
            .buttonStyle(QuietButtonStyle())
        }
        .padding(16)
        .glassPanel()
    }

    private func stats(_ profile: ExplorerProfile) -> some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
            statTile("Discoveries", value: "\(profile.lifetimeDiscoveries)", symbol: "viewfinder")
            statTile("In journal", value: "\(discoveries.count)", symbol: "book")
            statTile("Day streak", value: "\(profile.streakDays)", symbol: "flame")
            statTile("Badges", value: "\(earned.count)/\(Achievements.all.count)", symbol: "seal")
        }
    }

    private func statTile(_ title: String, value: String, symbol: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Label(title, systemImage: symbol)
                .font(.caption)
                .foregroundStyle(Theme.muted)
            Text(value)
                .font(.system(.title2, design: .rounded, weight: .bold))
                .foregroundStyle(Theme.ink)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .glassPanel(radius: 16)
        .accessibilityElement(children: .combine)
    }

    private var aiSection: some View {
        @Bindable var form = settings
        return VStack(alignment: .leading, spacing: 10) {
            Text("AI identification")
                .font(.system(.headline, design: .serif))
                .foregroundStyle(Theme.ink)
            Text("The key stays in the iPhone Keychain and is sent only to the base URL below. Leave it blank to keep scanning with on-device text and barcodes.")
                .font(.caption)
                .foregroundStyle(Theme.muted)
            SecureField("API key", text: $form.apiKey)
                .textFieldStyle(.roundedBorder)
                .textContentType(.password)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
            TextField("Base URL", text: $form.baseURL)
                .textFieldStyle(.roundedBorder)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .keyboardType(.URL)
            TextField("Model", text: $form.modelName)
                .textFieldStyle(.roundedBorder)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
            Button("Save AI settings") {
                form.saveAI()
                connectionStatus = form.hasAPIKey ? "Saved on this iPhone." : "Key removed. Scans will use on-device Vision."
                Haptics.notify(.success)
            }
            .buttonStyle(PrimaryButtonStyle())
            Button(checking ? "Checking…" : "Check connection") {
                form.saveAI()
                checking = true
                connectionStatus = ""
                Task {
                    do {
                        try await form.makeAnalyzer().validate()
                        connectionStatus = "Connection looks good."
                        Haptics.notify(.success)
                    } catch {
                        connectionStatus = error.localizedDescription
                        Haptics.notify(.warning)
                    }
                    checking = false
                }
            }
            .buttonStyle(QuietButtonStyle())
            .disabled(checking || !form.hasAPIKey)
            if !connectionStatus.isEmpty {
                Text(connectionStatus)
                    .font(.caption)
                    .foregroundStyle(Theme.muted)
            }
        }
        .padding(16)
        .glassPanel()
    }

    private var preferences: some View {
        @Bindable var form = settings
        return VStack(alignment: .leading, spacing: 4) {
            Text("Preferences")
                .font(.system(.headline, design: .serif))
                .foregroundStyle(Theme.ink)
                .padding(.bottom, 6)
            Toggle("Haptics", isOn: $form.hapticsEnabled)
                .onChange(of: form.hapticsEnabled) { _, _ in form.savePreferences() }
            Toggle("Tag finds with location", isOn: $form.tagLocation)
                .onChange(of: form.tagLocation) { _, _ in form.savePreferences() }
            Text("Location is saved with a scan only when this is on. The Finds map can also use it to show what is near you.")
                .font(.caption)
                .foregroundStyle(Theme.muted)
            Text("Add the streak widget from the Home Screen or Lock Screen. In Control Center, the Scan button opens the camera.")
                .font(.caption)
                .foregroundStyle(Theme.muted)
            Toggle("Look up barcodes", isOn: $form.lookupBarcodes)
                .onChange(of: form.lookupBarcodes) { _, _ in form.savePreferences() }
            Text("A product barcode is sent to Open Food Facts, Open Beauty Facts, and Open Products Facts before any AI call. The photo stays on this iPhone. Turn this off to keep codes on device.")
                .font(.caption)
                .foregroundStyle(Theme.muted)
        }
        .padding(16)
        .glassPanel()
    }

    private var legal: some View {
        VStack(spacing: 0) {
            NavigationLink(value: LegalDocument.privacy) {
                legalRow("Privacy", symbol: "hand.raised")
            }
            Divider().overlay(Theme.stroke)
            NavigationLink(value: LegalDocument.terms) {
                legalRow("Terms", symbol: "doc.text")
            }
        }
        .glassPanel()
    }

    private func legalRow(_ title: String, symbol: String) -> some View {
        HStack {
            Label(title, systemImage: symbol)
                .foregroundStyle(Theme.ink)
            Spacer()
            Image(systemName: "chevron.right")
                .font(.caption.weight(.bold))
                .foregroundStyle(Theme.muted)
        }
        .padding(16)
        .frame(minHeight: 52)
    }

    private var dataSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Button("Export journal JSON") { exportJournal() }
                .buttonStyle(QuietButtonStyle())
                .disabled(discoveries.isEmpty)
            Button("Erase journal", role: .destructive) { confirmErase = true }
                .font(.system(.body, design: .rounded, weight: .semibold))
                .foregroundStyle(Theme.rose)
                .frame(maxWidth: .infinity, minHeight: 48)
        }
    }

    private func exportJournal() {
        let payload = discoveries.map { discovery in
            ExportedDiscovery(
                id: discovery.id.uuidString,
                title: discovery.title,
                category: discovery.category,
                summary: discovery.summary,
                details: discovery.narrative,
                confidence: discovery.confidence,
                rarity: discovery.rarityRaw,
                notes: discovery.notes,
                tags: discovery.tags,
                barcode: discovery.barcodePayload,
                recognizedText: discovery.recognizedText,
                latitude: discovery.latitude,
                longitude: discovery.longitude,
                location: discovery.locationLabel,
                createdAt: discovery.createdAt
            )
        }
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        encoder.dateEncodingStrategy = .iso8601
        guard let data = try? encoder.encode(payload) else { return }
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("scan-anything-journal.json")
        do {
            try data.write(to: url, options: .atomic)
            exportURL = ExportFile(url: url)
        } catch {
            connectionStatus = "Could not write the export."
        }
    }
}

private struct ExportedDiscovery: Codable {
    var id: String
    var title: String
    var category: String
    var summary: String
    var details: String
    var confidence: Int
    var rarity: String
    var notes: String
    var tags: [String]
    var barcode: String
    var recognizedText: String
    var latitude: Double?
    var longitude: Double?
    var location: String
    var createdAt: Date
}

struct ExportFile: Identifiable {
    let id = UUID()
    let url: URL
}
