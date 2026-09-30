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
                    _ = ScanLibrary.ensureProfile(context)
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
        .padding(.horizontal, 8)
        .padding(.top, 10)
        .padding(.bottom, 6)
        .background(.ultraThinMaterial)
        .overlay(alignment: .top) { Rectangle().fill(Theme.stroke).frame(height: 1) }
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
                Image(systemName: "viewfinder")
                    .font(.system(size: 26, weight: .semibold))
                    .foregroundStyle(Color(red: 0.09, green: 0.07, blue: 0.04))
                    .frame(width: 62, height: 62)
                    .background(Theme.amberGradient, in: Circle())
                    .shadow(color: Theme.amber.opacity(0.35), radius: 12, y: 6)
                    .offset(y: -16)
                Text("Discover")
                    .font(.system(size: 10, weight: .bold, design: .rounded))
                    .foregroundStyle(Theme.amberText)
            }
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Discover")
        .accessibilityHint("Opens the camera to identify an object")
    }
}
