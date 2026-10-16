import SwiftUI

@main
public struct ShadowStreamApp: App {
    public init() {}

    public var body: some Scene {
        WindowGroup {
            ContentView()
                .preferredColorScheme(.dark)
        }
        #if os(macOS)
        .windowStyle(.titleBar)
        .defaultSize(width: 1280, height: 820)
        #endif
    }
}
