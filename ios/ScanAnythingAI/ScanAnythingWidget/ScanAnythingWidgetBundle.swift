import SwiftUI
import WidgetKit

@main
struct ScanAnythingWidgetBundle: WidgetBundle {
    var body: some Widget {
        StreakWidget()
        if #available(iOS 18.0, *) {
            ScanControl()
        }
    }
}
