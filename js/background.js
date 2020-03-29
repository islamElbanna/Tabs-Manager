var CMD_UPDATE_IMAGE = "updateImage"
var CMD_GET_TABS_DETAILS = "getTabs"
var CMD_REMOVE_TAB = "removeTab"
var CMD_RECORD_TAB_IMAGE = "recordTab"
var CMD_INDEX_TAB = "indexTab";

var TABS_DETAILS_IMGAGE = "img"
var TABS_DETAILS_TITLE = "title"
var TABS_DETAILS_ICON = "icon"
var TABS_DETAILS_URL = "url"
var TABS_DETAILS_PINNED = "pinned"
var TABS_DETAILS_WINDOW_ID = "window"

var tabsDetails = {};
var indexedWindows = {};
var loadingImg = {};

var index = lunr(function () {
  this.field('url', {boost: 10});
  this.field('title', {boost: 5});
  this.field('content');
  this.ref('id');
})

function capturePage(tabId){
  save(tabId);
  chrome.tabs.captureVisibleTab({quality: 12}, function(screenshotUrl) {
    var lastError = chrome.runtime.lastError;
    if (!lastError) {
      chrome.tabs.query({active: true}, function(tabs){
        if(tabs[0].id == tabId)
          saveImage(tabId, screenshotUrl);
        else {
          capturePage(tabs[0].id);
          if(!tabsDetails[tabId] || !tabsDetails[tabId][TABS_DETAILS_IMGAGE])
            chrome.tabs.get(tabId, captureTabImageManualy);
        }
      });
    } else{
      chrome.tabs.get(tabId, captureTabImageManualy);
    }
  });
}

function removeAll(){
  tabsDetails = {};
}

function remove(tabId){
  delete tabsDetails[tabId];
  index.remove(tabId);
  updateCounterBadge();
}

function saveImage(tabId, image){
  if(image){
    loadingImg[tabId] = 0;
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
    if(tab){
      saveTab(tab);
      updateCounterBadge();
    }
  });
}

function saveTab(tab){
  var tabDetails = {};
  if(tabsDetails[tab.id])
    tabDetails = tabsDetails[tab.id];
  tabDetails[TABS_DETAILS_ICON] = tab.favIconUrl;
  tabDetails[TABS_DETAILS_TITLE] = tab.title;
  tabDetails[TABS_DETAILS_PINNED] = tab.pinned;
  tabDetails[TABS_DETAILS_WINDOW_ID] = tab.windowId;
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

function captureTabImageManualy(tab, callback){
  if(loadingImg[tab.id] > 0)
    return;
  var url = tab.url;
  if(url.indexOf("chrome://") == -1 
    && url.indexOf("chrome-extension://") == -1 
    && url.indexOf("chrome-search://") == -1
    && url.indexOf("youtube.com") == -1){
    console.log("Loading tab: " + tab.id);
    loadingImg[tab.id]++;
    chrome.tabs.executeScript(tab.id, {file: "js/full-content.js"}, callback);
  }
}

function indexTabs(tabs){
  for(var i in tabs){
    indexedWindows[tabs[i].windowId] = true;
    saveTab(tabs[i]);
  }

  load_tab_img(tabs, 0);
}

function load_tab_img(tabs, index){
  if(index >= tabs.length){
    return;
  }

  captureTabImageManualy(tabs[index], function(){
    loadingImg[tabs[index].id] = 0;
    load_tab_img(tabs, index++);
  });
}

function indexTabContent(tab, content){
  index.add({
    id: tab.id,
    title: tab.title.replace("/", " ").replace("-", " "),
    url: extractDomain(tab.url).replace("www.", "").replace(".", " "),
    content: content
  })
}

function updateCounterBadge(size){
  if(!size)
    size = Object.keys(tabsDetails).length;
  if(size)
    chrome.browserAction.setBadgeText({text: size + ""});
}

chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
  if(request.cmd == CMD_RECORD_TAB_IMAGE){
    save(sender.tab.id);
    saveImage(sender.tab.id, request.image)
  } if(request.cmd == CMD_INDEX_TAB){
    indexTabContent(sender.tab, request.content);
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
    });
});

// Start Indexing tabs of all windows
chrome.tabs.query({}, function(tabs){
  indexTabs(tabs);
  updateCounterBadge(tabs.length);
});
