// =====================
// Constants
// =====================
const CMD_UPDATE_IMAGE = "updateImage";
const CMD_GET_TABS_DETAILS = "getTabs";
const CMD_REMOVE_TAB = "removeTab";
const CMD_RECORD_TAB_IMAGE = "recordTab";

const TABS_DETAILS_IMAGE = "img";
const TABS_DETAILS_IMAGE_LOADING = "loading";
const TABS_DETAILS_TITLE = "title";
const TABS_DETAILS_ICON = "icon";
const TABS_DETAILS_URL = "url";
const TABS_DETAILS_PINNED = "pinned";
const TABS_DETAILS_WINDOW_ID = "window";

const IMG_NO_IMAGE = "img/no-image.png";
const MAX_IMG_RETRIES = 3;

// =====================
// Utility Functions
// =====================
const isDefined = v => typeof v !== 'undefined' && v !== NaN;

const extractDomain = url => {
    if (!url) return "Other";
    let domain = url;
    if (url.includes("chrome-extension://")) {
        domain = url.split('chrome-extension://')[1];
    }
    if (domain.includes('://')) {
        domain = domain.split('://')[1];
    }
    if (domain.includes('/')) {
        domain = domain.split('/')[0];
    }
    return domain.split(':')[0];
};

// =====================
// Tab Details Storage
// =====================
function setTabDetails(tabId, tabDetails) {
    chrome.storage.local.set({ [tabId.toString()]: tabDetails });
}

function getTabsDetails(tabIds, callback) {
    const keys = tabIds.filter(Boolean).map(id => id.toString());
    chrome.storage.local.get(keys).then(details => {
        keys.forEach(key => { if (!details[key]) details[key] = {}; });
        callback(details);
    });
}

function getTabDetails(tabId, callback) {
    getTabsDetails([tabId], tabsDetails => {
        if (tabId) callback(tabsDetails[tabId.toString()]);
    });
}

function updateTabDetails(tabId, updates) {
    getTabDetails(tabId, tabDetails => {
        Object.assign(tabDetails, updates);
        setTabDetails(tabId, tabDetails);
    });
}

function removeTabDetails(tabId) {
    console.debug("Removing tab details: " + tabId);
    chrome.storage.local.remove(tabId.toString());
}

function cleanTabDetails() {
    chrome.storage.local.get(null, details => {
        Object.keys(details).forEach(tabId => {
            if (tabId) {
                const id = parseInt(tabId);
                chrome.tabs.get(id).catch(lastError => {
                    console.debug("Tab Id not found: " + tabId, lastError);
                    removeTabDetails(id);
                });
            }
        });
    });
}

// =====================
// Tab Image Handling
// =====================
function saveImage(tabId, image) {
    if (!image) return;
    console.debug("Got image for tab: " + tabId);
    getTabDetails(tabId, tabDetails => {
        if (image === IMG_NO_IMAGE && tabDetails[TABS_DETAILS_IMAGE]) {
            image = tabDetails[TABS_DETAILS_IMAGE];
        }
        updateTabDetails(tabId, {
            [TABS_DETAILS_IMAGE_LOADING]: false,
            [TABS_DETAILS_IMAGE]: image,
        });
    });
    chrome.runtime.sendMessage({
        cmd: CMD_UPDATE_IMAGE,
        tabId,
        img: image
    }).catch(lastError => {
        console.debug("No one to get the message of: " + CMD_UPDATE_IMAGE, lastError);
    });
}

function capturePage(tabId) {
    console.debug('Capture Visible Tab; ' + tabId);
    chrome.tabs.captureVisibleTab({
        quality: 1,
        format: "jpeg"
    }).then(screenshotUrl => {
        chrome.tabs.query({ active: true }, tabs => {
            if (tabs[0].id === tabId) {
                saveImage(tabId, screenshotUrl);
            }
        });
    }).catch(lastError => {
        console.debug('oops, something went wrong!', lastError);
        indexTabImage(tabId);
    });
}

function indexTabImage(tabId) {
    getTabDetails(tabId, tabDetails => {
        if (!retryManualImgCapture(tabDetails)) return;
        // Capture the image from the page itself.
        console.debug("Manually capture tab image: " + tabId);
        chrome.scripting.executeScript({
            target: { tabId },
            files: ["js/lib/html2canvas.min.js", "js/content.js"]
        }).then(() => {
            updateTabDetails(tabId, { [TABS_DETAILS_IMAGE_LOADING]: Date.now() });
        }).catch(error => {
            console.error('oops, something went wrong!', error);
            saveImage(tabId, IMG_NO_IMAGE);
        });
    });
}

function retryManualImgCapture(details) {
    return !isDefined(details[TABS_DETAILS_IMAGE]) &&
        (!details[TABS_DETAILS_IMAGE_LOADING] || (Date.now() - details[TABS_DETAILS_IMAGE_LOADING]) > 10000);
}

// =====================
// Tab CRUD
// =====================
function save(tabId) {
    chrome.tabs.get(tabId).then(saveTab).catch(lastError => {
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

function remove(tabId) {
    removeTabDetails(tabId);
    updateCurrentCounterBadge();
}

// =====================
// Tab Indexing
// =====================
function indexTabs(tabs) {
    tabs.forEach(saveTab);
}

function indexTabsImages(tabs) {
    tabs.forEach(tab => indexTabImage(tab.id));
}

// =====================
// Badge Handling
// =====================
function updateCurrentCounterBadge() {
    chrome.tabs.query({}, tabs => updateCounterBadge(tabs.length));
}

function updateCounterBadge(size) {
    chrome.action.setBadgeText({ text: String(size) });
}

// =====================
// Event Listeners
// =====================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.cmd === CMD_RECORD_TAB_IMAGE) {
        save(sender.tab.id);
        saveImage(sender.tab.id, request.image);
    } else if (request.cmd === CMD_GET_TABS_DETAILS) {
        getTabsDetails(request.tabsIds, sendResponse);
        return true; // keep message channel open for async response
    }
});

chrome.tabs.onActivated.addListener(activeInfo => {
    getTabDetails(activeInfo.tabId, () => capturePage(activeInfo.tabId));
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    remove(tabId);
    chrome.runtime.sendMessage({
        cmd: CMD_REMOVE_TAB,
        tabId
    }).catch(lastError => {
        console.debug("No one to get the message of: " + CMD_REMOVE_TAB, lastError);
    });
});

chrome.tabs.onMoved.addListener(tabId => save(tabId));

chrome.tabs.onZoomChange.addListener(zoomChangeInfo => capturePage(zoomChangeInfo.tabId));

chrome.tabs.onCreated.addListener(tab => {
    saveTab(tab);
    capturePage(tab.id);
    updateCurrentCounterBadge();
});

// =====================
// Initial Indexing
// =====================
chrome.tabs.query({}, tabs => {
    updateCounterBadge(tabs.length);
    indexTabs(tabs);
    indexTabsImages(tabs);
    cleanTabDetails();
});
