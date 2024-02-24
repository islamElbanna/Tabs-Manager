var CMD_UPDATE_IMAGE = "updateImage"
var CMD_GET_TABS_DETAILS = "getTabs"
var CMD_REMOVE_TAB = "removeTab"
var CMD_RECORD_TAB_IMAGE = "recordTab"

var TABS_DETAILS_IMGAGE = "img"
var TABS_DETAILS_TITLE = "title"
var TABS_DETAILS_ICON = "icon"
var TABS_DETAILS_URL = "url"
var TABS_DETAILS_PINNED = "pinned"
var TABS_DETAILS_WINDOW_ID = "window"

function setTabDetails(tabId, tabDetails) {
    chrome.storage.local.set({
        [tabId.toString()]: tabDetails
    });
}

function getTabsDetails(tabIds, callback) {
    let keys = [];
    tabIds.forEach((tabId, i) => {
        keys.push(tabId.toString());
    });
    return chrome.storage.local.get(keys, (details) => {
        keys.forEach((key, j) => {
            if (!details[key])
                details[key] = {};
        });
        callback(details);
    });
}

function getTabDetails(tabId, callback) {
    return getTabsDetails([tabId], (tabsDetails) => {
        callback(tabsDetails[tabId.toString()]);
    });
}

function cleanTabDetails() {
    chrome.storage.local.get(null, (details) => {
        Object.keys(details).forEach(tabId => {
            let id = parseInt(tabId);
            console.debug("Getting tab of: " + id);
            chrome.tabs.get(id, () => {
                var lastError = chrome.runtime.lastError;
                if (lastError) {
                    removeTabDetails(id);
                }
            });
        });
    });
}

function removeTabDetails(tabId) {
    console.debug("Removing tab details: " + tabId);
    return chrome.storage.local.remove(tabId.toString());
}

function capturePage(tabId) {
    console.log('Capture Visible Tab; ' + tabId);
    save(tabId);
    chrome.tabs.captureVisibleTab({ quality: 1 }, function(screenshotUrl) {
        var lastError = chrome.runtime.lastError;
        if (!lastError) {
            chrome.tabs.query({ active: true }, function(tabs) {
                let currentTabId = tabs[0].id;
                if (currentTabId == tabId) {
                    saveImage(tabId, screenshotUrl);
                }
            });
        }
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
            tabDetails = !tabDetails ? {} : tabDetails;
            tabDetails[TABS_DETAILS_IMGAGE] = image;
            setTabDetails(tabId, tabDetails);
        });
        chrome.runtime.sendMessage({ cmd: CMD_UPDATE_IMAGE, tabId: tabId, img: image }, function() {
            if (chrome.runtime.lastError) {
                console.debug("No one to get the message of: " + CMD_UPDATE_IMAGE);
            }
        });
        save(tabId);
    }
}

function save(tabId) {
    chrome.tabs.get(tabId, function(tab) {
        var lastError = chrome.runtime.lastError;
        if (tab) {
            saveTab(tab);
        }
    });
}

function saveTab(tab) {
    getTabDetails(tab.id, (tabDetails) => {
        tabDetails = !tabDetails ? {} : tabDetails;
        tabDetails[TABS_DETAILS_ICON] = tab.favIconUrl;
        tabDetails[TABS_DETAILS_TITLE] = tab.title;
        tabDetails[TABS_DETAILS_PINNED] = tab.pinned;
        tabDetails[TABS_DETAILS_WINDOW_ID] = tab.windowId;
        tabDetails[TABS_DETAILS_URL] = extractDomain(tab.url);
        setTabDetails(tab.id, tabDetails);
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

function updateCurrentCounterBadge() {
    chrome.tabs.query({}, function(tabs) {
        updateCounterBadge(tabs.length);
    });
}

function updateCounterBadge(size) {
    chrome.action.setBadgeText({ text: size + "" });
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
    capturePage(activeInfo.tabId);
});

chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
    remove(tabId);
    chrome.runtime.sendMessage({ cmd: CMD_REMOVE_TAB, tabId: tabId }, function() {
        if (chrome.runtime.lastError) {
            console.debug("No one to get the message of: " + CMD_REMOVE_TAB);
        }
    });
});

chrome.tabs.onMoved.addListener(function(tabId) {
    save(tabId);
});

chrome.tabs.onZoomChange.addListener(function(ZoomChangeInfo) {
    capturePage(ZoomChangeInfo.tabId);
});

// Start Indexing tabs of all windows
chrome.tabs.query({}, function(tabs) {
    updateCounterBadge(tabs.length);
    indexTabs(tabs);
    cleanTabDetails();
});
