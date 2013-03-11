/* @license
 Intelligence Enhancer for Ingress - enhanced features for Google's Ingress
 Copyright (C) 2013  Ian Scott Friedman

 This program is free software; you can redistribute it and/or
 modify it under the terms of the GNU General Public License
 as published by the Free Software Foundation; either version 2
 of the License, or (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program; if not, write to the Free Software
 Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */


/**
  * installOrUpdate
  * called when the extension is updated or installed... wow.
  * anyway this way we can either provide a tutorial or notify of any changes since their version.
  * additionally this ensures we can add our icon into the intel page if it is already displayed when they install.
  * NOTE: should test that the injected stuff is there though...
  */
function installOrUpdate(install_details){
	switch (install_details.reason){
		case "install": 
						//console.log('it is a new install');
						break;
		case "update": 
			//console.log('its an update');
			//console.log('it was a update from ' + install_details.previousVersion + ' to ' + chrome.runtime.getManifest().version);
            notifyUserOfUpdate();
			break;
		case "chrome_update": //do nothing we dont care for the moment. but this is basically if the actual version of chrome itself updates.
		default: 
	}
	
	//regardless the case... we should add on any intel pages
	try
	{
        /*We specifically are looking at all the tabs even if they are not currently visible incase the user has more than one intel page up*/
		chrome.tabs.query({"windowType": "normal", "url": "*://www.ingress.com/intel*"}, function(tabResults) {
			if(tabResults.length>0)
			{
				for(var i = 0; i < tabResults.length; i++)
				{
					//console.log('install or update calling showPageActionIfLoggedIn on tabId ' + tabResults[i].id);
					showPageActionIfLoggedIn(tabResults[i].id)
				}
			}
		});
	}
	catch(e)
	{
		console.error('Problem checking for existing intel tabs on install. ' + e.message);
	}
}


/**
 * Queries chrome for the current visible tab. Only looks for ingress.com/intel tabs
 * @param {function} callback function to pass tab object to when found
 * NOTE: windowType normal keeps us from getting results like the debug popup. Active makes sure we only care about the currently visible tab.
*/
function getVisibleTab(callback)
{
    try
    {
        chrome.tabs.query({"active": true, "windowType": "normal", "url": "*://www.ingress.com/intel*"}, function(tabResults) {
            console.assert(tabResults.length == 1, tabResults.length > 1 ? "More Than one tab returned!" : "No tabs returned!");
            if(tabResults.length>0)
            {
                callback(tabResults[0]);
            }
            else
            {
                console.info('No visible ingress tab detected.');
            }
        });
    }
    catch(e)
    {
        console.error('Problem detecting current visible tab. ' + e.message);
    }
}

function getSavedViews( callback )
{
	callback(IPP.StorageManager.getUserViews());
}

function loadView(view)
{
    //console.info('background.js loadView called with view ' + JSON.stringify(view));
    var loadV = function(tab)
    {
        chrome.tabs.sendMessage(tab.id, {request: "LOAD_VIEW", view: JSON.stringify(view)}, function(response) { });
    }
    getVisibleTab(loadV);
}

/**
  *   @name: saveView
  *   @description: pass a view object and this function will send it to the StorageManager for saving.
  *   @param: view: {latitude: value, longitude: value, zoomLevel: value}
  *   @return: NA
  */
function saveView(view) {
    //Add a guid to the view since all we were passed is the plysical view information.
        view.guid = getGUID();

        var handleViews = function(viewArray) {
            var x;
            if (viewArray != undefined) {
                x = viewArray
            } else {
                x = [];
            }

            //console.info('savedViews length pre add:' + x.length);
            x[x.length] = view;
            
            var afterAdd = function(){console.info('view added to storage');};            
            IPP.StorageManager.setUserViews(x, afterAdd);
        }
        getSavedViews(handleViews);
    }

function removeView(viewToRemove) {

    //we shoudl already have a cache so this shoudl be fixed... anyway for now do this.

    //1. get the views
    //2 once we got the viwes, add the new one
    //3. update the display or not? may be calback aded to function?
    //console.log('background.js.remove view called with ' + view);

    var handleViews = function(viewArray) {
        var x = viewArray;
        //TODO: make sure there is a viewArray to remove from.
        for (var i = 0; i < x.length; i++) {
            if (x[i].guid === viewToRemove.guid) {
                //console.info('Im removing: ' + i);
                x.splice(i, 1);
                //remove one item at that index
                break;
                //break outa loop
            }
        }

        //now we update the storage
        var afterRemove = function() {
            console.info('view removed from storage');
        };
        IPP.StorageManager.setUserViews(x, afterRemove);
    }
    getSavedViews(handleViews);    
}

