import LinkPresentation
import ScanAnythingCore
import SwiftUI
import UIKit

enum ShareCardMetrics {
    static let width: CGFloat = 360
    static let height: CGFloat = 450
    static let scale: CGFloat = 3
}

enum DiscoverySharing {
    static func draft(_ discovery: DiscoveryRecord) -> ShareDraft {
        ShareDraft(
            title: discovery.title,
            category: discovery.category,
            summary: discovery.summary,
            details: discovery.narrative,
            confidence: discovery.confidence,
            rarity: discovery.rarity.title,
            facts: discovery.interestingFacts,
            barcode: discovery.barcodePayload,
            recognizedText: discovery.recognizedText,
            location: discovery.locationLabel
        )
    }
}

/// Draws the bitmap that leaves the phone. The preview shows this image, so
/// what you see is what Messages and Save Image receive.
@MainActor
enum ShareCardRenderer {
    static func render(copy: ShareCardCopy, photo: UIImage?) -> UIImage {
        let size = CGSize(width: ShareCardMetrics.width, height: ShareCardMetrics.height)
        let format = UIGraphicsImageRendererFormat()
        format.scale = ShareCardMetrics.scale
        format.opaque = true
        let renderer = UIGraphicsImageRenderer(size: size, format: format)
        return renderer.image { context in
            ShareCardCanvas.draw(copy: copy, photo: photo, in: context.cgContext, size: size)
        }
    }
}

enum ShareCardCanvas {
    static let background = UIColor(red: 0.055, green: 0.067, blue: 0.086, alpha: 1)
    static let ink = UIColor(red: 0.957, green: 0.945, blue: 0.918, alpha: 1)
    static let muted = UIColor(red: 0.78, green: 0.80, blue: 0.84, alpha: 1)
    static let amber = UIColor(red: 0.984, green: 0.753, blue: 0.376, alpha: 1)
    static let panel = UIColor(red: 0.102, green: 0.118, blue: 0.145, alpha: 1)

    static func draw(copy: ShareCardCopy, photo: UIImage?, in context: CGContext, size: CGSize) {
        let width = size.width
        let height = size.height
        context.setFillColor(background.cgColor)
        context.fill(CGRect(origin: .zero, size: size))

        let bar = CGRect(x: 0, y: 0, width: width, height: 6)
        drawAccent(in: bar, context: context)

        let photoRect = CGRect(x: 0, y: bar.maxY, width: width, height: 256)
        context.saveGState()
        context.clip(to: photoRect)
        if let photo {
            drawAspectFill(photo, in: photoRect)
        } else {
            context.setFillColor(panel.cgColor)
            context.fill(photoRect)
            drawReticle(in: photoRect, context: context)
        }
        drawFade(over: photoRect, context: context)
        context.restoreGState()

        let textWidth = width - 36
        let categoryFont = appFont(size: 11, weight: .heavy, design: .rounded)
        let titleFont = appFont(size: 26, weight: .bold, design: .serif)
        let metaFont = appFont(size: 11, weight: .bold, design: .rounded)
        let blurbFont = appFont(size: 15, weight: .regular, design: .serif)
        let factFont = appFont(size: 13, weight: .medium, design: .rounded)
        let footerFont = appFont(size: 11, weight: .bold, design: .rounded)

        let category = copy.category.uppercased()
        let categoryHeight = textHeight(category, font: categoryFont, width: textWidth, lines: 1, kern: 1.5)
        let titleHeight = textHeight(copy.title, font: titleFont, width: textWidth, lines: 2, kern: 0)
        let pillHeight = ceil(metaFont.lineHeight) + 8
        let block = categoryHeight + 6 + titleHeight + 8 + pillHeight
        var y = photoRect.maxY - 16 - block

        drawText(category, x: 18, y: y, width: textWidth, font: categoryFont, color: amber, kern: 1.5, lines: 1)
        y += categoryHeight + 6
        drawText(copy.title, x: 18, y: y, width: textWidth, font: titleFont, color: .white, kern: 0, lines: 2)
        y += titleHeight + 8
        let pillWidth = drawPill(copy.rarity, x: 18, y: y, font: metaFont, height: pillHeight)
        drawText(copy.confidence, x: 18 + pillWidth + 8, y: y + 4, width: textWidth - pillWidth - 8, font: metaFont, color: .white, kern: 0, lines: 1)

        let footerHeight = ceil(footerFont.lineHeight)
        let footerY = height - 18 - footerHeight
        var bodyY = photoRect.maxY + 16
        let bodyBottom = footerY - 16
        if !copy.blurb.isEmpty, bodyY < bodyBottom {
            let blurbHeight = textHeight(copy.blurb, font: blurbFont, width: textWidth, lines: 3, kern: 0)
            drawText(copy.blurb, x: 18, y: bodyY, width: textWidth, font: blurbFont, color: ink, kern: 0, lines: 3)
            bodyY += blurbHeight + 10
        }
        if !copy.fact.isEmpty, bodyY < bodyBottom {
            let factWidth = textWidth - 14
            let dot = CGRect(x: 18, y: bodyY + 5, width: 6, height: 6)
            context.setFillColor(amber.cgColor)
            context.fillEllipse(in: dot)
            drawText(copy.fact, x: 32, y: bodyY, width: factWidth, font: factFont, color: muted, kern: 0, lines: 2)
        }

        context.setStrokeColor(UIColor.white.withAlphaComponent(0.12).cgColor)
        context.setLineWidth(1)
        context.move(to: CGPoint(x: 18, y: footerY - 10))
        context.addLine(to: CGPoint(x: width - 18, y: footerY - 10))
        context.strokePath()

        let footerWidth = (copy.footer as NSString).size(withAttributes: [.font: footerFont]).width
        let footerX = width - 18 - ceil(footerWidth)
        if !copy.place.isEmpty {
            let place = "Near \(copy.place)"
            let placeWidth = max(40, footerX - 26)
            drawText(place, x: 18, y: footerY, width: placeWidth, font: footerFont, color: muted, kern: 0, lines: 1)
        }
        drawText(copy.footer, x: footerX, y: footerY, width: ceil(footerWidth) + 2, font: footerFont, color: amber, kern: 0, lines: 1)
    }

