var CMD_GET_TABS_DETAILS = "getTabs"
var CMD_REMOVE_TAB = "removeTab"
var CMD_UPDATE_IMAGE = "updateImage"

var TABS_DETAILS_IMGAGE = "img"
var TABS_DETAILS_TITLE = "title"
var TABS_DETAILS_ICON = "icon"
var TABS_DETAILS_URL = "url"
var TABS_DETAILS_PINNED = "pinned"

var IMG_NO_IMAGE = "img/no-image.png"

function load(){
	buildWindowTabs();	
	addGlobalEvents();
}

function buildWindowTabs(){
	chrome.tabs.query({currentWindow: true}, function(tabs){
		var tabsIds = [];
		for(var i = 0; i < tabs.length; i++)
			tabsIds[i] = tabs[i].id; 
		retrieveTabsDetails(tabsIds);
	});
}

function retrieveTabsDetails(tabsIds){
	chrome.extension.sendMessage({cmd: CMD_GET_TABS_DETAILS, tabsIds: tabsIds}, function(tabsdDetails){
		if(Object.keys(tabsdDetails).length == tabsIds.length){
			loadTabs(tabsdDetails);
		} else {
			$("#indexing").show();
			loadTabs(tabsdDetails);
		}
	});
} 

function loadTabs(tabsdDetails){
	var tabsList = buildTabs(tabsdDetails);	
	document.getElementById('tabsList').innerHTML = tabsList;
	addEvents();
}

function buildTabs(tabsdDetails){
	var tabsGroups = groupTabs(tabsdDetails);	
	var sortedGroups = sortGroups(tabsGroups);

	var tabsList = "";
	for(var i in sortedGroups){
		var group = sortedGroups[i];
		if(!tabsGroups[group])
			continue;

  		var groupTabsDetails = tabsGroups[group];
		var groupIcon = getGroupIcon(group, groupTabsDetails);
		
		var classTag = "";
		if(group == "others"){
			classTag = "important-header"
			group = "Domains With Single Tab"
		} else if(group == "pinned"){
			classTag = "important-header"
			group = "Pinned Tabs"
		}

		var groupSection = '<div class="panel panel-default">'+
  								'<div class="panel-heading '+ classTag +'"><img src="'+ groupIcon +'" class="groupIcon">'+ group +
  								'<a title="Close Group" class="closeGroup"><span class="glyphicon glyphicon-remove" ></span></a>'+
  								'</div>'+
  								'<div class="panel-body">'+
  									buildGroupTabs(groupTabsDetails) +
  								'</div>'+
  							'</div>';
  		tabsList += groupSection;
	}

    return tabsList;
}

function buildGroupTabs(groupTabsDetails){
	var groupSection = "";
	for (var tabId in groupTabsDetails) {
    	var tabDetails = groupTabsDetails[tabId];
    	if(tabDetails[TABS_DETAILS_TITLE]){
	    	var img = getImage(tabDetails[TABS_DETAILS_IMGAGE]);
	    	var title = tabDetails[TABS_DETAILS_TITLE];
	    	var url = tabDetails[TABS_DETAILS_URL];
	        groupSection += '<div class="item" id="'+ tabId +'">' +
								'<a class="thumbnailImg tab" href="#" >'+
									'<img src="'+ img +'" />'+
								'</a>'+
								'<div class="caption">'+
									'<div class="controllPanel">'+
										'<a tabId="'+ tabId +'" title="Close" class="closeTab"><span class="glyphicon glyphicon-remove" ></span></a>'+ 
										'<a class="zoomTab" title="Zoom In" href="'+ img +'" data-lighter><span class="glyphicon glyphicon-fullscreen" ></span></a>'+
									'</div>'+
									'<p tabId="'+ tabId +'" >'+ title +'</p>'+
								'</div>'+
							'</div>';
		}
    }
    return groupSection;
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

	$(".item p").bind("click", function(e){
		var tabId = $(this).attr("tabId");
		chrome.tabs.update(parseInt(tabId), {active: true});
		window.close();	
	});

	$(".closeTab").bind("click", function(tabCloseImage){
		var id = $(this).attr("tabId");
		chrome.tabs.remove(parseInt(id));
	});

	$(".closeGroup").bind("click", function(){
		$(this).parent().parent().find(".closeTab").each(function(){
			$(this).click();
		});
	});

	$(".panel-heading").bind("click", function(){
		$(this).parent().find(".panel-body").slideToggle();
	});
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
