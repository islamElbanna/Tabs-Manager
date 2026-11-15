// Idempotency guard & site exclusions:
// Skip DOM-invasive html2canvas on video/SPA sites like YouTube where it interferes with menus and playback.
// Native captureVisibleTab handles these cleanly when the tab is active.
const isExcludedSite = Boolean(window.location?.hostname && window.location.hostname.includes("youtube.com"));

if (!isExcludedSite && !window.tabsManagerCaptured && !window.tabsManagerCaptureRunning) {
    window.tabsManagerCaptureRunning = true;

    const CMD_RECORD_TAB_IMAGE = "recordTab";
    const IMAGE_QUALITY = 0.5;
    const DOM_LIMIT = 7000;
    const IMG_NO_IMAGE = "img/no-image.png";

    console.debug("Running content script for tab image capture");

    // Helper functions
    const getWidth = () => window.innerWidth || document.documentElement?.clientWidth || document.body?.clientWidth || 0;
    const getHeight = () => {
        const h = window.innerHeight || document.documentElement?.clientHeight || document.body?.clientHeight || 0;
        return Math.max(h - 5, 0);
    };

    const shouldIgnoreElement = el => {
        const ignoredTags = new Set([
            'META', 'TITLE', 'SCRIPT', 'NOSCRIPT', 'STYLE',
            'VIDEO', 'AUDIO', 'IFRAME', 'OBJECT', 'EMBED'
        ]);
        if (ignoredTags.has(el.tagName)) return true;
        if (el.hasAttribute && el.hasAttribute("nonce")) return true;
        try {
            const style = window.getComputedStyle(el);
            return style.display === "none" || style.visibility === "hidden";
        } catch (_) {
            return false;
        }
    };

    function sendTabImage(image) {
        window.tabsManagerCaptureRunning = false;
        window.tabsManagerCaptured = true;
        try {
            chrome.runtime.sendMessage({ cmd: CMD_RECORD_TAB_IMAGE, image: image }).catch(err => {
                console.debug("Failed to deliver tab image:", err);
            });
        } catch (e) {
            console.debug("Extension context invalidated:", e);
        }
    }

    function captureTabImage() {
        const targetElement = document.body || document.documentElement;
        if (!targetElement) {
            sendTabImage(IMG_NO_IMAGE);
            return;
        }

        if (document.getElementsByTagName("*").length > DOM_LIMIT) {
            console.log(`Cannot index this page: DOM exceeds limit of ${DOM_LIMIT}`);
            sendTabImage(IMG_NO_IMAGE);
            return;
        }

        html2canvas(targetElement, {
            useCORS: true,
            foreignObjectRendering: false,
            width: getWidth(),
            height: getHeight(),
            imageTimeout: 2000,
            logging: false,
            ignoreElements: shouldIgnoreElement
        }).then(canvas => {
            try {
                const myImage = canvas.toDataURL("image/jpeg", IMAGE_QUALITY);
                if (myImage) {
                    sendTabImage(myImage);
                } else {
                    console.error('Failed to capture tab image');
                    sendTabImage(IMG_NO_IMAGE);
                }
            } catch (err) {
                console.error('Failed to export canvas:', err);
                sendTabImage(IMG_NO_IMAGE);
            }
        }).catch(error => {
            console.error('Error capturing tab image:', error);
            sendTabImage(IMG_NO_IMAGE);
        });
    }

    function scheduleCapture() {
        console.log('Scheduling tab image capture');
        if (document.readyState === 'complete') {
            console.log('Document is complete, capturing tab image');
            captureTabImage();
        } else {
            console.log('Document is not complete, waiting for load event');
            window.addEventListener('load', scheduleCapture, { once: true });
        }
    }

    scheduleCapture();
}
