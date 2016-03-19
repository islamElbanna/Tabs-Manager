var CMD_UPDATE_IMAGE = "updateImage"
var CMD_GET_TABS_DETAILS = "getTabs"
var CMD_REMOVE_TAB = "removeTab"
var CMD_RECORD_TAB_IMAGE = "recordTab"

var TABS_DETAILS_IMGAGE = "img"
var TABS_DETAILS_TITLE = "title"
var TABS_DETAILS_ICON = "icon"
var TABS_DETAILS_URL = "url"
var TABS_DETAILS_PINNED = "pinned"

var tabsDetails = {};
var indexedWindows = {};

var index = lunr(function () {
  this.field('url', {boost: 10});
  this.field('title', {boost: 5});
  this.ref('id');
})

function capturePage(tabId){
  save(tabId)
  chrome.tabs.captureVisibleTab({quality: 12}, function(screenshotUrl) {
    var lastError = chrome.runtime.lastError;
    if (!lastError) {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
        if(tabs[0].id == tabId)
          saveImage(tabId, screenshotUrl);
        else if(!tabsDetails[tabId] || !tabsDetails[tabId][TABS_DETAILS_IMGAGE])
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
  index.remove(tabId);
}

function saveImage(tabId, image){
  if(image){
    var tabDetails = {};
    if(tabsDetails[tabId])
      tabDetails = tabsDetails[tabId];
    tabDetails[TABS_DETAILS_IMGAGE] = image;
    tabsDetails[tabId] = tabDetails;
    chrome.runtime.sendMessage({cmd: CMD_UPDATE_IMAGE, tabId: tabId, img: image}, function(){
      var lastError = chrome.runtime.lastError;
    });
    save(tabId);
  }
}

function save(tabId){
  chrome.tabs.get(tabId, function(tab){
    var lastError = chrome.runtime.lastError;
    if(tab)
      saveTab(tab);
  });
}

function saveTab(tab){
  var tabDetails = {};
  if(tabsDetails[tab.id])
    tabDetails = tabsDetails[tab.id];
  tabDetails[TABS_DETAILS_ICON] = tab.favIconUrl;
  tabDetails[TABS_DETAILS_TITLE] = tab.title;
  tabDetails[TABS_DETAILS_PINNED] = tab.pinned;
  tabDetails[TABS_DETAILS_URL] = extractDomain(tab.url);
  tabsDetails[tab.id] = tabDetails;
  index.add({
    id: tab.id,
    title: tab.title,
    url: extractDomain(tab.url).replace("www.", "")
  })
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
    if(lastError && tab.active)
      capturePage(tab.id);
    indexImages(tabs, index + 1);
  });
}

function indexTabs(tabs){
  for(var i in tabs){
    saveTab(tabs[i]);
  }
}

chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
  if(request.cmd == CMD_RECORD_TAB_IMAGE){
    save(sender.tab.id);
    saveImage(sender.tab.id, request.image)
  } else if(request.cmd == CMD_GET_TABS_DETAILS){
    var requestedIds = request.tabsIds;
    if(request.searchText && request.searchText != ""){
      var filteredPages = index.search(request.searchText);
      var flags = {};
      for (var i = 0; i< filteredPages.length; i++)
        flags[filteredPages[i].ref] = true;

      var filteredTabs = [];
      for (var i = 0; i< requestedIds.length; i++) {
        if(flags[requestedIds[i]]){
          filteredTabs.push(requestedIds[i]);
        }
      }
      requestedIds = filteredTabs;
    }
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
  chrome.runtime.sendMessage({cmd: CMD_REMOVE_TAB, tabId: tabId});
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

// Start Indexing tabs of current window
chrome.tabs.query({currentWindow: true}, function(tabs){
  indexedWindows[tabs[0].windowId] = true;
  indexTabs(tabs);
  indexImages(tabs, 0);
});
