import ScanAnythingCore
import SwiftUI
import UIKit

enum Theme {
    static let amber = Color(red: 0.961, green: 0.647, blue: 0.141)
    static let amberDeep = Color(red: 0.878, green: 0.478, blue: 0.184)
    static let teal = Color(red: 0.180, green: 0.769, blue: 0.714)
    static let rose = Color(red: 0.957, green: 0.247, blue: 0.369)
    static let violet = Color(red: 0.753, green: 0.518, blue: 0.988)

    static var canvas: Color { Color(uiColor: dynamic(dark: UIColor(red: 0.055, green: 0.067, blue: 0.086, alpha: 1), light: UIColor(red: 0.965, green: 0.953, blue: 0.933, alpha: 1))) }
    static var card: Color { Color(uiColor: dynamic(dark: UIColor(red: 0.102, green: 0.118, blue: 0.145, alpha: 1), light: UIColor(red: 1, green: 0.995, blue: 0.984, alpha: 1))) }
    static var ink: Color { Color(uiColor: dynamic(dark: UIColor(red: 0.957, green: 0.945, blue: 0.918, alpha: 1), light: UIColor(red: 0.086, green: 0.094, blue: 0.114, alpha: 1))) }
    static var muted: Color { Color(uiColor: dynamic(dark: UIColor(red: 0.604, green: 0.639, blue: 0.698, alpha: 1), light: UIColor(red: 0.361, green: 0.396, blue: 0.439, alpha: 1))) }
    static var stroke: Color { Color(uiColor: dynamic(dark: UIColor(white: 1, alpha: 0.08), light: UIColor(red: 0.12, green: 0.10, blue: 0.08, alpha: 0.08))) }
    static var amberText: Color { Color(uiColor: dynamic(dark: UIColor(red: 0.984, green: 0.753, blue: 0.376, alpha: 1), light: UIColor(red: 0.545, green: 0.310, blue: 0.039, alpha: 1))) }
    static var field: Color { Color(uiColor: dynamic(dark: UIColor(white: 1, alpha: 0.06), light: UIColor(red: 0.09, green: 0.08, blue: 0.06, alpha: 0.05))) }

    static var amberGradient: LinearGradient {
        LinearGradient(colors: [amber, amberDeep], startPoint: .topLeading, endPoint: .bottomTrailing)
    }

    static func dynamic(dark: UIColor, light: UIColor) -> UIColor {
        UIColor { traits in
            traits.userInterfaceStyle == .dark ? dark : light
        }
    }

    static func rarityColor(_ rarity: Rarity) -> Color {
        switch rarity {
        case .common: return muted
        case .interesting: return teal
        case .unusual: return violet
        case .exceptional: return amberText
        }
    }
}

struct GlassPanel: ViewModifier {
    var radius: CGFloat = 22
    func body(content: Content) -> some View {
        content
            .background(Theme.card, in: RoundedRectangle(cornerRadius: radius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .stroke(Theme.stroke, lineWidth: 1)
            )
    }
}

extension View {
    func glassPanel(radius: CGFloat = 22) -> some View {
        modifier(GlassPanel(radius: radius))
    }

    func curatorTitle() -> some View {
        font(.system(.title2, design: .serif, weight: .bold))
            .foregroundStyle(Theme.ink)
    }
}

struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(.body, design: .rounded, weight: .bold))
            .foregroundStyle(Color(red: 0.09, green: 0.07, blue: 0.04))
            .frame(maxWidth: .infinity)
            .frame(minHeight: 52)
            .background(Theme.amberGradient, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .opacity(configuration.isPressed ? 0.82 : 1)
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
    }
}

struct QuietButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(.body, design: .rounded, weight: .semibold))
            .foregroundStyle(Theme.ink)
            .frame(maxWidth: .infinity)
            .frame(minHeight: 52)
            .background(Theme.field, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(Theme.stroke, lineWidth: 1)
            )
            .opacity(configuration.isPressed ? 0.75 : 1)
    }
}

struct XPBar: View {
    let xp: Int
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        let progress = ExplorerLevels.progress(for: xp)
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Level \(progress.current.level)")
                    .font(.system(.subheadline, design: .rounded, weight: .bold))
                    .foregroundStyle(Theme.amberText)
                Text(progress.current.name)
                    .font(.system(.subheadline, design: .serif))
                    .foregroundStyle(Theme.muted)
                Spacer()
                Text(progress.isMaxLevel ? "\(xp) XP" : "\(progress.xpInLevel)/\(progress.xpToNext) XP")
                    .font(.system(.caption, design: .rounded))
                    .foregroundStyle(Theme.muted)
                    .accessibilityLabel(progress.isMaxLevel ? "\(xp) experience points, highest level" : "\(progress.xpInLevel) of \(progress.xpToNext) experience points toward the next level")
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Theme.field)
                    Capsule()
                        .fill(Theme.amberGradient)
                        .frame(width: max(8, geo.size.width * progress.progress))
                }
            }
            .frame(height: 8)
            .accessibilityHidden(true)
            .animation(reduceMotion ? nil : .easeOut(duration: 0.6), value: progress.progress)
        }
        .accessibilityElement(children: .combine)
    }
}

struct EmptyJournal: View {
    let symbol: String
    let title: String
    let message: String
    var actionTitle: String?
    var action: (() -> Void)?

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: symbol)
                .font(.system(size: 28, weight: .light))
                .foregroundStyle(Theme.amberText)
                .frame(width: 64, height: 64)
                .background(Theme.amber.opacity(0.12), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                .accessibilityHidden(true)
            Text(title)
                .font(.system(.headline, design: .serif))
                .foregroundStyle(Theme.ink)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(Theme.muted)
                .multilineTextAlignment(.center)
            if let actionTitle, let action {
                Button(actionTitle, action: action)
                    .buttonStyle(PrimaryButtonStyle())
                    .padding(.top, 8)
            }
        }
        .padding(24)
        .frame(maxWidth: .infinity)
    }
}

struct RarityPill: View {
    let rarity: Rarity
    var body: some View {
        Text(rarity.title)
            .font(.system(.caption2, design: .rounded, weight: .bold))
            .foregroundStyle(Theme.rarityColor(rarity))
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(Theme.rarityColor(rarity).opacity(0.14), in: Capsule())
            .accessibilityLabel("Rarity \(rarity.title)")
    }
}

struct DiscoveryThumbnail: View {
    let filename: String
    var body: some View {
        Group {
            if let image = ImageStore.load(filename) {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
            } else {
                ZStack {
                    Theme.field
                    Image(systemName: "viewfinder")
                        .foregroundStyle(Theme.muted)
                }
            }
        }
        .clipped()
    }
}

struct DiscoveryRoute: Identifiable, Hashable {
    let id: UUID
}
