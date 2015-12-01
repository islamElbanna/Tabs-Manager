var CMD_RECORD_TAB_IMAGE = "recordTab"
var quality = 0.5

html2canvas($("body"), {
    onrendered: function(canvas) {
        // canvas is the final rendered <canvas> element
        var myImage = canvas.toDataURL("image/jpeg", quality);
        chrome.runtime.sendMessage({cmd: CMD_RECORD_TAB_IMAGE, image: myImage});
    },
      useCORS: true,
      width: width(),
      height: height()
});

function width(){
   return window.innerWidth||document.documentElement.clientWidth||document.body.clientWidth||0;
}
function height(){
   return window.innerHeight||document.documentElement.clientHeight||document.body.clientHeight||0;
}