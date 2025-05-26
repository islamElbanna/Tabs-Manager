const CMD_RECORD_TAB_IMAGE = "recordTab";
const IMAGE_QUALITY = 1.0;
const DOM_LIMIT = 7000;
const IMG_NO_IMAGE = "img/no-image.png";

console.debug("Running content script for tab image capture");

// Helper functions
const getWidth = () => window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth || 0;
const getHeight = () => {
    const h = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight || 0;
    return h - 5;
};

const shouldIgnoreElement = el => {
    const ignoredTags = new Set(['META', 'TITLE']);
    if (ignoredTags.has(el.tagName)) return true;
    if (el.hasAttribute("nonce")) return true;
    const style = window.getComputedStyle(el);
    return style.display === "none" || style.visibility === "hidden";
};

function sendTabImage(image) {
    chrome.runtime.sendMessage({ cmd: CMD_RECORD_TAB_IMAGE, image });
}

function captureTabImage() {
    if (document.getElementsByTagName("*").length > DOM_LIMIT) {
        console.log(`Cannot index this page: DOM exceeds limit of ${DOM_LIMIT}`);
        sendTabImage(IMG_NO_IMAGE);
        return;
    }
    html2canvas(document.body, {
        useCORS: true,
        foreignObjectRendering: true,
        width: getWidth(),
        height: getHeight(),
        imageTimeout: 2000,
        logging: false,
        ignoreElements: shouldIgnoreElement
    }).then(canvas => {
        const myImage = canvas.toDataURL("image/jpeg", IMAGE_QUALITY);
        sendTabImage(myImage);
    }).catch(error => {
        console.error('Error capturing tab image:', error);
        sendTabImage(IMG_NO_IMAGE);
    });
}

captureTabImage();
