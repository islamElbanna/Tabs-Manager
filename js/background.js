var CMD_UPDATE_IMAGE = "updateImage"
var CMD_GET_TABS_DETAILS = "getTabs"
var CMD_REMOVE_TAB = "removeTab"
var CMD_RECORD_TAB_IMAGE = "recordTab"

var TABS_DETAILS_IMGAGE = "img"
var TABS_DETAILS_IMGAGE_LOADING = "loading"
var TABS_DETAILS_TITLE = "title"
var TABS_DETAILS_ICON = "icon"
var TABS_DETAILS_URL = "url"
var TABS_DETAILS_PINNED = "pinned"
var TABS_DETAILS_WINDOW_ID = "window"

var IMG_NO_IMAGE = "img/no-image.png"
var MAX_IMG_RETRIES = 3;

function isDefined(v) {
    return typeof v !== 'undefined' && v !== NaN;
}

function updateTabDetails(tabId, updates) {
    getTabDetails(tabId, (tabDetails) => {
        Object.keys(updates).forEach(key => {
            tabDetails[key] = updates[key];
        });
        setTabDetails(tabId, tabDetails);
    });
}

function setTabDetails(tabId, tabDetails) {
    chrome.storage.local.set({
        [tabId.toString()]: tabDetails
    });
}

function getTabsDetails(tabIds, callback) {
    let keys = [];
    tabIds.forEach((tabId, i) => {
        if (tabId) {
            keys.push(tabId.toString());
        }
    });
    return chrome.storage.local.get(keys).then(function(details){
        keys.forEach((key, j) => {
            if (!details[key])
                details[key] = {};
        });
        callback(details);
    });
}

function getTabDetails(tabId, callback) {
    return getTabsDetails([tabId], (tabsDetails) => {
        if(tabId) {
            callback(tabsDetails[tabId.toString()]);
        }
    });
}

function cleanTabDetails() {
    chrome.storage.local.get(null, (details) => {
        Object.keys(details).forEach(tabId => {
            if(tabId) {
                let id = parseInt(tabId);
                chrome.tabs.get(id).catch(function(lastError) {
                    console.debug("Tab Id not found: " + tabId, lastError)
                    removeTabDetails(id);
                });
            }
        });
    });
}

function removeTabDetails(tabId) {
    console.debug("Removing tab details: " + tabId);
    return chrome.storage.local.remove(tabId.toString());
}

function capturePage(tabId) {
    console.debug('Capture Visible Tab; ' + tabId);
    chrome.tabs.captureVisibleTab({ 
        quality: 1, 
        format: "jpeg"
    }).then(function(screenshotUrl) {
        chrome.tabs.query({ active: true }, function(tabs) {
            let currentTabId = tabs[0].id;
            if (currentTabId == tabId) {
                saveImage(tabId, screenshotUrl);
            }
        });
    }).catch(function (lastError) {
        console.debug('oops, something went wrong!', lastError);
        indexTabImage(tabId);
    });
}

function indexTabImage(tabId){
    getTabDetails(tabId, function(tabDetails){
        if(!retryManualImgCapture(tabDetails)) {
            // Tab has image, so skip updating it since it is a heavy operation.
            return;
        }

        // Capture the image from the page itself.
        console.debug("Manually capture tab image: " + tabId);
        chrome.scripting.executeScript({
            target: {tabId: tabId},
            files: ["js/lib/html2canvas.min.js", "js/content.js"]
        }).then(function(){
            updateTabDetails(tabId, {[TABS_DETAILS_IMGAGE_LOADING]: true});
        }).catch(function (error) {
            console.error('oops, something went wrong!', error);
            saveImage(tabId, IMG_NO_IMAGE);
        });
    });
}

function remove(tabId) {
    removeTabDetails(tabId);
    updateCurrentCounterBadge()
}

