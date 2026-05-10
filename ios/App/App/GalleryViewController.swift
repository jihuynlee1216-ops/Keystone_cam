import UIKit
import WebKit
import Capacitor
import Photos

class GalleryViewController: CAPBridgeViewController {

    override func viewDidLoad() {
        super.viewDidLoad()
        webView?.configuration.userContentController
            .add(GallerySaveHandler(webView: webView), name: "saveToGallery")
    }
}

class GallerySaveHandler: NSObject, WKScriptMessageHandler {
    weak var webView: WKWebView?

    init(webView: WKWebView?) {
        self.webView = webView
    }

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard message.name == "saveToGallery",
              let dict = message.body as? [String: String],
              let base64 = dict["data"],
              let mimeType = dict["type"],
              let data = Data(base64Encoded: base64) else {
            callback(error: "Invalid data")
            return
        }

        let isVideo = mimeType.hasPrefix("video")

        PHPhotoLibrary.requestAuthorization(for: .addOnly) { [weak self] status in
            guard status == .authorized || status == .limited else {
                self?.callback(error: "사진 앨범 접근 권한이 필요합니다")
                return
            }

            if isVideo {
                // 영상: 임시 파일로 저장 후 앨범에 추가
                let tmpURL = FileManager.default.temporaryDirectory.appendingPathComponent("export.mp4")
                try? data.write(to: tmpURL)

                PHPhotoLibrary.shared().performChanges({
                    PHAssetChangeRequest.creationRequestForAssetFromVideo(atFileURL: tmpURL)
                }) { success, error in
                    try? FileManager.default.removeItem(at: tmpURL)
                    if success {
                        self?.callback(error: nil)
                    } else {
                        self?.callback(error: error?.localizedDescription ?? "저장 실패")
                    }
                }
            } else {
                // 사진
                PHPhotoLibrary.shared().performChanges({
                    let request = PHAssetCreationRequest.forAsset()
                    request.addResource(with: .photo, data: data, options: nil)
                }) { success, error in
                    if success {
                        self?.callback(error: nil)
                    } else {
                        self?.callback(error: error?.localizedDescription ?? "저장 실패")
                    }
                }
            }
        }
    }

    private func callback(error: String?) {
        DispatchQueue.main.async {
            if let err = error {
                let escaped = err.replacingOccurrences(of: "'", with: "\\'")
                self.webView?.evaluateJavaScript("window.__galleryCallback?.('" + escaped + "')")
            } else {
                self.webView?.evaluateJavaScript("window.__galleryCallback?.(null)")
            }
        }
    }
}