function getCurrentView( callback )
{
	//console.log('background.getcurrentview!');
	//you should use this version of tab searching
	//http://developer.chrome.com/extensions/tabs.html#method-query
	//not get selected... sigh
	
	//Also these were getting the dubug page when i was debugging which broke everything lmao.

    var getCurView = function(tab)
    {
        chrome.tabs.sendMessage(tab.id, {request: "GET_VIEW" }, function(response)
        {
            if(callback != undefined)
            {
                callback(response.viewInfo);
            }
        });
    }
    getVisibleTab(getCurView);
}

//add autoclose? take an object maybe instead?
function generateTOAST(image, message, body)
{
    var notification = window.webkitNotifications.createNotification(
        image ? image : '',                    			// The image.
        message ? message : '',
        body ? body: '');

    //also, lets return a reference of the notification incase we want to do extra
    return(notification);
}

//https://maps.google.com/?q=TheLatitudeOfTarget+TheLongetudeOfTarget+(TheNameOfThePlaceMarker)
var GoogleMapsBaseUrl = 'https://maps.google.com/?';
function generateGoogleMapsLink(view, callback)
{
	var viewObj ;
	try
	{
	    viewObj = JSON.parse(view);
	}
	catch(e)
	{
		console.error('Unable to parse view for google maps link');
	}
    //usig ll instead of q makes it so we dont mark a place on the map.
	var link = GoogleMapsBaseUrl + 'll=' + viewObj.latitude+ ',' + viewObj.longitude + '&z=' + viewObj.zoomLevel;
	//generateTOAST('icon-48.png','Google Maps Link', link + '<button>hello</button>');
	callback(link);
}

function notifyUserOfUpdate()
{
    var msg = "Click here to view the changelog.";
    var img = "res/icon-48.png";
    var title = "Intelligence Enhancer Updated to " + chrome.runtime.getManifest().version;
    var notify = generateTOAST(img,title, msg);
        notify.addEventListener(  'click', function(){displayChangelog();notify.cancel()});
        var closein10 = function()
        {
            setTimeout(function(){notify.cancel()}, 10000);
        }
        notify.addEventListener( 'show', closein10);
        notify.show();

}

function displayChangelog()
{
    chrome.tabs.create({ url: "http://code.google.com/p/intelligence-enhancer-for-ingress/wiki/Changelog"});
}


function notifyUserOfTotalConversion()
{
        var title = "Ingress Total Conversion Detected";
        var msg   = "Only basic functionality will be available. (screenshot, load/save views)";
        var img   = "res/icon-48.png";
        var notify = generateTOAST(img,title, msg);
        notify.addEventListener( 'click', function(){notify.cancel()});
        var closein10 = function()
        {
            setTimeout(function(){notify.cancel()}, 10000);
        }
        notify.addEventListener( 'show', closein10);
        notify.show();
}

function notifyUserOfCompatibility(compat)
{
    if(compat.compatibility != "compatible")
    {
        var title = "Unknown Dashboard Version Detected";
        var msg   = "Some functionality may not work until extension is updated. Click here to learn more.";
        var img   = "res/icon-48.png";
        var notify = generateTOAST(img,title, msg);
        notify.addEventListener( 'click', function(){displayUnknownDashboardVersion();notify.cancel()});
        notify.show();
    }
}

function displayUnknownDashboardVersion()
{
    chrome.tabs.create({ url: "http://code.google.com/p/intelligence-enhancer-for-ingress/wiki/UnknownDashboardVersion"});
}

//Zoom16 is the least you can zoom and still see lvl 0 portals.
//leave out the decimal point here.
//http://www.ingress.com/intel?latE6=Latitude&lngE6=Longetude&z=AZoomLevel
var IngressBaseURL = 'https://www.ingress.com/intel?';

/*
So we may want to change this to somehow include the screensize. Right now I think its based on perhaps the middle of the map? and zooming there?
*/
function generateIngressIntelLink(view, callback)
{
	var viewObj ;
	try
	{
	    viewObj = JSON.parse(view);
	}
	catch(e)
	{
		console.error('Unable to parse view for intel link');
	}

	//It seems that for intel page we must do this... or it croaks.
	var link = IngressBaseURL + ('latE6='+Math.round(viewObj.latitude * 1E6) +'&lngE6='+ Math.round(viewObj.longitude * 1E6) + '&z=' + viewObj.zoomLevel).replace(/\./g,"");
	callback(link);
	//generateTOAST('icon-48.png','Ingress/intel Link', link);
}


/**
  * This screenshot functionality is right out of the chrome api demos... I really want to get FileSaver working but for now i give up
  */
  

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// To make sure we can uniquely identify each screenshot tab, add an id as a
// query param to the url that displays the screenshot.
// Note: It's OK that this is a global variable (and not in localStorage),
// because the event page will stay open as long as any screenshot tabs are
// open.
var sshotTabId = 100;

