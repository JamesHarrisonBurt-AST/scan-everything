import SwiftUI

struct AmbientBackground: View {
    @Environment(\.colorScheme) private var scheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var drift = false

    var body: some View {
        ZStack {
            Theme.canvas
            Circle()
                .fill(Theme.amber.opacity(scheme == .dark ? 0.34 : 0.2))
                .frame(width: 320, height: 320)
                .blur(radius: 70)
                .offset(x: drift ? 50 : -30, y: -220)
            Circle()
                .fill(Theme.violet.opacity(scheme == .dark ? 0.28 : 0.14))
                .frame(width: 260, height: 260)
                .blur(radius: 64)
                .offset(x: drift ? -40 : 70, y: 280)
            Circle()
                .fill(Theme.teal.opacity(scheme == .dark ? 0.12 : 0.08))
                .frame(width: 180, height: 180)
                .blur(radius: 50)
                .offset(x: 120, y: drift ? 40 : 120)
        }
        .ignoresSafeArea()
        .allowsHitTesting(false)
        .accessibilityHidden(true)
        .onAppear {
            guard !reduceMotion else { return }
            withAnimation(.easeInOut(duration: 9).repeatForever(autoreverses: true)) {
                drift = true
            }
        }
    }
}

struct AnimatedReticle: View {
    var active: Bool
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var angle: Double = 0
    @State private var beam: CGFloat = 0

    var body: some View {
        ZStack {
            Circle()
                .stroke(
                    AngularGradient(
                        colors: [Theme.amber.opacity(0.05), Theme.amber, Theme.violet, Theme.amber.opacity(0.05)],
                        center: .center
                    ),
                    style: StrokeStyle(lineWidth: 3, dash: [10, 14])
                )
                .frame(width: 236, height: 236)
                .rotationEffect(.degrees(reduceMotion ? 0 : angle))
            ReticleCorners()
                .stroke(Theme.amberText, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                .frame(width: 198, height: 198)
                .shadow(color: Theme.amber.opacity(active ? 0.85 : 0.2), radius: 12)
            if active && !reduceMotion {
                Rectangle()
                    .fill(
                        LinearGradient(
                            colors: [.clear, Theme.amber.opacity(0.15), Theme.amberText, Theme.amber.opacity(0.15), .clear],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .frame(width: 160, height: 2)
                    .offset(y: (beam - 0.5) * 150)
                    .shadow(color: Theme.amber, radius: 8)
            }
        }
        .opacity(active ? 1 : 0.35)
        .scaleEffect(active ? 1 : 0.94)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
        .onAppear { start() }
        .onChange(of: reduceMotion) { _, _ in start() }
    }

    private func start() {
        guard !reduceMotion else {
            angle = 0
            beam = 0.5
            return
        }
        withAnimation(.linear(duration: 10).repeatForever(autoreverses: false)) {
            angle = 360
        }
        withAnimation(.easeInOut(duration: 2.1).repeatForever(autoreverses: true)) {
            beam = 1
        }
    }
}

struct ReticleCorners: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let length = rect.width * 0.22
        let corners: [(CGPoint, CGPoint, CGPoint)] = [
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

struct RarityBurst: View {
    let rarity: Rarity
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        let color = Theme.rarityColor(rarity)
        ZStack {
            Circle()
                .fill(color.opacity(rarity == .common ? 0.12 : 0.28))
                .frame(width: 280, height: 280)
                .blur(radius: 40)
            if rarity != .common && !reduceMotion {
                TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { timeline in
                    Canvas { context, size in
                        let time = timeline.date.timeIntervalSinceReferenceDate
                        for index in 0..<18 {
                            let seed = Double(index)
                            let progress = (time * (0.35 + seed.truncatingRemainder(dividingBy: 5) * 0.04) + seed * 0.17)
                                .truncatingRemainder(dividingBy: 1)
                            let angle = seed / 18 * Double.pi * 2
                            let distance = 20 + progress * min(size.width, size.height) * 0.48
                            let center = CGPoint(x: size.width / 2 + cos(angle) * distance, y: size.height / 2 + sin(angle) * distance * 0.72)
                            let rect = CGRect(x: center.x, y: center.y, width: 7, height: 7)
                            context.opacity = 1 - progress
                            context.fill(Path(ellipseIn: rect), with: .color(index.isMultiple(of: 2) ? color : Theme.amber))
                        }
                    }
                }
                .frame(height: 220)
                .accessibilityHidden(true)
            }
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
}

struct LevelUpBanner: View {
    let name: String
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var shown = false

    var body: some View {
        Text("Level up · \(name)")
            .font(.system(.headline, design: .rounded, weight: .heavy))
            .foregroundStyle(Color(red: 0.1, green: 0.07, blue: 0.04))
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(Theme.amberGradient, in: Capsule())
            .shadow(color: Theme.amber.opacity(0.7), radius: 16)
            .scaleEffect(shown || reduceMotion ? 1 : 0.6)
            .opacity(shown || reduceMotion ? 1 : 0)
            .onAppear {
                if reduceMotion {
                    shown = true
                } else {
                    withAnimation(.spring(duration: 0.55, bounce: 0.45)) {
                        shown = true
                    }
                }
            }
            .accessibilityLabel("Level up. \(name)")
    }
}

struct ShutterButton: View {
    var disabled: Bool
    var action: () -> Void
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var pulse = false

    var body: some View {
        Button(action: action) {
            ZStack {
                Circle()
                    .stroke(Theme.amber.opacity(0.45), lineWidth: 8)
                    .frame(width: pulse && !reduceMotion ? 96 : 84, height: pulse && !reduceMotion ? 96 : 84)
                    .opacity(pulse && !reduceMotion ? 0.15 : 0.7)
                Circle()
                    .stroke(.white, lineWidth: 4)
                    .frame(width: 78, height: 78)
                Circle()
                    .fill(Theme.amberGradient)
                    .frame(width: 62, height: 62)
                    .shadow(color: Theme.amber.opacity(0.8), radius: 12)
            }
        }
        .disabled(disabled)
        .onAppear {
            guard !reduceMotion else { return }
            withAnimation(.easeInOut(duration: 1.4).repeatForever(autoreverses: true)) {
                pulse = true
            }
        }
    }
}
