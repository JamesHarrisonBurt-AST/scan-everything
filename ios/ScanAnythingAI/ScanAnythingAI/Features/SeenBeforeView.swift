import PhotosUI
import ScanAnythingCore
import SwiftData
import SwiftUI
import UniformTypeIdentifiers

struct SeenBeforeSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var context
    @Query(sort: \DiscoveryRecord.createdAt, order: .reverse) private var discoveries: [DiscoveryRecord]
    @State private var photoItem: PhotosPickerItem?
    @State private var searching = false
    @State private var hits: [PriorSighting] = []
    @State private var searched = false
    @State private var failure: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text("Pick a photo. The phone compares it with finds already in the journal. Nothing is uploaded.")
                        .font(.subheadline)
                        .foregroundStyle(Theme.muted)
                    PhotosPicker(selection: $photoItem, matching: .images) {
                        Label("Choose a photo", systemImage: "photo")
                    }
                    .buttonStyle(PrimaryButtonStyle())
                    if searching {
                        HStack(spacing: 10) {
                            ProgressView()
                            Text("Comparing with your journal")
                                .font(.subheadline)
                                .foregroundStyle(Theme.muted)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    if let failure {
                        Text(failure)
                            .font(.subheadline)
                            .foregroundStyle(Theme.rose)
                    }
                    if searched && hits.isEmpty && !searching {
                        EmptyJournal(
                            symbol: "sparkle.magnifyingglass",
                            title: "Nothing like this yet",
                            message: "No saved find is close enough. Scan it to start a new entry."
                        )
                    }
                    ForEach(hits) { hit in
                        NavigationLink(value: hit.id) {
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(hit.kind.title)
                                        .font(.system(.caption, design: .rounded, weight: .bold))
                                        .foregroundStyle(hit.kind == .same ? Theme.amberText : Theme.teal)
                                    Text(hit.title)
                                        .font(.system(.headline, design: .serif))
                                        .foregroundStyle(Theme.ink)
                                }
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .foregroundStyle(Theme.muted)
                            }
                            .padding(14)
                            .glassPanel(radius: 18)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(20)
            }
            .journalCanvas()
            .navigationTitle("Seen this?")
            .navigationBarTitleDisplayMode(.inline)
            .navigationDestination(for: UUID.self) { DiscoveryDetailView(discoveryID: $0) }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
        }
        .onAppear {
            FeaturePrints.backfill(discoveries, context: context)
        }
        .onChange(of: photoItem) { _, item in
            guard let item else { return }
            Task { await search(item) }
        }
    }

    private func search(_ item: PhotosPickerItem) async {
        searching = true
        failure = nil
        searched = false
        defer {
            searching = false
            photoItem = nil
        }
        do {
            guard let picked = try await item.loadTransferable(type: PickedPhoto.self) else {
                failure = "That photo could not be read."
                return
            }
            let printData = FeaturePrints.archive(from: picked.data)
            hits = FeaturePrints.matches(query: printData, records: discoveries)
            searched = true
            if hits.contains(where: { $0.kind == .same }) {
                Haptics.notify(.success)
            }
        } catch {
            failure = error.localizedDescription
        }
    }
}

private struct PickedPhoto: Transferable {
    let data: Data
    static var transferRepresentation: some TransferRepresentation {
        DataRepresentation(importedContentType: .image) { data in
            PickedPhoto(data: data)
        }
    }
}
