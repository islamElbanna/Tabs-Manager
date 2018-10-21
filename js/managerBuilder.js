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

function load(){
	loadOptions();
	buildWindowTabs();	
	addGlobalEvents();
}

function loadOptions(){
	chrome.storage.sync.get({
    	favoriteThumbnailSize: 'medium-thumbnail',
  	}, function(items) {
    	thumbnail_size = items.favoriteThumbnailSize;
  	});
}

function buildWindowTabs(){
	chrome.tabs.query({}, function(tabs){
		var tabsIds = [];
		for(var i = 0; i < tabs.length; i++)
			tabsIds[i] = tabs[i].id; 
		retrieveTabsDetails(tabsIds);
	});
}

function retrieveTabsDetails(tabsIds){
	chrome.extension.sendMessage({cmd: CMD_GET_TABS_DETAILS, tabsIds: tabsIds, searchText: $("#filter").val()}, function(tabsdDetails){
		if(Object.keys(tabsdDetails).length != tabsIds.length)
			$("#indexing").show();
		loadTabs(tabsdDetails);
	});
} 

function loadTabs(tabsDetails){
	getCurrentWindow(function(w){
		document.getElementById('tabsList').innerHTML = buildTabs(tabsDetails, w.id);
		addEvents();
		$("#filter").focus();
	});
}

function buildTabs(tabsdDetails, currentWindowId){
	var tabsGroups = groupTabs(tabsdDetails);	
	var sortedGroups = sortGroups(tabsGroups);

	var windowIdMpping = getWindowIdMapping(tabsdDetails, currentWindowId);
	var windowsCount = Object.keys(windowIdMpping).length;

	var windowId;
	for (var i in tabsdDetails)
		windowId = tabsdDetails[i][TABS_DETAILS_WINDOW_ID];

	var tabsList = "";
	for(var i in sortedGroups){
		var group = sortedGroups[i];
		if(!tabsGroups[group])
			continue;

  		var groupTabsDetails = tabsGroups[group];
		var groupIcon = getGroupIcon(group, groupTabsDetails);
		
		var classTag = "";
		var isOthersGroup = false;
		if(group == "others"){
			isOthersGroup = true;
			classTag = "important-header";
			group = "Tabs from different domains";
		} else if(group == "pinned"){
			isOthersGroup = true;
			classTag = "important-header";
			group = "Pinned Tabs";
		}

		var groupWindows = {};
		for (var i in groupTabsDetails)
			groupWindows[groupTabsDetails[i][TABS_DETAILS_WINDOW_ID]] = 1;
		var groupWindowsCount = Object.keys(groupWindows).length;		

		var groupSection = '<div class="card">'+
  								'<div class="card-header '+ classTag +'"><img src="'+ groupIcon +'" class="groupIcon">'+ group;
  									if(groupWindowsCount == 1 && windowsCount > 1)
										groupSection += getWindowBadge(windowId, windowIdMpping[Object.keys(groupWindows)[0]]);
  									groupSection += '<a title="Close Group" class="closeGroup"><span class="fa fa-trash-o" ></span></a>'+
  								'</div>'+
  								'<div class="card-body">'+
  									buildGroupTabs(groupTabsDetails, windowIdMpping, groupWindowsCount, isOthersGroup) +
  								'</div>'+
  							'</div>';
  		tabsList += groupSection;
	}

    return tabsList;
}

function getWindowIdMapping(tabsdDetails, currentWindowId){
	var windowIdMpping = {};
	windowIdMpping[currentWindowId] = 1;
	var windowsIndex = 2;
	for (var i in tabsdDetails) {
		var windowId = tabsdDetails[i][TABS_DETAILS_WINDOW_ID];
		if(!windowIdMpping[windowId]){
			windowIdMpping[windowId] = windowsIndex++;
		}
	}
	return windowIdMpping;
}

function buildGroupTabs(groupTabsDetails, windowIdMpping, windowsCount, isOthersGroup){
	var groupSection = "";
	for (var tabId in groupTabsDetails) {
    	var tabDetails = groupTabsDetails[tabId];
    	if(tabDetails[TABS_DETAILS_TITLE]){
	    	var img = getImage(tabDetails[TABS_DETAILS_IMGAGE]);
	    	var title = tabDetails[TABS_DETAILS_TITLE];
	    	var url = tabDetails[TABS_DETAILS_URL];
	    	var icon = tabDetails[TABS_DETAILS_ICON];
	    	var windowId = tabDetails[TABS_DETAILS_WINDOW_ID];
	    	if(thumbnail_size == "")
	    		thumbnail_size = "medium-thumbnail";
	        groupSection += '<div class="card item '+ thumbnail_size +'" id="'+ tabId +'">' +
	        					'<div class="card-body" tabId="'+ tabId +'" windowId="'+ windowId +'">';
	        						if(windowsCount > 1)
										groupSection += getWindowBadge(windowId, windowIdMpping[windowId]);
					groupSection += '<a class="thumbnailImg tab" href="#" >'+
										'<img src="'+ img +'" />'+
									'</a>'+
								'</div>'+	
								'<div class="card-footer">'+
									'<div class="title-section">';
										if(isOthersGroup)
											groupSection += '<img src="'+ icon +'" class="groupIcon">';
										groupSection += '<span title="'+ title +'">'+ title +'</span>'+
									'</div>'+
									'<div class="control-section">'+
										'<a tabId="'+ tabId +'" windowId="'+ windowId +'" title="Close" class="closeTab"><span class="fa fa-trash-o" ></span></a>'+ 
										'<a class="zoomTab" title="Zoom In" href="'+ img +'" data-lighter><span class="fa fa-arrows-alt" ></span></a>'+		
									'</div>'+
								'</div>'+
							'</div>';
		}
    }
    return groupSection;
}

