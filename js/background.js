var tabsDetails = {};
var indexedWindows = {};

function capturePage(tabId){
  save(tabId)
  chrome.tabs.captureVisibleTab({quality: 12}, function(screenshotUrl) {
    var lastError = chrome.runtime.lastError;
    if (!lastError) {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
        if(tabs[0].id == tabId)
          saveImage(tabId, screenshotUrl);
        else if(!tabsDetails[tabId] || !tabsDetails[tabId]["img"])
          chrome.tabs.get(tabId, function(tab){ indexImages(Array(tab), 0)});
      });
    }
  });
}

function removeAll(){
  tabsDetails = {};
}

function remove(tabId){
  delete tabsDetails[tabId];
}

function saveImage(tabId, image){
  if(image){
    var tabDetails = {};
    if(tabsDetails[tabId])
      tabDetails = tabsDetails[tabId];
    tabDetails["img"] = image;
    tabsDetails[tabId] = tabDetails;
    chrome.runtime.sendMessage({cmd: "updateImage", tabId: tabId, img: image}, function(){
      var lastError = chrome.runtime.lastError;
    });
    save(tabId);
  }
}

function save(tabId){
  chrome.tabs.get(tabId, function(tab){
    saveTab(tab);
  });
}

function saveTab(tab){
  var tabDetails = {};
  if(tabsDetails[tab.id])
    tabDetails = tabsDetails[tab.id];
  tabDetails["icon"] = tab.favIconUrl;
  tabDetails["title"] = tab.title;
  tabDetails["url"] = extractDomain(tab.url);
  tabsDetails[tab.id] = tabDetails;
}

function extractDomain(url) {
    var domain;

    if(!url)
      return "Other";

    if(url.indexOf("chrome-extension://") > -1){
      url = url.split('chrome-extension://')[1];
    }

    //find & remove protocol (http, ftp, etc.) and get domain
    domain = url;
    if (domain.indexOf("://") > -1) {
        domain = domain.split('://')[1];
    } 

    if(domain.indexOf("/") > -1){
        domain = domain.split('/')[0];
    }

    //find & remove port number
    domain = domain.split(':')[0];

    return domain;
}

function indexImages(tabs, index){
  if(index >= tabs.length)
    return;
  var tab = tabs[index];
  chrome.tabs.executeScript(tab.id, {file: "js/full-content.js"}, function(){
    var lastError = chrome.runtime.lastError;
    if(lastError)
      saveImage(tab.id, "NoImage");
    indexImages(tabs, index + 1);
  });
}

function indexTabs(tabs){
  for(var i in tabs){
    saveTab(tabs[i]);
  }
}

chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
  if(request.cmd == "recordTab"){
    save(sender.tab.id);
    saveImage(sender.tab.id, request.image)
  } else if(request.cmd == "removeTab"){
    remove(request.tabId);
  } else if(request.cmd == "getTabs"){
    var requestedIds = request.tabsIds;
    var requestedTabsDetails = {};
    for (var i = 0; i< requestedIds.length; i++) {
      var tabId = requestedIds[i];
      if(tabsDetails[tabId])
        requestedTabsDetails[tabId] = tabsDetails[tabId];
    }
    sendResponse(requestedTabsDetails);  
  }
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
  capturePage(tabId);
});

chrome.tabs.onActivated.addListener(function(activeInfo){
  capturePage(activeInfo.tabId);
});

chrome.tabs.onRemoved.addListener(function(tabId, removeInfo){
  remove(tabId);
});

chrome.tabs.onZoomChange.addListener(function(ZoomChangeInfo){
  capturePage(ZoomChangeInfo.tabId); 
});

chrome.windows.onFocusChanged.addListener(function(windowId){
  if(windowId != chrome.windows.WINDOW_ID_NONE && !indexedWindows[windowId])
    chrome.tabs.query({windowId: windowId}, function(tabs){
      indexTabs(tabs);
      indexImages(tabs, 0);
    });
});

removeAll(); 
chrome.tabs.query({currentWindow: true}, function(tabs){
  indexedWindows[tabs[0].windowId] = true;
  indexTabs(tabs);
  indexImages(tabs, 0);
});
