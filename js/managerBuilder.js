function setScreenshotUrl(url) {
  document.getElementById('target').src = url;
}

function load(){
	$("#addNewTab").bind("click", function(){
		chrome.tabs.create({active: true});
	});

	chrome.tabs.query({currentWindow: true}, function(tabs){
		var tabsIds = [];
		for(var i = 0; i < tabs.length; i++)
			tabsIds[i] = tabs[i].id; 

		chrome.extension.sendMessage({cmd: "getTabs", tabsIds: tabsIds}, function(tabsdDetails){
			if(Object.keys(tabsdDetails).length == tabsIds.length){
				loadAdvanced(tabsdDetails);
			} else {
				$("#indexing").show();
				loadAdvanced(tabsdDetails);
			}
		});
	});
}

function loadAdvanced(tabsdDetails){
	var tabsList = buildTabs(tabsdDetails);	
	document.getElementById('tabsList').innerHTML = tabsList;
	addEvents();
}

function groupTabs(tabsdDetails){
	var tabsGroups = {};
	for (var tabId in tabsdDetails) {
		var tabDetails = tabsdDetails[tabId];
		if(tabsGroups[tabDetails["url"]]){
			tabsGroups[tabDetails["url"]][tabId] = tabDetails;
		} else {
			var list = {};
			list[tabId] = tabDetails;
			tabsGroups[tabDetails["url"]] = list; 
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

	if(Object.keys(othersGroup).length > 0)
		tabsGroups["others"] = othersGroup;

	return tabsGroups;
}

function sortGroups(groups){
	var keys = []
	for (k in groups) {
	  if (groups.hasOwnProperty(k)) {
	    keys.push(k);
	  }
	}
	var sortedGroups = keys.sort();
	if(sortedGroups["others"]){
		var othersGroup = sortedGroups["others"];
		delete sortedGroups["others"];
		sortedGroups.push(othersGroup);
	}
	return sortedGroups;
}

function getGroupIcon(groupName, groupTabsDetails){
	var icon = "img/other.ico";	
	if(groupName != "others")
		for (var tabId in groupTabsDetails)
			if(groupTabsDetails[tabId]["icon"])
				icon = groupTabsDetails[tabId]["icon"];
	return icon;
}

function getImage(img){
	if (!img || img == "NoImage")
		img = "img/no-image.png";
	else if(img == "Loading")
		img = "img/camera.png";	
	return img;
}

function buildTabs(tabsdDetails){
	var tabsGroups = groupTabs(tabsdDetails);	

	var tabsList = "";
	var tabsPerRow = (775.0 - 70.0) / 165.0;

	var sortedGroups = sortGroups(tabsGroups);
	for(var i in sortedGroups){
		var group = sortedGroups[i];
		var row = "";
		var index = 0;
  		var groupTabsDetails = tabsGroups[group];
		var icon = getGroupIcon(group, groupTabsDetails);
		
		if(group == "others")
			group = "Domains With Single Tab"

		var groupSection = '<div class="panel panel-default">'+
  								'<div class="panel-heading"><img src="'+ icon +'" class="groupIcon">'+ group +
  								'<a title="Close Group" class="closeGroup"><span class="glyphicon glyphicon-remove" ></span></a>'+
  								'</div>'+
  								'<div class="panel-body">';

	  	for (var tabId in groupTabsDetails) {
	    	var tabDetails = groupTabsDetails[tabId];
	    	if(tabDetails["title"]){
		    	if(index == 0)
		    		row = "<div class='row'>";
		    	index++;

		    	var img = getImage(tabDetails["img"]);
		    	var title = tabDetails["title"];
		    	var url = tabDetails["url"];
		        row += '<div class="item" id="'+ tabId +'">' +
							'<a class="thumbnailImg tab" href="#" tabId="'+ tabId +'" >'+
								'<img src="'+ img +'" />'+
							'</a>'+
							'<div class="caption">'+
								'<p>'+ title +'</p>'+
								'<div class="controllPanel">'+
									'<a tabId="'+ tabId +'" title="Close" class="closeTab"><span class="glyphicon glyphicon-remove" ></span></a>'+ 
									'<a class="zoomTab" title="Zoom In" href="'+ img +'" data-lighter><span class="glyphicon glyphicon-zoom-in" ></span></a>'+
								'</div>'+
							'</div>'+
						'</div>';
				if(index + 1 > tabsPerRow){
					index = 0;
					groupSection += row + "</div>"; 
				}
			}
	    }
	    if(index > 0)
	    	groupSection += row + "</div>";

  		groupSection +=	'</div></div>';
  		tabsList += groupSection;
	}

    return tabsList;
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

	$(".tab").bind("click", function(){
		var tabId = $(this).attr("tabId");
		chrome.tabs.update(parseInt(tabId), {active: true});
		window.close();	
	});

	$(".closeTab").bind("click", function(tabCloseImage){
		var id = $(this).attr("tabId");
		chrome.runtime.sendMessage({cmd: "removeTab", tabId: id}); 
		chrome.tabs.remove(parseInt(id));
		var row = $("#" + id).parent();
		$("#" + id).remove();
		if(row.find(".item").length == 0){
			var group = $(row).parent().parent();
			if($(group).find(".row").length == 1){
				$(group).remove();
			} else{
				$(row).remove();
			}
		}
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


load();

// Server
chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
  if(request.cmd == "updateImage"){
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
  }
});
