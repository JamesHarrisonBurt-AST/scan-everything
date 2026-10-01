import ScanAnythingCore
import SwiftData
import SwiftUI

struct DiscoveryDetailView: View {
    let discoveryID: UUID
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @Environment(AppSettings.self) private var settings
    @Query(sort: \DiscoveryRecord.createdAt, order: .reverse) private var discoveries: [DiscoveryRecord]
    @Query(sort: \ScanCollection.createdAt, order: .reverse) private var collections: [ScanCollection]
    @State private var question = ""
    @State private var asking = false
    @State private var notesDraft = ""
    @State private var tagsDraft = ""
    @State private var didLoadDrafts = false
    @State private var showCollections = false
    @State private var showShare = false
    @State private var confirmDelete = false
    @State private var chatError: String?

    private var discovery: DiscoveryRecord? {
        discoveries.first { $0.id == discoveryID }
    }

    var body: some View {
        Group {
            if let discovery {
                content(discovery)
            } else {
                EmptyJournal(symbol: "questionmark", title: "Find unavailable", message: "It may have been deleted.")
            }
        }
        .journalCanvas()
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(for: UUID.self) { id in
            DiscoveryDetailView(discoveryID: id)
        }
        .toolbar {
            if discovery != nil {
                ToolbarItemGroup(placement: .topBarTrailing) {
                    Button {
                        toggleFavorite()
                    } label: {
                        Image(systemName: discovery?.favorited == true ? "heart.fill" : "heart")
                    }
                    .accessibilityLabel(discovery?.favorited == true ? "Remove from favorites" : "Favorite")

                    Button { showShare = true } label: {
                        Image(systemName: "square.and.arrow.up")
                    }
                    .accessibilityLabel("Share card")

                    Button { showCollections = true } label: {
                        Image(systemName: "folder.badge.plus")
                    }
                    .accessibilityLabel("Add to collection")
                }
            }
        }
        .sheet(isPresented: $showCollections) {
            if let discovery {
                AddToCollectionSheet(discovery: discovery, collections: collections)
            }
        }
        .sheet(isPresented: $showShare) {
            if let discovery {
                ShareCardSheet(discovery: discovery)
            }
        }
        .confirmationDialog("Delete this discovery?", isPresented: $confirmDelete, titleVisibility: .visible) {
            Button("Delete", role: .destructive) {
                if let discovery {
                    try? ScanLibrary.delete(discovery, context: context)
                    dismiss()
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("The photo and notes are removed from this iPhone.")
        }
    }

    private func content(_ discovery: DiscoveryRecord) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                hero(discovery)
                meta(discovery)
                if !discovery.narrative.isEmpty { section("What it is", text: discovery.narrative) }
                details(discovery)
                bullets("Interesting facts", symbol: "lightbulb", tint: Theme.amberText, items: discovery.interestingFacts)
                chips("Materials", discovery.materials)
                chips("Characteristics", discovery.characteristics)
                bullets("Care", symbol: "wrench", tint: Theme.teal, items: discovery.maintenanceTips)
                if !discovery.safetyNotes.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Label("Safety", systemImage: "exclamationmark.triangle")
                            .font(.system(.headline, design: .serif))
                            .foregroundStyle(Theme.rose)
                        ForEach(discovery.safetyNotes, id: \.self) { note in
                            Text("• \(note)").font(.subheadline).foregroundStyle(Theme.ink)
                        }
                    }
                    .padding(16)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Theme.rose.opacity(0.1), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                }
                sensed(discovery)
                notes(discovery)
                chat(discovery)
                related(discovery)
                Button("Delete discovery", role: .destructive) { confirmDelete = true }
                    .font(.system(.body, design: .rounded, weight: .semibold))
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .padding(.top, 8)
            }
            .padding(20)
        }
        .onAppear {
            guard !didLoadDrafts else { return }
            notesDraft = discovery.notes
            tagsDraft = discovery.tags.joined(separator: ", ")
            didLoadDrafts = true
        }
    }

    @Environment(\.heroNamespace) private var heroNamespace

    private func hero(_ discovery: DiscoveryRecord) -> some View {
        ZStack(alignment: .bottomLeading) {
            DiscoveryThumbnail(filename: discovery.imageFilename)
                .frame(height: 320)
                .frame(maxWidth: .infinity)
                .heroMatched(id: discovery.id, namespace: heroNamespace)
            LinearGradient(colors: [.clear, .black.opacity(0.78)], startPoint: .center, endPoint: .bottom)
            VStack(alignment: .leading, spacing: 6) {
                RarityPill(rarity: discovery.rarity)
                Text(DiscoveryCategory.displayName(for: discovery.category).uppercased())
                    .font(.system(.caption2, design: .rounded, weight: .bold))
                    .tracking(1.4)
                    .foregroundStyle(.white.opacity(0.8))
                Text(discovery.title)
                    .font(.system(.largeTitle, design: .serif, weight: .bold))
                    .foregroundStyle(.white)
                    .shadow(color: Theme.rarityColor(discovery.rarity).opacity(0.7), radius: 12)
            }
            .padding(18)
        }
        .clipShape(RoundedRectangle(cornerRadius: 32, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 32, style: .continuous)
                .strokeBorder(Theme.rarityColor(discovery.rarity).opacity(discovery.rarity == .common ? 0.25 : 0.85), lineWidth: 1.5)
        )
        .shadow(color: Theme.rarityColor(discovery.rarity).opacity(discovery.rarity == .common ? 0.05 : 0.45), radius: 22, y: 10)
        .accessibilityElement(children: .combine)
    }

    private func meta(_ discovery: DiscoveryRecord) -> some View {
        HStack(spacing: 8) {
            Text("\(discovery.confidence)%")
                .font(.system(.caption, design: .rounded, weight: .bold))
                .foregroundStyle(confidenceColor(discovery.confidence))
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(confidenceColor(discovery.confidence).opacity(0.14), in: Capsule())
                .accessibilityLabel("\(discovery.confidence) percent confidence")
            RarityPill(rarity: discovery.rarity)
            if discovery.xpEarned > 0 {
                Text("+\(discovery.xpEarned) XP")
                    .font(.system(.caption, design: .rounded, weight: .bold))
                    .foregroundStyle(Theme.amberText)
            }
            Spacer()
            if discovery.sourceRaw == "onDevice" {
                Text("On device")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(Theme.teal)
            } else if discovery.sourceRaw == "catalog" {
                Text("Catalog")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(Theme.amberText)
            }
        }
    }

    private func details(_ discovery: DiscoveryRecord) -> some View {
        let rows: [(String, String)] = [
            ("Brand", discovery.possibleBrand),
            ("Model", discovery.possibleModel),
            ("Type", discovery.subcategory),
            ("Era", discovery.estimatedEra),
            ("Value", discovery.estimatedValue),
            ("Where", discovery.locationLabel)
        ].filter { !$0.1.isEmpty }
        return Group {
            if !rows.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    Text("Key details")
                        .font(.system(.headline, design: .serif))
                        .foregroundStyle(Theme.ink)
                    ForEach(rows, id: \.0) { row in
                        HStack {
                            Text(row.0).foregroundStyle(Theme.muted)
                            Spacer()
                            Text(row.1).foregroundStyle(Theme.ink).multilineTextAlignment(.trailing)
                        }
                        .font(.subheadline)
                    }
                }
                .padding(16)
                .glassPanel(radius: 18)
            }
        }
    }

    private func section(_ title: String, text: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(.system(.headline, design: .serif)).foregroundStyle(Theme.ink)
            Text(text).font(.subheadline).foregroundStyle(Theme.muted)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassPanel(radius: 18)
    }

    @ViewBuilder
    private func bullets(_ title: String, symbol: String, tint: Color, items: [String]) -> some View {
        if !items.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                Label(title, systemImage: symbol)
                    .font(.system(.headline, design: .serif))
                    .foregroundStyle(tint)
                ForEach(items, id: \.self) { item in
                    Text("• \(item)").font(.subheadline).foregroundStyle(Theme.muted)
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .glassPanel(radius: 18)
            .accessibilityElement(children: .combine)
        }
    }

    @ViewBuilder
    private func chips(_ title: String, _ items: [String]) -> some View {
        if !items.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                Text(title)
                    .font(.system(.caption, design: .rounded, weight: .bold))
                    .foregroundStyle(Theme.muted)
                FlowChips(items: items)
            }
        }
    }

    private func sensed(_ discovery: DiscoveryRecord) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            if !discovery.barcodePayload.isEmpty {
                Label(discovery.barcodePayload, systemImage: "barcode.viewfinder")
                    .font(.system(.subheadline, design: .monospaced))
                    .foregroundStyle(Theme.ink)
                if !discovery.barcodeSymbology.isEmpty {
                    Text(discovery.barcodeSymbology).font(.caption).foregroundStyle(Theme.muted)
                }
            }
            if !discovery.recognizedText.isEmpty {
                Text("Text seen")
                    .font(.system(.caption, design: .rounded, weight: .bold))
                    .foregroundStyle(Theme.muted)
                Text(discovery.recognizedText)
                    .font(.system(.footnote, design: .monospaced))
                    .foregroundStyle(Theme.ink)
                    .textSelection(.enabled)
            }
        }
        .padding(discovery.barcodePayload.isEmpty && discovery.recognizedText.isEmpty ? 0 : 16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background {
            if !discovery.barcodePayload.isEmpty || !discovery.recognizedText.isEmpty {
                RoundedRectangle(cornerRadius: 18, style: .continuous).fill(Theme.card)
            }
        }
    }

    private func notes(_ discovery: DiscoveryRecord) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Your notes")
                .font(.system(.headline, design: .serif))
                .foregroundStyle(Theme.ink)
            TextField("What you want to remember", text: $notesDraft, axis: .vertical)
                .lineLimit(3...6)
            TextField("Tags, separated by commas", text: $tagsDraft)
            Button("Save notes") {
                discovery.notes = notesDraft.trimmingCharacters(in: .whitespacesAndNewlines)
                discovery.tags = tagsDraft.split(separator: ",").map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }
                try? context.save()
                Haptics.notify(.success)
            }
            .buttonStyle(QuietButtonStyle())
        }
        .padding(16)
        .glassPanel(radius: 18)
    }

    private func chat(_ discovery: DiscoveryRecord) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("Ask about this object", systemImage: "sparkles")
                .font(.system(.headline, design: .serif))
                .foregroundStyle(Theme.ink)
            if discovery.messages.isEmpty {
                FlowChips(items: Array(discovery.followUpSuggestions.prefix(4)), action: ask)
            }
            let ordered = discovery.messages.sorted { $0.createdAt < $1.createdAt }
            ForEach(ordered) { message in
                HStack {
                    if message.roleRaw == "user" { Spacer(minLength: 40) }
                    Text(message.content)
                        .font(.subheadline)
                        .foregroundStyle(Theme.ink)
                        .padding(12)
                        .background(message.roleRaw == "user" ? Theme.amber.opacity(0.18) : Theme.field, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                    if message.roleRaw != "user" { Spacer(minLength: 40) }
                }
                .accessibilityLabel("\(message.roleRaw == "user" ? "You" : "Assistant"): \(message.content)")
            }
            if asking {
                Text("Thinking…")
                    .font(.caption)
                    .foregroundStyle(Theme.muted)
            }
            if let chatError {
                Text(chatError).font(.caption).foregroundStyle(Theme.rose)
            }
            HStack(spacing: 8) {
                TextField("Ask anything", text: $question)
                    .textFieldStyle(.roundedBorder)
                    .submitLabel(.send)
                    .onSubmit { ask(question) }
                Button {
                    ask(question)
                } label: {
                    Image(systemName: "arrow.up")
                        .font(.headline)
                        .foregroundStyle(Color(red: 0.1, green: 0.07, blue: 0.04))
                        .frame(width: 44, height: 44)
                        .background(Theme.amberGradient, in: Circle())
                }
                .disabled(asking || question.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                .accessibilityLabel("Send question")
            }
        }
        .padding(16)
        .glassPanel(radius: 18)
    }

    private func related(_ discovery: DiscoveryRecord) -> some View {
        let others = discoveries.filter { $0.category == discovery.category && $0.id != discovery.id }.prefix(4)
        return Group {
            if !others.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    Text("Related")
                        .font(.system(.headline, design: .serif))
                        .foregroundStyle(Theme.ink)
                    ForEach(Array(others)) { item in
                        NavigationLink(value: item.id) {
                            HStack(spacing: 12) {
                                DiscoveryThumbnail(filename: item.imageFilename)
                                    .frame(width: 54, height: 54)
                                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                                VStack(alignment: .leading) {
                                    Text(item.title).font(.system(.subheadline, design: .serif)).foregroundStyle(Theme.ink)
                                    Text(DiscoveryCategory.displayName(for: item.category)).font(.caption).foregroundStyle(Theme.muted)
                                }
                                Spacer()
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    private func ask(_ raw: String) {
        guard let discovery else { return }
        let query = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !query.isEmpty, !asking else { return }
        question = ""
        let userMessage = ChatMessageRecord(roleRaw: "user", content: query, discovery: discovery)
        context.insert(userMessage)
        discovery.messages.append(userMessage)
        asking = true
        chatError = nil
        var history = discovery.messages.sorted { $0.createdAt < $1.createdAt }.map {
            DialogueTurn(role: $0.roleRaw, content: $0.content)
        }
        if history.last?.role == "user" && history.last?.content == query {
            history.removeLast()
        }
        let dialogue = DialogueContext(
            name: discovery.title,
            category: discovery.category,
            subcategory: discovery.subcategory,
            details: discovery.narrative,
            possibleBrand: discovery.possibleBrand,
            possibleModel: discovery.possibleModel,
            materials: discovery.materials,
            characteristics: discovery.characteristics,
            estimatedEra: discovery.estimatedEra,
            interestingFacts: discovery.interestingFacts,
            recognizedText: discovery.recognizedText,
            barcodePayload: discovery.barcodePayload
        )
        let analyzer = settings.makeAnalyzer()
        Task {
            do {
                let answer = try await analyzer.answer(question: query, context: dialogue, history: history)
                let reply = ChatMessageRecord(roleRaw: "assistant", content: answer, discovery: discovery)
                context.insert(reply)
                discovery.messages.append(reply)
                try? context.save()
                Haptics.impact(.light)
            } catch {
                chatError = error.localizedDescription
                Haptics.notify(.warning)
            }
            asking = false
        }
    }

    private func toggleFavorite() {
        guard let discovery else { return }
        discovery.favorited.toggle()
        try? context.save()
        Haptics.impact(.light)
    }

    private func confidenceColor(_ score: Int) -> Color {
        if score >= 80 { return Theme.teal }
        if score >= 50 { return Theme.amberText }
        return Theme.rose
    }
}

struct FlowChips: View {
    let items: [String]
    var action: ((String) -> Void)?

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(items, id: \.self) { item in
                    if let action {
                        Button(item) { action(item) }
                            .buttonStyle(.plain)
                            .font(.caption)
                            .foregroundStyle(Theme.amberText)
                            .padding(.horizontal, 10)
                            .frame(minHeight: 32)
                            .background(Theme.amber.opacity(0.12), in: Capsule())
                    } else {
                        Text(item)
                            .font(.caption)
                            .foregroundStyle(Theme.ink)
                            .padding(.horizontal, 10)
                            .frame(minHeight: 32)
                            .background(Theme.field, in: Capsule())
                    }
                }
            }
        }
    }
}

struct AddToCollectionSheet: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    let discovery: DiscoveryRecord
    let collections: [ScanCollection]
    @State private var name = ""

    var body: some View {
        NavigationStack {
            List {
                Section("New") {
                    TextField("Collection name", text: $name)
                    Button("Create and add") {
                        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
                        guard !trimmed.isEmpty else { return }
                        let collection = ScanLibrary.createCollection(name: trimmed, context: context)
                        ScanLibrary.add(discovery, to: collection, context: context)
                        Haptics.notify(.success)
                        dismiss()
                    }
                    .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
                Section("Your collections") {
                    if collections.isEmpty {
                        Text("None yet")
                    }
                    ForEach(collections) { collection in
                        Button(collection.name) {
                            ScanLibrary.add(discovery, to: collection, context: context)
                            Haptics.notify(.success)
                            dismiss()
                        }
                    }
                }
            }
            .navigationTitle("Add to collection")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } }
            }
        }
        .presentationDetents([.medium, .large])
    }
}

struct ActivityView: UIViewControllerRepresentable {
    let items: [Any]
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }
    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}
