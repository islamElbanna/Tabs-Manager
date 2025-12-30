const CMD_GET_TABS_DETAILS = "getTabs";
const CMD_REMOVE_TAB = "removeTab";
const CMD_UPDATE_IMAGE = "updateImage";

const TABS_DETAILS_IMAGE = "img";
const TABS_DETAILS_TITLE = "title";
const TABS_DETAILS_ICON = "icon";
const TABS_DETAILS_URL = "url";
const TABS_DETAILS_PINNED = "pinned";
const TABS_DETAILS_WINDOW_ID = "window";

const IMG_LOADING_IMAGE = "img/loading-image.gif";

let lastSearch = "";
let thumbnailSize = "";

const escapeHtml = (unsafe) => {
    if (!unsafe) return "";
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

// =====================
// Initialization
// =====================
function load() {
    loadOptions();
    buildWindowTabs();
    addGlobalEvents();
}

function loadOptions() {
    chrome.storage.sync.get({ favoriteThumbnailSize: 'medium-thumbnail' }, items => {
        thumbnailSize = items.favoriteThumbnailSize;
    });
}

function buildWindowTabs() {
    chrome.tabs.query({}, tabs => {
        const tabIds = tabs.map(tab => tab.id);
        retrieveTabsDetails(tabIds);
    });
}

function retrieveTabsDetails(tabIds) {
    chrome.runtime.sendMessage({ cmd: CMD_GET_TABS_DETAILS, tabsIds: tabIds }, tabsDetails => {
        if (Object.keys(tabsDetails).length !== tabIds.length) {
            $("#indexing").show();
        }
        const filterVal = $("#filter").val();
        if (filterVal) {
            const index = lunr(function() {
                this.field('url', { boost: 10 });
                this.field('title', { boost: 5 });
                this.ref('id');
            });
            for (const i in tabsDetails) {
                const tab = tabsDetails[i];
                index.add({ id: i, title: tab[TABS_DETAILS_TITLE], url: tab[TABS_DETAILS_URL] });
            }
            const filteredTabs = index.search(filterVal);
            const toBeRemoved = Object.keys(tabsDetails).filter(n => !filteredTabs.map(k => k.ref).includes(n));
            for (const i of toBeRemoved) {
                delete tabsDetails[i];
            }
        }
        loadTabs(tabsDetails);
    });
}

function loadTabs(tabsDetails) {
    getCurrentWindow(w => {
        document.getElementById('tabsList').innerHTML = buildTabs(tabsDetails, w.id);
        addEvents();
        $("#filter").focus();
    });
}

function buildTabs(tabsDetails, currentWindowId) {
    const tabsGroups = groupTabs(tabsDetails);
    const sortedGroups = sortGroups(tabsGroups);
    const windowIdMapping = getWindowIdMapping(tabsDetails, currentWindowId);
    const windowsCount = Object.keys(windowIdMapping).length;
    let windowId;
    for (const i in tabsDetails) windowId = tabsDetails[i][TABS_DETAILS_WINDOW_ID];
    let tabsList = "";
    for (const group of sortedGroups) {
        if (!tabsGroups[group]) continue;
        const groupTabsDetails = tabsGroups[group];
        let groupIcon = getGroupIcon(group, groupTabsDetails);
        let classTag = "";
        let isOthersGroup = false;
        let groupName = group;
        if (group === "others") {
            isOthersGroup = true;
            classTag = "important-header";
            groupName = "Tabs from different domains";
        } else if (group === "pinned") {
            isOthersGroup = true;
            classTag = "important-header";
            groupName = "Pinned Tabs";
        }
        const groupWindows = {};
        for (const i in groupTabsDetails) {
            groupWindows[groupTabsDetails[i][TABS_DETAILS_WINDOW_ID]] = 1;
        }
        const groupWindowsCount = Object.keys(groupWindows).length;
        let groupSection = `<div class="card">
            <div class="card-header ${classTag}"><img src="${groupIcon}" class="groupIcon">${escapeHtml(groupName)}`;
        if (groupWindowsCount === 1 && windowsCount > 1)
            groupSection += getWindowBadge(windowId, windowIdMapping[Object.keys(groupWindows)[0]]);
        groupSection += `<a title="Close Group" class="closeGroup"><span class="fa fa-trash-o"></span></a></div>
            <div class="card-body">${buildGroupTabs(groupTabsDetails, windowIdMapping, groupWindowsCount, isOthersGroup)}</div></div>`;
        tabsList += groupSection;
    }
    return tabsList;
}

function getWindowIdMapping(tabsDetails, currentWindowId) {
    const windowIdMapping = { [currentWindowId]: 1 };
    let windowsIndex = 2;
    for (const i in tabsDetails) {
        const windowId = tabsDetails[i][TABS_DETAILS_WINDOW_ID];
        if (!windowIdMapping[windowId]) {
            windowIdMapping[windowId] = windowsIndex++;
        }
    }
    return windowIdMapping;
}

function buildGroupTabs(groupTabsDetails, windowIdMapping, windowsCount, isOthersGroup) {
    let groupSection = "";
    for (const tabId in groupTabsDetails) {
        const tabDetails = groupTabsDetails[tabId];
        if (tabDetails[TABS_DETAILS_TITLE]) {
            const img = getImage(tabDetails[TABS_DETAILS_IMAGE]);
            const title = escapeHtml(tabDetails[TABS_DETAILS_TITLE]);
            const url = escapeHtml(tabDetails[TABS_DETAILS_URL]);
            const icon = tabDetails[TABS_DETAILS_ICON];
            const windowId = tabDetails[TABS_DETAILS_WINDOW_ID];
            if (!thumbnailSize) thumbnailSize = "medium-thumbnail";
            groupSection += `<div class="card item ${thumbnailSize}" id="${tabId}">
                <div class="card-body card" tabId="${tabId}" windowId="${windowId}">`;
            if (windowsCount > 1) {
                groupSection += getWindowBadge(windowId, windowIdMapping[windowId]);
            }
            groupSection += `<a class="thumbnailImg tab" href="#"><img src="${img}" /></a></div>
                <div class="card-footer"><div class="title-section">`;
            if (isOthersGroup) {
                groupSection += `<img src="${icon}" class="groupIcon">`;
            }
            groupSection += `<span title="${title}">${title}</span></div>
                <div class="control-section">
                    <a tabId="${tabId}" windowId="${windowId}" title="Close" class="closeTab"><span class="fa fa-trash-o"></span></a>
                    <a class="zoomTab" title="Zoom In" href="${img}" data-lighter><span class="fa fa-arrows-alt"></span></a>
                </div></div></div>`;
        }
    }
    return groupSection;
}

function getWindowBadge(windowId, windowMapping) {
    let ele = `<span class="badge badge-warning window-badge" windowId="${windowId}">`;
    ele += windowMapping === 1 ? 'Current Window' : `Window #${windowMapping}`;
    ele += '</span>';
    return ele;
}

function groupTabs(tabsDetails) {
    const tabsGroups = {};
    const pinnedGroup = {};
    for (const tabId in tabsDetails) {
        const tabDetails = tabsDetails[tabId];
        if (tabDetails[TABS_DETAILS_PINNED]) {
            pinnedGroup[tabId] = tabDetails;
        } else if (tabsGroups[tabDetails[TABS_DETAILS_URL]]) {
            tabsGroups[tabDetails[TABS_DETAILS_URL]][tabId] = tabDetails;
        } else {
            tabsGroups[tabDetails[TABS_DETAILS_URL]] = { [tabId]: tabDetails };
        }
    }
    const othersGroup = {};
    for (const group in tabsGroups) {
        if (Object.keys(tabsGroups[group]).length === 1) {
            Object.assign(othersGroup, tabsGroups[group]);
            delete tabsGroups[group];
        }
    }
    if (Object.keys(pinnedGroup).length > 0) tabsGroups["pinned"] = pinnedGroup;
    if (Object.keys(othersGroup).length > 0) tabsGroups["others"] = othersGroup;
    return tabsGroups;
}

function sortGroups(groups) {
    const keys = Object.keys(groups).filter(k => k !== "others" && k !== "pinned");
    const sortedGroups = keys.sort();
    sortedGroups.push("others");
    sortedGroups.unshift("pinned");
    return sortedGroups;
}

function getGroupIcon(groupName, groupTabsDetails) {
    if (groupName === "others") return "img/other.ico";
    if (groupName === "pinned") return "img/pin.png";
    for (const tabId in groupTabsDetails) {
        if (groupTabsDetails[tabId][TABS_DETAILS_ICON]) {
            return groupTabsDetails[tabId][TABS_DETAILS_ICON];
        }
    }
    return "img/other.ico";
}

function getImage(img) {
    return (!img || img === "NoImage") ? IMG_LOADING_IMAGE : img;
}


function addEvents() {
    //move the image in pixel
    let move = -15;

    //zoom percentage, 1.2 =120%
    let zoom = 1.2;

    //On mouse over those thumbnail
    $('.item').hover(function() {

        //Set the width and height according to the zoom percentage
        width = $('.item').width() * zoom;
        height = $('.item').height() * zoom;

        //Move and zoom the image
        $(this).find('.thumbnail img').stop(false, true).animate({ 'width': width, 'height': height, 'top': move, 'left': move }, { duration: 200 });

        //Display the caption
        $(this).find('div.caption').stop(false, true).fadeIn(200);
    }, function() {
        //Reset the image
        $(this).find('.thumbnail img').stop(false, true).animate({ 'width': $('.item').width(), 'height': $('.item').height(), 'top': '0', 'left': '0' }, { duration: 100 });

        //Hide the caption
        $(this).find('div.caption').stop(false, true).fadeOut(200);
    });

    $(".item .card-body").bind("click", function(e) {
        let tabId = $(this).attr("tabId");
        let windowId = $(this).attr("windowId");
        activateWindow(windowId, function() {
            chrome.tabs.update(parseInt(tabId), { active: true });
            window.close();
        });
    });

    $(".closeTab").bind("click", function(tabCloseImage) {
        let tabId = $(this).attr("tabId");
        let windowId = $(this).attr("windowId");
        activateWindow(windowId, function() {
            chrome.tabs.remove(parseInt(tabId));
        });
    });

    $(".window-badge").bind("click", function() {
        let windowId = $(this).attr("windowId");
        activateWindow(windowId, function() {});
    });

    $(".closeGroup").bind("click", function() {
        $(this).parent().parent().find(".closeTab").each(function() {
            $(this).click();
        });
    });

    $(".card-header").bind("click", function() {
        $(this).parent().find(".card-body").slideToggle();
    });

    $("#filter").bind("keyup", function() {
        if (lastSearch != $("#filter").val()) {
            lastSearch = $("#filter").val();
            load();
        }
    });
}

function activateWindow(windowId, callBack) {
    getCurrentWindow(function(w) {
        if (w.id != windowId)
            chrome.windows.update(parseInt(windowId), { focused: true }, function() {
                callBack();
            });
        else
            callBack();
    });
}

function getCurrentWindow(callBack) {
    chrome.windows.getCurrent({}, callBack);
}

function addGlobalEvents() {
    // Server
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.cmd == CMD_UPDATE_IMAGE) {
            let tabId = request.tabId;
            let img = request.img;
            if (img) {
                $("#" + tabId).find(".thumbnailImg").each(function() {
                    $(this).find("img").each(function() {
                        $(this).attr("src", img);
                    });
                });
                $("#" + tabId).find(".zoomTab").each(function() {
                    $(this).attr("href", img);
                });
            }
        } else if (request.cmd == CMD_REMOVE_TAB) {
            let id = request.tabId;
            let group = $("#" + id).parent().parent();
            $("#" + id).remove();
            if ($(group).find(".item").length == 0) {
                $(group).remove();
            }
        }
    });
}

load();

$('#go-to-options').click(function() {
    if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
    } else {
        window.open(chrome.runtime.getURL('options.html'));
    }
});