function takeScreenshot()
{
	//first lets hide PII
    var getCurView = function(tab)
    {
        chrome.tabs.sendMessage(tab.id, {request: "HIDE_PII"}, function(response) {
            console.info('PII should be hidden');
            //So we should be able to do this in a callback type situation but i had timing issues at first.
            setTimeout(function(){
                saveScreenshot(tab.windowId);
                //Show PII
                chrome.tabs.sendMessage(tab.id, {request: "SHOW_PII"}, function(response) {
                    console.info('PII should be showing again');
                });}, 1000);
        });
    }
    getVisibleTab(getCurView);
}

/*
 * Saves a screenshot on the current visible tab. windowId is optional, but it is suggested in order to not have issue when console is up.
 *
 * */
function saveScreenshot(windowId) {
    //check for a saved format, jpeg or png and use it.
    var ss_format;
    try
    {
        console.info('attempting to detect screenshot format');
        if(IPP.StorageManager.getUserSettings().screenshot_format)
        {
            ss_format = IPP.StorageManager.getUserSettings().screenshot_format;
            console.info('detected format ' + ss_format);
        }
        else
        {
            ss_format = "png";
        }
    }
    catch(e)
    {
        console.error(e.message);
    }
    //IPP.StorageManager.getUserSettings().screenshot_format
    chrome.tabs.captureVisibleTab((windowId ? windowId:null), { format: ss_format }, function(img) {
        var screenshotUrl = img;
        var viewTabUrl = chrome.extension.getURL('screenshot.html?id=' + sshotTabId++);

        chrome.tabs.create({url: viewTabUrl}, function(tab) {
          var targetId = tab.id;

          var addSnapshotImageToTab = function(tabId, changedProps) {
            // We are waiting for the tab we opened to finish loading.
            // Check that the the tab's id matches the tab we opened,
            // and that the tab is done loading.
            if (tabId != targetId || changedProps.status != "complete")
              return;

            // Passing the above test means this is the event we were waiting for.
            // There is nothing we need to do for future onUpdated events, so we
            // use removeListner to stop geting called when onUpdated events fire.
            chrome.tabs.onUpdated.removeListener(addSnapshotImageToTab);

            // Look through all views to find the window which will display
            // the screenshot.  The url of the tab which will display the
            // screenshot includes a query parameter with a unique id, which
            // ensures that exactly one view will have the matching URL.
            //Specifically only queryies pages owned by this extension.

            var potentialTabs = chrome.extension.getViews({"windowId": windowId, "type": "tab"});
              var view;
              for (var i = 0; i < potentialTabs.length; i++) {
              view = potentialTabs[i];
              if (view.location.href == viewTabUrl) {
                    view.setScreenshotUrl(screenshotUrl);
                console.log('tried to set screenshot');
                break;
              }
            }
          };
          chrome.tabs.onUpdated.addListener(addSnapshotImageToTab);
        });
    });
}


/*
 * Requests from the content page if the user is logged In
 */
function loggedIn(callback, tabId)
{
	//console.log('background loggedIn called with tabId ' +  tabId + ' and a callback of ' + ((callback != undefined)?'defined':'undefined'));
	//if a tabId is provided use that, otherwise we need to figure out which tab
	if(tabId != null)
	{
		chrome.tabs.sendMessage(tabId, {request: "GET_LOGIN_STATUS" }, function(response)
		{
			if(response != undefined)
			{
				//console.log('background we got loginStatus: ' +  response.loginStatus);
				if(callback != undefined)
				{
					callback(response.loginStatus);
				}
			}
			else
			{
				console.error('background.loggedIn we got an undefined response');
			}
		});
	}
}

function showPageActionIfLoggedIn(aTabId)
{
	//console.log('background.showPageActionIfLoggedIn called with tabId: ' + aTabId)
	loggedIn(function(status){
		//console.log('background.showPageActionIfLoggedIn.callback called with tabId: ' + aTabId + ' and status ' + status);
		if(status == true)
		{
			//console.log('background.showPageActionIfLoggedIn.callback will show regular logged in popup for ' + aTabId);
			chrome.pageAction.show(aTabId);
		}
		else
		{
			//console.log('background.showPageActionIfLoggedIn.callback called not logged in status so, changing page before show');
			chrome.pageAction.setPopup( {tabId: aTabId, popup: "notLoggedIn.html"} );
			//console.log('background.showPageActionIfLoggedIn.callback will now show the not logged in pageAction');
			chrome.pageAction.show(aTabId);
		}
	}, aTabId);
}