function getWindowBadge(windowId, windowMapping){
	var ele = '<span class="badge badge-warning window-badge" windowId="'+ windowId +'">';
	if(windowMapping == 1)
		ele += 'Current Window';
	else
		ele += 'Window #'+ windowMapping;
	ele += '</span>';
	return ele;
}

function groupTabs(tabsdDetails){
	var tabsGroups = {};
	var pinnedGroup = {};
	for (var tabId in tabsdDetails) {
		var tabDetails = tabsdDetails[tabId];
		if(tabDetails[TABS_DETAILS_PINNED]){
			pinnedGroup[tabId] = tabDetails;
		} else if(tabsGroups[tabDetails[TABS_DETAILS_URL]]){
			tabsGroups[tabDetails[TABS_DETAILS_URL]][tabId] = tabDetails;
		} else {
			var list = {};
			list[tabId] = tabDetails;
			tabsGroups[tabDetails[TABS_DETAILS_URL]] = list; 
		}
	}

	var othersGroup = {};
	for(var group in  tabsGroups){
		if(Object.keys(tabsGroups[group]).length == 1){
			var groupTabs = tabsGroups[group];
			for(var tabId in groupTabs){
				othersGroup[tabId] = groupTabs[tabId];
			}
			delete tabsGroups[group];
		}
	}

	if(Object.keys(pinnedGroup).length > 0)
		tabsGroups["pinned"] = pinnedGroup;

	if(Object.keys(othersGroup).length > 0)
		tabsGroups["others"] = othersGroup;

	return tabsGroups;
}

function sortGroups(groups){
	var keys = []
	for (k in groups) {
	  if (k != "others" && k != "pinned" && groups.hasOwnProperty(k)) {
	    keys.push(k);
	  }
	}
	var sortedGroups = keys.sort();
	sortedGroups.push("others");
	sortedGroups.unshift("pinned");
	return sortedGroups;
}

function getGroupIcon(groupName, groupTabsDetails){
	var icon = "img/other.ico";
	if(groupName == "others")
		return icon;
	else if (groupName == "pinned")
		return "img/pin.png";
	else			
		for (var tabId in groupTabsDetails)
			if(groupTabsDetails[tabId][TABS_DETAILS_ICON])
				icon = groupTabsDetails[tabId][TABS_DETAILS_ICON];
	return icon;
}

function getImage(img){
	if (!img || img == "NoImage")
		img = IMG_NO_IMAGE;
	return img;
}


function addEvents(){
	//move the image in pixel
	var move = -15;
	
	//zoom percentage, 1.2 =120%
	var zoom = 1.2;

	//On mouse over those thumbnail
	$('.item').hover(function() {
		
		//Set the width and height according to the zoom percentage
		width = $('.item').width() * zoom;
		height = $('.item').height() * zoom;
		
		//Move and zoom the image
		$(this).find('.thumbnail img').stop(false,true).animate({'width':width, 'height':height, 'top':move, 'left':move}, {duration:200});
		
		//Display the caption
		$(this).find('div.caption').stop(false,true).fadeIn(200);
	}, function() {
		//Reset the image
		$(this).find('.thumbnail img').stop(false,true).animate({'width':$('.item').width(), 'height':$('.item').height(), 'top':'0', 'left':'0'}, {duration:100});	

		//Hide the caption
		$(this).find('div.caption').stop(false,true).fadeOut(200);
	});

	$(".item .card-body").bind("click", function(e){
		var tabId = $(this).attr("tabId");
		var windowId = $(this).attr("windowId");
		activateWindow(windowId, function(){
			chrome.tabs.update(parseInt(tabId), {active: true});
			window.close();
		});
	});

	$(".closeTab").bind("click", function(tabCloseImage){
		var tabId = $(this).attr("tabId");
		var windowId = $(this).attr("windowId");
		activateWindow(windowId, function(){
			chrome.tabs.remove(parseInt(tabId));
		});
	});

	$(".window-badge").bind("click", function(){
		var windowId = $(this).attr("windowId");
		activateWindow(windowId, function(){});
	});

	$(".closeGroup").bind("click", function(){
		$(this).parent().parent().find(".closeTab").each(function(){
			$(this).click();
		});
	});

	$(".card-header").bind("click", function(){
		$(this).parent().find(".card-body").slideToggle();
	});

	$("#filter").bind("keyup", function() {
		if(lastSearch != $("#filter").val()){
   			lastSearch = $("#filter").val();
   			load(); 
		}
	});
}

function activateWindow(windowId, callBack){
	getCurrentWindow(function(w){
		if(w.id != windowId)
			chrome.windows.update(parseInt(windowId), {focused: true}, function(){
				callBack();
			});	
		else 
			callBack();
	});
}

function getCurrentWindow(callBack){
	chrome.windows.getCurrent({}, callBack);
}

function addGlobalEvents(){
	// Server
	chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
	  if(request.cmd == CMD_UPDATE_IMAGE){
	    var tabId = request.tabId;
	    var img = request.img;
	    if(img && img != "NoImage"){
			$("#" + tabId).find(".thumbnailImg").each(function(){
				$(this).find("img").each(function(){
					$(this).attr("src", img);
				});
			});
			$("#" + tabId).find(".zoomTab").each(function(){
				$(this).attr("href", img);
			});
		}
	  } else if (request.cmd == CMD_REMOVE_TAB){
		var id = request.tabId;
	  	var group = $("#" + id).parent().parent();
		$("#" + id).remove();
		if($(group).find(".item").length == 0){
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