    private static func drawAccent(in rect: CGRect, context: CGContext) {
        let colors = [
            UIColor(red: 0.961, green: 0.647, blue: 0.141, alpha: 1).cgColor,
            UIColor(red: 0.878, green: 0.478, blue: 0.184, alpha: 1).cgColor
        ] as CFArray
        guard let gradient = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: colors, locations: [0, 1]) else { return }
        context.saveGState()
        context.clip(to: rect)
        context.drawLinearGradient(
            gradient,
            start: CGPoint(x: rect.minX, y: rect.midY),
            end: CGPoint(x: rect.maxX, y: rect.midY),
            options: []
        )
        context.restoreGState()
    }

    private static func drawFade(over rect: CGRect, context: CGContext) {
        let colors = [
            background.withAlphaComponent(0).cgColor,
            background.withAlphaComponent(0.15).cgColor,
            background.cgColor
        ] as CFArray
        guard let gradient = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: colors, locations: [0, 0.45, 1]) else { return }
        context.drawLinearGradient(
            gradient,
            start: CGPoint(x: rect.midX, y: rect.minY + rect.height * 0.28),
            end: CGPoint(x: rect.midX, y: rect.maxY),
            options: []
        )
    }

    private static func drawAspectFill(_ image: UIImage, in rect: CGRect) {
        let size = image.size
        guard size.width > 0, size.height > 0 else { return }
        let scale = max(rect.width / size.width, rect.height / size.height)
        let drawn = CGSize(width: size.width * scale, height: size.height * scale)
        let origin = CGPoint(x: rect.midX - drawn.width / 2, y: rect.midY - drawn.height / 2)
        image.draw(in: CGRect(origin: origin, size: drawn))
    }

    private static func drawReticle(in rect: CGRect, context: CGContext) {
        let side: CGFloat = 78
        let box = CGRect(x: rect.midX - side / 2, y: rect.midY - side / 2 - 28, width: side, height: side)
        let length: CGFloat = 18
        context.setStrokeColor(amber.cgColor)
        context.setLineWidth(2)
        context.setLineCap(.round)
        let corners: [(CGPoint, CGPoint, CGPoint)] = [
            (CGPoint(x: box.minX, y: box.minY), CGPoint(x: 1, y: 0), CGPoint(x: 0, y: 1)),
            (CGPoint(x: box.maxX, y: box.minY), CGPoint(x: -1, y: 0), CGPoint(x: 0, y: 1)),
            (CGPoint(x: box.minX, y: box.maxY), CGPoint(x: 1, y: 0), CGPoint(x: 0, y: -1)),
            (CGPoint(x: box.maxX, y: box.maxY), CGPoint(x: -1, y: 0), CGPoint(x: 0, y: -1))
        ]
        for corner in corners {
            context.move(to: corner.0)
            context.addLine(to: CGPoint(x: corner.0.x + corner.1.x * length, y: corner.0.y + corner.1.y * length))
            context.move(to: corner.0)
            context.addLine(to: CGPoint(x: corner.0.x + corner.2.x * length, y: corner.0.y + corner.2.y * length))
        }
        context.strokePath()
    }

    @discardableResult
    private static func drawPill(_ text: String, x: CGFloat, y: CGFloat, font: UIFont, height: CGFloat) -> CGFloat {
        let labelWidth = ceil((text as NSString).size(withAttributes: [.font: font]).width)
        let width = labelWidth + 16
        let rect = CGRect(x: x, y: y, width: width, height: height)
        let path = UIBezierPath(roundedRect: rect, cornerRadius: height / 2)
        UIColor.white.withAlphaComponent(0.16).setFill()
        path.fill()
        let textRect = CGRect(x: x + 8, y: y + (height - font.lineHeight) / 2, width: labelWidth + 1, height: font.lineHeight)
        drawText(text, x: textRect.minX, y: textRect.minY, width: textRect.width, font: font, color: .white, kern: 0, lines: 1)
        return width
    }

    private static func drawText(
        _ text: String,
        x: CGFloat,
        y: CGFloat,
        width: CGFloat,
        font: UIFont,
        color: UIColor,
        kern: CGFloat,
        lines: Int
    ) {
        guard width > 1, !text.isEmpty else { return }
        let height = textHeight(text, font: font, width: width, lines: lines, kern: kern)
        let paragraph = NSMutableParagraphStyle()
        paragraph.lineBreakMode = .byTruncatingTail
        let attributes: [NSAttributedString.Key: Any] = [
            .font: font,
            .foregroundColor: color,
            .paragraphStyle: paragraph,
            .kern: kern
        ]
        let rect = CGRect(x: x, y: y, width: width, height: height)
        (text as NSString).draw(with: rect, options: [.usesLineFragmentOrigin, .truncatesLastVisibleLine], attributes: attributes, context: nil)
    }

    private static func textHeight(_ text: String, font: UIFont, width: CGFloat, lines: Int, kern: CGFloat) -> CGFloat {
        let paragraph = NSMutableParagraphStyle()
        paragraph.lineBreakMode = .byWordWrapping
        let rect = (text as NSString).boundingRect(
            with: CGSize(width: width, height: .greatestFiniteMagnitude),
            options: [.usesLineFragmentOrigin],
            attributes: [.font: font, .kern: kern, .paragraphStyle: paragraph],
            context: nil
        )
        let cap = ceil(font.lineHeight * CGFloat(max(lines, 1)) + 1)
        return min(cap, max(ceil(font.lineHeight), ceil(rect.height)))
    }

    private static func appFont(size: CGFloat, weight: UIFont.Weight, design: UIFontDescriptor.SystemDesign) -> UIFont {
        let base = UIFont.systemFont(ofSize: size, weight: weight)
        guard let descriptor = base.fontDescriptor.withDesign(design) else { return base }
        return UIFont(descriptor: descriptor, size: size)
    }
}

