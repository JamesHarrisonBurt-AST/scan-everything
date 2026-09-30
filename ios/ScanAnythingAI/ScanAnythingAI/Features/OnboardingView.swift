import SwiftUI

struct OnboardingView: View {
    var onFinish: () -> Void
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var page = 0

    private let pages: [(String, String, String, Color)] = [
        ("viewfinder", "Discover what's around you", "Point your camera at a plant, a tool, a label, a landmark. Scan Anything reads it.", Theme.amber),
        ("text.viewfinder", "Text on device, products by code", "Printed words stay on your iPhone. A product barcode can be matched to a public catalog before any AI call. Turn that off in Profile.", Theme.teal),
        ("books.vertical", "Keep a private journal", "Finds, collections, notes, and follow-up questions stay on this phone.", Theme.violet),
        ("flame", "Make a streak of it", "Earn XP, keep a daily streak, and finish quests as you look closer at the world.", Theme.rose)
    ]

    var body: some View {
        ZStack {
            Theme.canvas.ignoresSafeArea()
            VStack(spacing: 0) {
                HStack {
                    Spacer()
                    Button("Skip") { finish() }
                        .font(.system(.subheadline, design: .rounded, weight: .semibold))
                        .foregroundStyle(Theme.muted)
                        .frame(minHeight: 44)
                }
                .padding(.horizontal, 20)
                Spacer()
                pageContent
                Spacer()
                HStack(spacing: 8) {
                    ForEach(pages.indices, id: \.self) { index in
                        Capsule()
                            .fill(index == page ? pages[page].3 : Theme.field)
                            .frame(width: index == page ? 22 : 7, height: 7)
                    }
                }
                .accessibilityHidden(true)
                .padding(.bottom, 22)
                Button(page == pages.count - 1 ? "Start exploring" : "Continue") {
                    if page == pages.count - 1 {
                        finish()
                    } else {
                        if reduceMotion { page += 1 } else { withAnimation(.spring(duration: 0.35)) { page += 1 } }
                    }
                }
                .buttonStyle(PrimaryButtonStyle())
                .padding(.horizontal, 24)
                .padding(.bottom, 24)
            }
        }
    }

    private var pageContent: some View {
        let item = pages[page]
        return VStack(spacing: 18) {
            Image(systemName: item.0)
                .font(.system(size: 42, weight: .light))
                .foregroundStyle(item.3)
                .frame(width: 108, height: 108)
                .background(item.3.opacity(0.14), in: RoundedRectangle(cornerRadius: 32, style: .continuous))
                .accessibilityHidden(true)
            Text(item.1)
                .font(.system(.largeTitle, design: .serif, weight: .bold))
                .foregroundStyle(Theme.ink)
                .multilineTextAlignment(.center)
            Text(item.2)
                .font(.body)
                .foregroundStyle(Theme.muted)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 12)
        }
        .padding(.horizontal, 28)
        .id(page)
        .transition(.opacity)
    }

    private func finish() {
        Haptics.notify(.success)
        onFinish()
    }
}
