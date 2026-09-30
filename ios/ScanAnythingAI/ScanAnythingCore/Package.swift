// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "ScanAnythingCore",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(name: "ScanAnythingCore", targets: ["ScanAnythingCore"])
    ],
    targets: [
        .target(name: "ScanAnythingCore"),
        .testTarget(name: "ScanAnythingCoreTests", dependencies: ["ScanAnythingCore"])
    ]
)