function saveImage(tabId, image) {
    if (image) {
        console.debug("Got image for tab: " + tabId);
        getTabDetails(tabId, (tabDetails) => {
            console.debug("Save image for tab: " + tabId);
            if (image === IMG_NO_IMAGE && tabDetails[TABS_DETAILS_IMGAGE]) {
                image = tabDetails[TABS_DETAILS_IMGAGE];
            }
            updateTabDetails(tabId, {
                [TABS_DETAILS_IMGAGE_LOADING]: false,
                [TABS_DETAILS_IMGAGE]: image,
            });
        });
        chrome.runtime.sendMessage({ 
            cmd: CMD_UPDATE_IMAGE, 
            tabId: tabId, 
            img: image 
        }).catch(function(lastError) {
            console.debug("No one to get the message of: " + CMD_UPDATE_IMAGE, lastError);
        });
    }
}

function save(tabId) {
    chrome.tabs.get(tabId).then(function(tab) {
        saveTab(tab);
    }).catch(function(lastError){
        console.debug("oops, error fetching tab ID: " + tabId, lastError);
    });
}

function saveTab(tab) {
    updateTabDetails(tab.id, {
        [TABS_DETAILS_ICON]: tab.favIconUrl,
        [TABS_DETAILS_TITLE]: tab.title,
        [TABS_DETAILS_PINNED]: tab.pinned,
        [TABS_DETAILS_WINDOW_ID]: tab.windowId,
        [TABS_DETAILS_URL]: extractDomain(tab.url)
    });
}

function extractDomain(url) {
    let domain;

    if (!url) {
        return "Other";
    }

    if (url.indexOf("chrome-extension://") > -1) {
        url = url.split('chrome-extension://')[1];
    }

    //find & remove protocol (http, ftp, etc.) and get domain
    domain = url;
    if (domain.indexOf("://") > -1) {
        domain = domain.split('://')[1];
    }

    if (domain.indexOf("/") > -1) {
        domain = domain.split('/')[0];
    }

    //find & remove port number
    domain = domain.split(':')[0];

    return domain;
}

function indexTabs(tabs) {
    for (let index = 0; index < tabs.length; index++) {
        saveTab(tabs[index]);
    }
}

function indexTabsImages(tabs) {
    for (let index = 0; index < tabs.length; index++) {
        indexTabImage(tabs[index].id);
    }
}

function updateCurrentCounterBadge() {
    chrome.tabs.query({}, function(tabs) {
        updateCounterBadge(tabs.length);
    });
}

function updateCounterBadge(size) {
    chrome.action.setBadgeText({ text: size + "" });
}

function retryManualImgCapture(details){
    return !isDefined(details[TABS_DETAILS_IMGAGE])
        && !details[TABS_DETAILS_IMGAGE_LOADING];
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.cmd == CMD_RECORD_TAB_IMAGE) {
        save(sender.tab.id);
        saveImage(sender.tab.id, request.image);
    } else if (request.cmd == CMD_GET_TABS_DETAILS) {
        getTabsDetails(request.tabsIds, sendResponse);

        // return true from the event listener to indicate you wish to send a response asynchronously
        // (this will keep the message channel open to the other end until sendResponse is called).
        return true;
    }
});

chrome.tabs.onActivated.addListener(function(activeInfo) {
    getTabDetails(activeInfo.tabId, function(tabDetails){
        capturePage(activeInfo.tabId);
    });
});

chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
    remove(tabId);
    chrome.runtime.sendMessage({ 
        cmd: CMD_REMOVE_TAB, 
        tabId: tabId 
    }).catch(function(lastError) {
        console.debug("No one to get the message of: " + CMD_REMOVE_TAB, lastError);
    });
});

chrome.tabs.onMoved.addListener(function(tabId) {
    save(tabId);
});

chrome.tabs.onZoomChange.addListener(function(ZoomChangeInfo) {
    capturePage(ZoomChangeInfo.tabId);
});

chrome.tabs.onCreated.addListener(function(tab) {
    saveTab(tab);
    capturePage(tab.id);
    updateCurrentCounterBadge();
});


// Start Indexing tabs of all windows
chrome.tabs.query({}, function(tabs) {
    updateCounterBadge(tabs.length);
    indexTabs(tabs);
    indexTabsImages(tabs);
    cleanTabDetails();
});
