import UIKit
import Capacitor
import SafariServices

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationDidBecomeActive(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // sportsarchive:// URL scheme callback → WebView로 전달
        if url.scheme == "sportsarchive" {
            let urlString = url.absoluteString
            let js = "window.__handleOAuthCallback?.('\(urlString)')"
            if let vc = window?.rootViewController as? CAPBridgeViewController {
                vc.webView?.evaluateJavaScript(js, completionHandler: nil)
            }
            // Safari 닫기
            if let presented = window?.rootViewController?.presentedViewController as? SFSafariViewController {
                presented.dismiss(animated: true)
            }
            return true
        }
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }
}
