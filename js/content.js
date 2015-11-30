html2canvas($("body"), {
    onrendered: function(canvas) {
        // canvas is the final rendered <canvas> element
        var myImage = canvas.toDataURL("image/jpeg", 0.5);
        chrome.runtime.sendMessage({cmd: "recordTab", image: myImage});
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