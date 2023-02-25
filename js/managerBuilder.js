var CMD_GET_TABS_DETAILS = "getTabs"
var CMD_REMOVE_TAB = "removeTab"
var CMD_UPDATE_IMAGE = "updateImage"

var TABS_DETAILS_IMGAGE = "img"
var TABS_DETAILS_TITLE = "title"
var TABS_DETAILS_ICON = "icon"
var TABS_DETAILS_URL = "url"
var TABS_DETAILS_PINNED = "pinned"
var TABS_DETAILS_WINDOW_ID = "window"

var IMG_NO_IMAGE = "img/no-image.png"

var lastSearch = "";
var thumbnail_size = ""

function load() {
    loadOptions();
    buildWindowTabs();
    addGlobalEvents();
}

function loadOptions() {
    chrome.storage.sync.get({
        favoriteThumbnailSize: 'medium-thumbnail',
    }, function(items) {
        thumbnail_size = items.favoriteThumbnailSize;
    });
}

function buildWindowTabs() {
    chrome.tabs.query({}, function(tabs) {
        let tabsIds = [];
        for (let i = 0; i < tabs.length; i++) {
            tabsIds[i] = tabs[i].id;
        }
        retrieveTabsDetails(tabsIds);
    });
}

function retrieveTabsDetails(tabsIds) {
    chrome.runtime.sendMessage({ cmd: CMD_GET_TABS_DETAILS, tabsIds: tabsIds }, function(tabsDetails) {
        if (Object.keys(tabsDetails).length != tabsIds.length) {
            $("#indexing").show();
        }
        if ($("#filter").val()) {
            var index = lunr(function() {
                this.field('url', { boost: 10 });
                this.field('title', { boost: 5 });
                this.ref('id');
            });
            for (let i in tabsDetails) {
                let tab = tabsDetails[i];
                index.add({
                    id: i,
                    title: tab[TABS_DETAILS_TITLE],
                    url: tab[TABS_DETAILS_URL]
                });
            }
            let filteredTabs = index.search($("#filter").val());
            let toBeRemoved = Object.keys(tabsDetails).filter(n => !filteredTabs.map(k => k.ref).includes(n));
            for (let i in toBeRemoved) {
                delete tabsDetails[toBeRemoved[i]];
            }
        }
        loadTabs(tabsDetails);
    });
}

function loadTabs(tabsDetails) {
    getCurrentWindow(function(w) {
        document.getElementById('tabsList').innerHTML = buildTabs(tabsDetails, w.id);
        addEvents();
        $("#filter").focus();
    });
}

function buildTabs(tabsdDetails, currentWindowId) {
    let tabsGroups = groupTabs(tabsdDetails);
    let sortedGroups = sortGroups(tabsGroups);

    let windowIdMpping = getWindowIdMapping(tabsdDetails, currentWindowId);
    let windowsCount = Object.keys(windowIdMpping).length;

    let windowId;
    for (let i in tabsdDetails)
        windowId = tabsdDetails[i][TABS_DETAILS_WINDOW_ID];

    let tabsList = "";
    for (let i in sortedGroups) {
        let group = sortedGroups[i];
        if (!tabsGroups[group])
            continue;

        let groupTabsDetails = tabsGroups[group];
        let groupIcon = getGroupIcon(group, groupTabsDetails);

        let classTag = "";
        let isOthersGroup = false;
        if (group == "others") {
            isOthersGroup = true;
            classTag = "important-header";
            group = "Tabs from different domains";
        } else if (group == "pinned") {
            isOthersGroup = true;
            classTag = "important-header";
            group = "Pinned Tabs";
        }

        let groupWindows = {};
        for (let i in groupTabsDetails) {
            groupWindows[groupTabsDetails[i][TABS_DETAILS_WINDOW_ID]] = 1;
        }
        let groupWindowsCount = Object.keys(groupWindows).length;

        let groupSection = '<div class="card">' +
            '<div class="card-header ' + classTag + '"><img src="' + groupIcon + '" class="groupIcon">' + group;
        if (groupWindowsCount == 1 && windowsCount > 1)
            groupSection += getWindowBadge(windowId, windowIdMpping[Object.keys(groupWindows)[0]]);
        groupSection += '<a title="Close Group" class="closeGroup"><span class="fa fa-trash-o" ></span></a>' +
            '</div>' +
            '<div class="card-body">' +
            buildGroupTabs(groupTabsDetails, windowIdMpping, groupWindowsCount, isOthersGroup) +
            '</div>' +
            '</div>';
        tabsList += groupSection;
    }

    return tabsList;
}

