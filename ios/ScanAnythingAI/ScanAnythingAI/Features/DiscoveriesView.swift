import MapKit
import ScanAnythingCore
import SwiftData
import SwiftUI

struct DiscoveriesView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \DiscoveryRecord.createdAt, order: .reverse) private var discoveries: [DiscoveryRecord]
    @Query(sort: \ScanCollection.createdAt, order: .reverse) private var collections: [ScanCollection]
    @State private var search = ""
    @State private var filter = "all"
    @State private var showMap = false
    @State private var newCollectionName = ""
    @State private var showNewCollection = false
    @State private var selectedCollectionID: UUID?

    private var categories: [String] {
        Array(Set(discoveries.map(\.category))).sorted()
    }

    private var filtered: [DiscoveryRecord] {
        discoveries.filter { discovery in
            if filter == "favorites" && !discovery.favorited { return false }
            if filter != "all" && filter != "favorites" && filter != "recent" && discovery.category != filter { return false }
            let query = search.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
            guard !query.isEmpty else { return true }
            let haystack = [
                discovery.title, discovery.category, discovery.possibleBrand, discovery.possibleModel,
                discovery.notes, discovery.tags.joined(separator: " "), discovery.recognizedText, discovery.barcodePayload
            ].joined(separator: " ").lowercased()
            return haystack.contains(query)
        }
        .prefix(filter == "recent" ? 20 : 500)
        .map { $0 }
    }

    private var collectionSheetPresented: Binding<Bool> {
        Binding(
            get: { selectedCollectionID != nil },
            set: { if !$0 { selectedCollectionID = nil } }
        )
    }

    private var pins: [DiscoveryRecord] {
        filtered.filter { $0.latitude != nil && $0.longitude != nil }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("My discoveries")
                            .font(.system(size: 32, weight: .bold, design: .serif))
                            .foregroundStyle(Theme.ink)
                        Text("\(discoveries.count) in the journal")
                            .font(.subheadline)
                            .foregroundStyle(Theme.muted)
                    }
                    searchField
                    collectionsRow
                    filterRow
                    if showMap {
                        map
                    }
                    grid
                }
                .padding(20)
            }
            .background(Theme.canvas)
            .navigationDestination(for: UUID.self) { DiscoveryDetailView(discoveryID: $0) }
            .sheet(isPresented: $showNewCollection) { newCollectionSheet }
            .sheet(isPresented: collectionSheetPresented) {
                if let selectedCollectionID, let collection = collections.first(where: { $0.id == selectedCollectionID }) {
                    CollectionDetailSheet(collection: collection)
                }
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showMap.toggle()
                    } label: {
                        Image(systemName: showMap ? "square.grid.2x2" : "map")
                    }
                    .accessibilityLabel(showMap ? "Show grid" : "Show map")
                }
            }
        }
    }

    private var searchField: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(Theme.muted)
            TextField("Search title, brand, notes, text", text: $search)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
        }
        .padding(.horizontal, 12)
        .frame(minHeight: 46)
        .background(Theme.field, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .accessibilityElement(children: .combine)
    }

    private var collectionsRow: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("COLLECTIONS")
                    .font(.system(.caption, design: .rounded, weight: .bold))
                    .tracking(1.1)
                    .foregroundStyle(Theme.muted)
                Spacer()
                Button {
                    showNewCollection = true
                } label: {
                    Label("New", systemImage: "plus")
                        .font(.system(.caption, design: .rounded, weight: .bold))
                }
                .accessibilityHint("Creates a collection")
            }
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    if collections.isEmpty {
                        Text("No collections yet")
                            .font(.caption)
                            .foregroundStyle(Theme.muted)
                    }
                    ForEach(collections) { collection in
                        Button {
                            selectedCollectionID = collection.id
                        } label: {
                            Label(collection.name, systemImage: "folder")
                                .font(.system(.caption, design: .rounded, weight: .semibold))
                                .padding(.horizontal, 12)
                                .frame(minHeight: 36)
                                .foregroundStyle(Theme.ink)
                                .background(Theme.field, in: Capsule())
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    private var filterRow: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                chip("all", "All")
                chip("recent", "Recent")
                chip("favorites", "Favorites")
                ForEach(categories, id: \.self) { category in
                    chip(category, DiscoveryCategory.displayName(for: category))
                }
            }
        }
    }

    private func chip(_ id: String, _ title: String) -> some View {
        Button {
            filter = id
        } label: {
            Text(title)
                .font(.system(.caption, design: .rounded, weight: .bold))
                .padding(.horizontal, 12)
                .frame(minHeight: 34)
                .foregroundStyle(filter == id ? Theme.amberText : Theme.muted)
                .background(filter == id ? Theme.amber.opacity(0.16) : Theme.field, in: Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(filter == id ? .isSelected : [])
    }

    private var map: some View {
        Map {
            ForEach(pins) { discovery in
                Marker(
                    discovery.title,
                    systemImage: "viewfinder",
                    coordinate: CLLocationCoordinate2D(
                        latitude: discovery.latitude ?? 0,
                        longitude: discovery.longitude ?? 0
                    )
                )
                .tint(Theme.amber)
            }
        }
        .mapStyle(.standard(elevation: .flat))
        .frame(height: 240)
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .accessibilityLabel("Map of discoveries with a saved location")
        .overlay {
            if pins.isEmpty {
                Text("No locations yet. Turn on location tags in Profile.")
                    .font(.caption)
                    .foregroundStyle(Theme.ink)
                    .padding(10)
                    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
        }
    }

    @ViewBuilder
    private var grid: some View {
        if filtered.isEmpty {
            EmptyJournal(
                symbol: "square.grid.2x2",
                title: search.isEmpty ? "Nothing saved yet" : "No matches",
                message: search.isEmpty ? "Scans you keep show up here." : "Try a different word, or clear the search."
            )
        } else {
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
                ForEach(filtered) { discovery in
                    NavigationLink(value: discovery.id) {
                        DiscoveryCard(discovery: discovery)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private var newCollectionSheet: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 16) {
                Text("Give the collection a short name, like Kitchen or Walks.")
                    .font(.subheadline)
                    .foregroundStyle(Theme.muted)
                TextField("Collection name", text: $newCollectionName)
                    .textFieldStyle(.roundedBorder)
                Button("Create") {
                    let name = newCollectionName.trimmingCharacters(in: .whitespacesAndNewlines)
                    guard !name.isEmpty else { return }
                    _ = ScanLibrary.createCollection(name: name, context: context)
                    newCollectionName = ""
                    showNewCollection = false
                    Haptics.notify(.success)
                }
                .buttonStyle(PrimaryButtonStyle())
                .disabled(newCollectionName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                Spacer()
            }
            .padding(20)
            .background(Theme.canvas)
            .navigationTitle("New collection")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { showNewCollection = false }
                }
            }
        }
        .presentationDetents([.medium])
    }
}

struct CollectionDetailSheet: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    let collection: ScanCollection

    private var discoveries: [DiscoveryRecord] {
        collection.links.compactMap(\.discovery).sorted { $0.createdAt > $1.createdAt }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                if discoveries.isEmpty {
                    EmptyJournal(symbol: "folder", title: collection.name, message: "Open a find and add it to this collection.")
                        .padding(20)
                } else {
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                        ForEach(discoveries) { discovery in
                            DiscoveryCard(discovery: discovery)
                        }
                    }
                    .padding(20)
                }
            }
            .background(Theme.canvas)
            .navigationTitle(collection.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
                ToolbarItem(placement: .destructiveAction) {
                    Button("Delete", role: .destructive) {
                        context.delete(collection)
                        try? context.save()
                        dismiss()
                    }
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
}