struct ShareCardSheet: View {
    let discovery: DiscoveryRecord
    @Environment(\.dismiss) private var dismiss
    @State private var cardImage: UIImage?
    @State private var activityItems: [Any] = []
    @State private var showActivity = false

    private var spoken: String {
        ShareCardComposer.accessibilityLabel(ShareCardComposer.compose(DiscoverySharing.draft(discovery)))
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                GeometryReader { geo in
                    let aspect = ShareCardMetrics.width / ShareCardMetrics.height
                    let width = min(geo.size.width, max(geo.size.height, 1) * aspect)
                    let height = width / aspect
                    ZStack {
                        if let cardImage {
                            Image(uiImage: cardImage)
                                .resizable()
                                .interpolation(.high)
                                .frame(width: width, height: height)
                                .shadow(color: .black.opacity(0.28), radius: 18, y: 10)
                                .accessibilityLabel(spoken)
                        } else {
                            ProgressView("Drawing the card")
                                .tint(Theme.amber)
                        }
                    }
                    .frame(width: geo.size.width, height: geo.size.height)
                }
                Text("The card image is shared with the written find.")
                    .font(.caption)
                    .foregroundStyle(Theme.muted)
                    .multilineTextAlignment(.center)
                Button("Share") { presentShare() }
                    .buttonStyle(PrimaryButtonStyle())
                    .disabled(cardImage == nil)
                    .accessibilityHint("Opens the share sheet with the card and the written find")
            }
            .padding(20)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .journalCanvas()
            .navigationTitle("Share card")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
            .sheet(isPresented: $showActivity) {
                ActivityView(items: activityItems)
                    .presentationDetents([.medium, .large])
            }
            .onAppear(perform: drawCard)
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
    }

    private func drawCard() {
        let copy = ShareCardComposer.compose(DiscoverySharing.draft(discovery))
        cardImage = ShareCardRenderer.render(copy: copy, photo: ImageStore.load(discovery.imageFilename))
    }

    private func presentShare() {
        guard let cardImage else { return }
        let title = discovery.title.trimmingCharacters(in: .whitespacesAndNewlines)
        activityItems = [
            ShareImageItem(image: cardImage, title: title.isEmpty ? "Untitled find" : title),
            DiscoveryShareText.plain(DiscoverySharing.draft(discovery))
        ]
        showActivity = true
        Haptics.impact(.light)
    }
}

final class ShareImageItem: NSObject, UIActivityItemSource {
    let image: UIImage
    let title: String

    init(image: UIImage, title: String) {
        self.image = image
        self.title = title
    }

    func activityViewControllerPlaceholderItem(_ activityViewController: UIActivityViewController) -> Any {
        image
    }

    func activityViewController(_ activityViewController: UIActivityViewController, itemForActivityType activityType: UIActivity.ActivityType?) -> Any? {
        image
    }

    func activityViewController(_ activityViewController: UIActivityViewController, subjectForActivityType activityType: UIActivity.ActivityType?) -> String {
        title
    }

    func activityViewControllerLinkMetadata(_ activityViewController: UIActivityViewController) -> LPLinkMetadata? {
        let metadata = LPLinkMetadata()
        metadata.title = title
        metadata.imageProvider = NSItemProvider(object: image)
        return metadata
    }
}