function getWindowIdMapping(tabsdDetails, currentWindowId) {
    let windowIdMpping = {};
    windowIdMpping[currentWindowId] = 1;
    let windowsIndex = 2;
    for (let i in tabsdDetails) {
        let windowId = tabsdDetails[i][TABS_DETAILS_WINDOW_ID];
        if (!windowIdMpping[windowId]) {
            windowIdMpping[windowId] = windowsIndex++;
        }
    }
    return windowIdMpping;
}

function buildGroupTabs(groupTabsDetails, windowIdMpping, windowsCount, isOthersGroup) {
    let groupSection = "";
    for (let tabId in groupTabsDetails) {
        let tabDetails = groupTabsDetails[tabId];
        if (tabDetails[TABS_DETAILS_TITLE]) {
            let img = getImage(tabDetails[TABS_DETAILS_IMGAGE]);
            let title = tabDetails[TABS_DETAILS_TITLE];
            let url = tabDetails[TABS_DETAILS_URL];
            let icon = tabDetails[TABS_DETAILS_ICON];
            let windowId = tabDetails[TABS_DETAILS_WINDOW_ID];
            if (thumbnail_size == "")
                thumbnail_size = "medium-thumbnail";
            groupSection += '<div class="card item ' + thumbnail_size + '" id="' + tabId + '">' +
                '<div class="card-body" tabId="' + tabId + '" windowId="' + windowId + '">';
            if (windowsCount > 1) {
                groupSection += getWindowBadge(windowId, windowIdMpping[windowId]);
            }
            groupSection += '<a class="thumbnailImg tab" href="#" >' +
                '<img src="' + img + '" />' +
                '</a>' +
                '</div>' +
                '<div class="card-footer">' +
                '<div class="title-section">';
            if (isOthersGroup) {
                groupSection += '<img src="' + icon + '" class="groupIcon">';
            }
            groupSection += '<span title="' + title + '">' + title + '</span>' +
                '</div>' +
                '<div class="control-section">' +
                '<a tabId="' + tabId + '" windowId="' + windowId + '" title="Close" class="closeTab"><span class="fa fa-trash-o" ></span></a>' +
                '<a class="zoomTab" title="Zoom In" href="' + img + '" data-lighter><span class="fa fa-arrows-alt" ></span></a>' +
                '</div>' +
                '</div>' +
                '</div>';
        }
    }
    return groupSection;
}

function getWindowBadge(windowId, windowMapping) {
    let ele = '<span class="badge badge-warning window-badge" windowId="' + windowId + '">';
    if (windowMapping == 1)
        ele += 'Current Window';
    else
        ele += 'Window #' + windowMapping;
    ele += '</span>';
    return ele;
}

function groupTabs(tabsdDetails) {
    let tabsGroups = {};
    let pinnedGroup = {};
    for (let tabId in tabsdDetails) {
        let tabDetails = tabsdDetails[tabId];
        if (tabDetails[TABS_DETAILS_PINNED]) {
            pinnedGroup[tabId] = tabDetails;
        } else if (tabsGroups[tabDetails[TABS_DETAILS_URL]]) {
            tabsGroups[tabDetails[TABS_DETAILS_URL]][tabId] = tabDetails;
        } else {
            let list = {};
            list[tabId] = tabDetails;
            tabsGroups[tabDetails[TABS_DETAILS_URL]] = list;
        }
    }

    let othersGroup = {};
    for (let group in tabsGroups) {
        if (Object.keys(tabsGroups[group]).length == 1) {
            let groupTabs = tabsGroups[group];
            for (let tabId in groupTabs) {
                othersGroup[tabId] = groupTabs[tabId];
            }
            delete tabsGroups[group];
        }
    }

    if (Object.keys(pinnedGroup).length > 0)
        tabsGroups["pinned"] = pinnedGroup;

    if (Object.keys(othersGroup).length > 0)
        tabsGroups["others"] = othersGroup;

    return tabsGroups;
}

function sortGroups(groups) {
    let keys = []
    for (k in groups) {
        if (k != "others" && k != "pinned" && groups.hasOwnProperty(k)) {
            keys.push(k);
        }
    }
    let sortedGroups = keys.sort();
    sortedGroups.push("others");
    sortedGroups.unshift("pinned");
    return sortedGroups;
}

function getGroupIcon(groupName, groupTabsDetails) {
    let icon = "img/other.ico";
    if (groupName == "others")
        return icon;
    else if (groupName == "pinned")
        return "img/pin.png";
    else
        for (var tabId in groupTabsDetails)
            if (groupTabsDetails[tabId][TABS_DETAILS_ICON]) {
                icon = groupTabsDetails[tabId][TABS_DETAILS_ICON];
            }
    return icon;
}

function getImage(img) {
    if (!img || img == "NoImage")
        img = IMG_NO_IMAGE;
    return img;
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
            if (img && img != "NoImage") {
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