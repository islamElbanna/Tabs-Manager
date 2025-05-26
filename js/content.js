var CMD_RECORD_TAB_IMAGE = "recordTab";
var IMAGE_QUALITY = 1.0;
var DOM_LIMIT = 7000;
var IMG_NO_IMAGE = "img/no-image.png"

console.debug("Running content again");

if (document.getElementsByTagName("*").length <= DOM_LIMIT) { // Fix me issue https://github.com/niklasvh/html2canvas/issues/835
    html2canvas(document.body, {
        useCORS: true,
        foreignObjectRendering: true,
        width: width(),
        height: height(),
        imageTimeout: 2000,
        logging: false,
        ignoreElements: (x) => {
            if (new Set(['META', 'TITLE']).has(x.tagName)) {
                return true;
            }

            if (x.hasAttribute("nonce")) {
                return true;
            }

            if (window.getComputedStyle(x).display === "none" 
                || window.getComputedStyle(x).visibility === "hidden") {
                return true;
            }
            return false;
        }
    }).then(function(canvas) {
        var myImage = canvas.toDataURL("image/jpeg", IMAGE_QUALITY);
        chrome.runtime.sendMessage({ cmd: CMD_RECORD_TAB_IMAGE, image: myImage });
    }).catch(function (error) {
        console.error('oops, something went wrong!', error);
        chrome.runtime.sendMessage({ cmd: CMD_RECORD_TAB_IMAGE, image: IMG_NO_IMAGE });
    });
} else {
    console.log('Can not index this page as that exceeds the dom limit of +' + DOM_LIMIT);
    chrome.runtime.sendMessage({ cmd: CMD_RECORD_TAB_IMAGE, image: IMG_NO_IMAGE });
}

function width() {
    return window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth || 0;
}

function height() {
    let height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight || 0;
    return height - 5;
}
