import UIKit
import WebKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?
    private var webView: WKWebView?

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {

        let cfg = WKWebViewConfiguration()
        cfg.allowsInlineMediaPlayback = true
        cfg.mediaTypesRequiringUserActionForPlayback = []
        let wv = WKWebView(frame: UIScreen.main.bounds, configuration: cfg)
        wv.allowsBackForwardNavigationGestures = true
        wv.scrollView.bounces = true

        let url = URL(string: "https://ssmoviestvs.site")!
        wv.load(URLRequest(url: url))

        let win = UIWindow(frame: UIScreen.main.bounds)
        win.rootViewController = UIViewController()
        win.rootViewController?.view = wv
        win.makeKeyAndVisible()

        self.window = win
        self.webView = wv
        return true
    }
}
