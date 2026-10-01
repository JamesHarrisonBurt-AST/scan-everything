import SwiftData
import SwiftUI

@main
struct ScanAnythingAIApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(AppSettings.shared)
                .tint(Theme.amber)
        }
        .modelContainer(for: [
            ExplorerProfile.self,
            DiscoveryRecord.self,
            ChatMessageRecord.self,
            ScanCollection.self,
            CollectionLink.self,
            EarnedAchievement.self,
            QuestProgress.self
        ])
    }
}

enum AppTab: Hashable {
    case explore
    case finds
    case quests
    case profile
}

struct RootView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.scenePhase) private var scenePhase
    @Query private var profiles: [ExplorerProfile]
    @State private var tab: AppTab = .explore
    @State private var showScanner = false
    @State private var openedDiscovery: DiscoveryRoute?

    private var profile: ExplorerProfile? { profiles.first }

    var body: some View {
        Group {
            if let profile {
                if profile.onboardingCompleted {
                    journal
                } else {
                    OnboardingView {
                        profile.onboardingCompleted = true
                        try? context.save()
                    }
                }
            } else {
                ZStack {
                    Theme.canvas.ignoresSafeArea()
                    ProgressView("Opening your journal")
                        .tint(Theme.amber)
                }
                .task {
                    let profile = ScanLibrary.ensureProfile(context)
                    ScanLibrary.publishWidget(profile)
                }
            }
        }
        .preferredColorScheme(nil)
    }

    private var journal: some View {
        ZStack {
            Theme.canvas.ignoresSafeArea()
            Group {
                switch tab {
                case .explore:
                    ExploreView(openScanner: { showScanner = true })
                case .finds:
                    DiscoveriesView()
                case .quests:
                    QuestsView()
                case .profile:
                    ProfileView()
                }
            }
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            CuratorTabBar(tab: $tab) { showScanner = true }
                .padding(.horizontal, 12)
                .padding(.bottom, 4)
        }
        .fullScreenCover(isPresented: $showScanner) {
            ScannerView { discoveryID in
                showScanner = false
                openedDiscovery = DiscoveryRoute(id: discoveryID)
            }
        }
        .sheet(item: $openedDiscovery) { route in
            NavigationStack {
                DiscoveryDetailView(discoveryID: route.id)
            }
        }
        .onOpenURL { url in
            guard url.scheme == "scananything" else { return }
            showScanner = true
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { openScannerIfRequested() }
        }
        .onAppear { openScannerIfRequested() }
        .onReceive(NotificationCenter.default.publisher(for: .scanAnythingOpenScanner)) { _ in
            showScanner = true
        }
    }

    private func openScannerIfRequested() {
        guard ScannerLaunch.consume() else { return }
        showScanner = true
    }
}

struct CuratorTabBar: View {
    @Binding var tab: AppTab
    var onScan: () -> Void

    var body: some View {
        HStack(alignment: .bottom, spacing: 0) {
            tabButton(.explore, title: "Explore", symbol: "safari")
            tabButton(.finds, title: "Finds", symbol: "square.grid.2x2")
            scanButton
            tabButton(.quests, title: "Quests", symbol: "target")
            tabButton(.profile, title: "Profile", symbol: "person")
        }
        .padding(.horizontal, 6)
        .padding(.top, 8)
        .padding(.bottom, 8)
        .background {
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .fill(.ultraThinMaterial)
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .fill(Theme.card.opacity(0.72))
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .strokeBorder(
                    LinearGradient(colors: [Theme.amber.opacity(0.7), Theme.stroke, Theme.violet.opacity(0.45)], startPoint: .topLeading, endPoint: .bottomTrailing),
                    lineWidth: 1
                )
        }
        .shadow(color: Color.black.opacity(0.35), radius: 18, y: 8)
    }

    private func tabButton(_ value: AppTab, title: String, symbol: String) -> some View {
        Button {
            Haptics.selection()
            tab = value
        } label: {
            VStack(spacing: 4) {
                Image(systemName: symbol)
                    .font(.system(size: 18, weight: .semibold))
                Text(title)
                    .font(.system(size: 10, weight: .semibold, design: .rounded))
            }
            .foregroundStyle(tab == value ? Theme.amberText : Theme.muted)
            .frame(maxWidth: .infinity)
            .frame(minHeight: 44)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(title)
        .accessibilityAddTraits(tab == value ? .isSelected : [])
    }

    private var scanButton: some View {
        Button(action: {
            Haptics.impact(.medium)
            onScan()
        }) {
            VStack(spacing: 4) {
                ScanOrb()
                    .offset(y: -18)
                Text("Discover")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(Theme.amberText)
            }
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Discover")
        .accessibilityHint("Opens the camera to identify an object")
    }
}

private struct ScanOrb: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var pulse = false

    var body: some View {
        ZStack {
            Circle()
                .stroke(Theme.amber.opacity(0.55), lineWidth: 6)
                .frame(width: pulse && !reduceMotion ? 86 : 70, height: pulse && !reduceMotion ? 86 : 70)
                .opacity(pulse && !reduceMotion ? 0.15 : 0.85)
            Circle()
                .fill(Theme.amber.opacity(0.35))
                .frame(width: 74, height: 74)
                .blur(radius: 8)
            Image(systemName: "viewfinder")
                .font(.system(size: 28, weight: .semibold))
                .foregroundStyle(Color(red: 0.09, green: 0.07, blue: 0.04))
                .frame(width: 64, height: 64)
                .background(Theme.amberGradient, in: Circle())
                .overlay(Circle().strokeBorder(Color.white.opacity(0.45), lineWidth: 1))
                .shadow(color: Theme.amber.opacity(0.85), radius: 16, y: 4)
        }
        .frame(width: 88, height: 64)
        .onAppear {
            guard !reduceMotion else { return }
            withAnimation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true)) {
                pulse = true
            }
        }
        .accessibilityHidden(true)
    }
}
