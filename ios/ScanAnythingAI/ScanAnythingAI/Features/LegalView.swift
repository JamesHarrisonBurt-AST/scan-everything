import SwiftUI

enum LegalDocument: String, Hashable, Identifiable {
    case privacy
    case terms
    var id: String { rawValue }
}

struct LegalView: View {
    let document: LegalDocument

    var body: some View {
        ScrollView {
            Text(bodyText)
                .font(.body)
                .foregroundStyle(Theme.ink)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(20)
        }
        .journalCanvas()
        .navigationTitle(document == .privacy ? "Privacy" : "Terms")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var bodyText: String {
        switch document {
        case .privacy:
            return """
            Scan Anything AI keeps your journal on this iPhone.

            Photos, notes, collections, XP, and chat about a find are stored locally with SwiftData. They are not uploaded to a Scan Anything account, because this version of the app does not have one.

            If you add an AI key, the photo you scan and the question you ask are sent to the base URL you configure, so that service can identify the object or answer you. The key itself is stored in the iOS Keychain. You can remove it in Profile.

            On-device text and barcode reading happens with Apple Vision and does not leave the phone.

            If barcode lookup is on (it is, unless you turn it off in Profile), a product code is sent to Open Food Facts, Open Beauty Facts, and Open Products Facts. Those are public product catalogs. The photo is not included in that lookup. A catalog may also supply its own front photo when you save a code without taking a picture.

            If you turn on location tags, the app requests location only while you are using it, and attaches an approximate place name to the find you just saved.

            You can export the journal or erase it from Profile. Erasing deletes local photos and records. It does not delete data a third-party AI provider may have logged under their own policy.
            """
        case .terms:
            return """
            Scan Anything AI is a personal field journal. Identifications can be wrong. Do not rely on them for safety, medical, legal, or financial decisions. Read labels and official sources yourself when it matters.

            Estimated value is a qualitative label, not an appraisal or a price.

            Names from public barcode catalogs can be incomplete or wrong. Read the package yourself when it matters.

            You are responsible for the API key you enter and for complying with the terms of the AI service you point the app at.

            The app is provided as-is for exploration and learning. Keep your own backups if a discovery matters to you. Export is available from Profile.
            """
        }
    }
}