chrome.extension.onMessage.addListener(
  function(request, sender, sendResponse) {
    //console.log(sender.tab ? "from a content script:" + sender.tab.url : "from the extension");
	//console.log(JSON.stringify(request));
    if (request.message == "pageLoaded")
	{
		sendResponse({farewell: "goodbye"}); //close the connection.
		
			console.log('detected page load');
			if(request.userLoggedIn == true)
			{
				//Show regularPageAction
				//console.log('user logged in so showing pageaction normal');
				chrome.pageAction.setPopup({tabId: sender.tab.id, popup: "popup.html"});
			}
			else
			{
				//show non logged in page action.
				//console.info('user not logged in so showing pageaction non not logged in');
				chrome.pageAction.setPopup({tabId: sender.tab.id, popup: "notLoggedIn.html"});
			}
            if(typeof request.dashboardURI !== "undefined")
            {
                //Ok we got a new page load, and it seems we detected the dashboard version.

            }
			chrome.pageAction.show(sender.tab.id);
			
	}
	else if (request.message == "GET_USER_SETTINGS")
	{
			sendResponse({farewell: "goodbye"}); //close the connection.

			chrome.tabs.sendMessage(sender.tab.id, {request: "NOTIFY_SETTINGS_UPDATED", "userSettings": IPP.StorageManager.getUserSettings()}, function(response) {
				console.info('Tab got the message to update settings');	});

        //This is not right.. but since we should be replacing anyway
        chrome.tabs.sendMessage(sender.tab.id, {request: "NOTIFY_ALL_USER_DATA", "userData": IPP.StorageManager.getAllData()}, function(response) {
            console.info('Tab got the message with all the userdata');	});
			
	}
    else if (request.message == "GET_ALL_USER_DATA")
    {
        sendResponse({farewell: "goodbye", "userData": IPP.StorageManager.getAllData() }); //close the connection.

        /*
        chrome.tabs.sendMessage(sender.tab.id, {request: "NOTIFY_ALL_USER_DATA", "userData": IPP.StorageManager.getAllData()}, function(response) {
            console.info('Tab got the message with all the userdata');	});*/
    }
    else if (request.message == "NEW-INITIALIZE-EVENT")
    {
        sendResponse({farewell: "goodbye"}); //close the connection.

        var compatFunc = function(compatibilityObj)
        {
            notifyUserOfCompatibility(compatibilityObj)
            chrome.tabs.sendMessage(sender.tab.id, {request: "NOTIFY_INIT_DATA", "userData": IPP.StorageManager.getAllData(), "compatibility": compatibilityObj.compatibility}, function(response) {
                console.info('Tab CS got the message with all the initialization data');	});
        }
        var dashboardURI;
        if(typeof request.dashboardURI !== "undefined")
        {
            dashboardURI = request.dashboardURI;
        }
        else
        {
            dashboardURI = "https://www.ingress.com/jsc/gen_dashboard.js";
        }

        //A new page load, so we want to check compatibility.
        checkCompatibility(compatFunc, extensionCompatibility, dashboardURI);
    }
    else if (request.message == "TOTAL-CONVERSION-DETECTED")
    {
        sendResponse({farewell: "goodbye"}); //close the connection.

        notifyUserOfTotalConversion();
    }
  });

var extensionCompatibility = null;
  
//////////////////
function updateUserSettings(updatedUserSettings)
{
	chrome.tabs.query({"windowType": "normal", "url": "*://www.ingress.com/intel*"}, function(tabResults) {
		//We may get more than one tab, but thats ok... we want to update all of them.
		console.log('updateUserSettings found ' + tabResults.length + ' ingress tabs');
		console.log(JSON.stringify(tabResults));
		
		try
		{
			for(var tab in tabResults)
			{

				chrome.tabs.sendMessage(tabResults[tab].id, {request: "NOTIFY_SETTINGS_UPDATED", "userSettings": updatedUserSettings}, function(response) {
					console.info('Tab got the message to update settings');	});
			}
		}
		catch(e)
		{
			console.error('it appears we had a problem sending messages to the tabs: ' + e.message);
		}
			
		});
}
/*******/
//Testing notification of storage update

//This section would right now be watching wrong area... move to options so it watches itself incase more than one is open.

function displayImportExport()
{
    chrome.tabs.create({ url: "importExport.html"});
}

chrome.storage.onChanged.addListener(function(changes, namespace) {
//Namespace is sync or local... for now we dont care.
//	console.log('namespace: ' + JSON.stringify(namespace));
    console.log('changes: ' + JSON.stringify(changes));
	if(typeof changes.userSettings !== "undefined")
	{
		console.log('it was a settings change.');
		updateUserSettings(changes.userSettings.newValue)
		//So the changes actually has the new version... so perhaps we will just send right on.
		//We should probably store locally incase popup asks? and manage views and such...
	}
//TODO: we are not checking any other types... like the userViews...
});
/*******/

/*end js file version test*/

//This is so we can tell when they first install or if we do an update notify them of the update.
//http://developer.chrome.com/extensions/runtime.html#event-onInstalled
chrome.runtime.onInstalled.addListener(installOrUpdate);

//console.log('background.js loaded');