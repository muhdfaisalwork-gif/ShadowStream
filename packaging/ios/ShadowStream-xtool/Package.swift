// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "ShadowStream",
    platforms: [
        .iOS(.v16),
        .macOS(.v13)
    ],
    products: [
        .executable(
            name: "ShadowStream",
            targets: ["ShadowStream"]
        ),
    ],
    dependencies: [],
    targets: [
        .executableTarget(
            name: "ShadowStream",
            dependencies: [],
            path: "Sources",
            resources: [
                .process("../Resources")
            ]
        ),
    ]
)
