var CMD_RECORD_TAB_IMAGE = "recordTab";
var IMAGE_QUALITY = 0.5;
var DOM_LIMIT = 7000;

console.log("Running full-content again");

if (document.getElementsByTagName("*").length <= DOM_LIMIT) { // Fix me issue https://github.com/niklasvh/html2canvas/issues/835
    html2canvas(document.body, {
        allowTaint: true,
        useCORS: true,
        foreignObjectRendering: true,
        width: width(),
        height: height(),
        imageTimeout: 2000,
        logging: false
    }).then(function(canvas) {
        var myImage = canvas.toDataURL("image/jpeg", IMAGE_QUALITY);
        chrome.runtime.sendMessage({ cmd: CMD_RECORD_TAB_IMAGE, image: myImage });
    });
}

function getText(tag) {
    var text = "";
    var all = document.getElementsByTagName(tag);
    for (var i = 0, max = all.length; i < max; i++) {
        text += all[i].innerHTML + " ";
    }
    return text;
}

function width() {
    return window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth || 0;
}

function height() {
    let height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight || 0;
    return height - 5;
}