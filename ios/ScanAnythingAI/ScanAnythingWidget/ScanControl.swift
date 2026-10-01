import AppIntents
import SwiftUI
import WidgetKit

@available(iOS 18.0, *)
struct ScanControl: ControlWidget {
    static let kind = "ai.scananything.app.scan"

    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: Self.kind) {
            ControlWidgetButton(action: OpenScannerIntent()) {
                Label("Scan", systemImage: "viewfinder")
            }
        }
        .displayName("Scan")
        .description("Open Scan Anything and point the camera at an object.")
    }
}
