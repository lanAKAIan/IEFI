/*
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

document.addEventListener('DOMContentLoaded', function () {
initPopup();
});
var backgroundPage = chrome.extension.getBackgroundPage();

function initPopup()
{
	document.getElementById("menu_saveView").addEventListener(  'click', function(){showSaveViewPage(true);});
	document.getElementById("closeSaveButton").addEventListener('click', function(){showSaveViewPage(false);});
	document.getElementById("performSaveButton").addEventListener('click', function(){POPUP.saveCurrentView()});
	document.getElementById("menu_shareLink").addEventListener( 'click', function(){showShareLinkPage(true);});
	document.getElementById("closeShareButton").addEventListener('click', function(){showShareLinkPage(false);});
	document.getElementById("copy_intelDirectLink").addEventListener('click', function(){copyIntelToClipboard()});
	document.getElementById("copy_gmapsDirectLink").addEventListener('click', function(){copyMapsToClipboard()});
	document.getElementById("menu_screenshot").addEventListener('click', function(){POPUP.saveScreenshot()});
	document.getElementById("menu_about").addEventListener('click', function(){loadAboutPage();});
	
	//document.getElementById("menu_gMapsLink").addEventListener( 'click', function(){POPUP.generateGMapsURL()});
	//document.getElementById("menu_intelLink").addEventListener( 'click', function(){POPUP.generateIntelURL()});
	//document.getElementById("DEBUG_MENU_ITEM").addEventListener('click', function(){checkLogin()});
	
	
	//Populate the user's list of views
	POPUP.loadSavedViews();
}

function loadAboutPage()
{
	chrome.tabs.create({ url: "about.html" });
}

function copyIntelToClipboard()
{
	var linput = document.getElementById('input_intelDirectLink');
	linput.focus();
    linput.select();
    document.execCommand("Copy");
	document.getElementById('linkCopyStatus').innerText = "Link coppied to clipboard.";
}

function copyMapsToClipboard()
{
	var linput = document.getElementById('input_gmapsDirectLink');
	linput.focus();
    linput.select();
    document.execCommand("Copy");
	document.getElementById('linkCopyStatus').innerText = "Link coppied to clipboard.";
}
						
function showSaveViewPage(show)
{
	overlay(); //cover the currentPopup
	if(show)
	{
		document.getElementById('saveViewPage').style.display = 'block';
		document.getElementById('input_saveViewName').focus();
	}
	else
	{
		document.getElementById('saveViewPage').style.display = 'none';
	}
}

function showShareLinkPage(show)
{
	overlay(); //cover the currentPopup
	if(show)
	{
		document.getElementById('input_intelDirectLink').value = '';
		document.getElementById('input_gmapsDirectLink').value = '';
		POPUP.generateGMapsURL(); //Load updated values
		POPUP.generateIntelURL(); //Load updated values
		document.getElementById('linkCopyStatus').innerText = '';
		document.getElementById('shareLinkPage').style.display = 'block';
	}
	else
	{
		document.getElementById('shareLinkPage').style.display = 'none';
	}
}

function checkLogin()
{
	backgroundPage.loggedIn(function(status)
	{
		if(status == true)
		{
			document.getElementById("viewList").innerText = "LogdedIn";
		}
		else
		{
			document.getElementById("viewList").innerText = "NOT LogdedIn";
		}
	}
	);
}

var POPUP = (function(){
	var p = {};
	
	//loadView - takes as input a viewObject and it sends events to ingress to display that view.
	p.loadView = function(view)
	{
		//console.log('popup.js calling backgroundPage to load view: ' + JSON.stringify(view));
		backgroundPage.loadView(view);
	}
	
	//Requests the current view in ingress be saved
	p.saveCurrentView = function()
	{
		//console.info('retrieving view information, then saving it to local store.');
		
		// we need to prompt them for a view name.
		var viewName = document.getElementById('input_saveViewName').value;
		
		//clear current value
		document.getElementById('input_saveViewName').value = '';
		
		if(viewName == undefined || viewName.length == 0)
		{
			viewName = 'unnamed view';
		}
		
		backgroundPage.getCurrentView(function(viewJSON)
		{
			//if(viewJSON != undefined){ console.log('popup.js.getCurrentView got view from backgroundPage: ' + viewJSON); }
			//Call this function when we get the currentView.
			var view = JSON.parse(viewJSON);
			view.viewName = viewName;
			backgroundPage.saveView(view);
			POPUP.addViewToList(view);
			showSaveViewPage(false);
			//document.getElementById("infoBox").innerText = viewInfo; //from returned
		});
	}
	
	p.removeView = function(view, elem)
	{
		//console.info('popup.removeview caled with: ' + JSON.stringify(view));
		var tr = elem.parentNode;
		tr.parentNode.removeChild(tr);
		tr = null;
		if(view != undefined) //should not need to do
		{
			backgroundPage.removeView(view);
			//We should do this another way... but for now...
		}
		
		//NOTE: we should probably remove the display now... otherwise we have to close window =/ bummer
		//ofcourse i did nto make a reference.
	}
	
	//If you pass me a view object, I will modify the dom of the popup to add it to the list.
	//TAKES a view as input NOT JSON!
	p.addViewToList = function(view)
	{	
		var newViewLink = document.createElement("div");
			newViewLink.setAttribute("class","horizontalFlex menuRow");
			newViewLink.addEventListener('click', function(){POPUP.loadView(view)}, false);
		var icon = document.createElement("img");
		icon.setAttribute("src", "res/ic_menu_mapmode.png");
		//icon.addEventListener('click', function(){POPUP.loadView(view)});
		newViewLink.appendChild(icon);
		var nameCell = document.createElement("div");
		nameCell.setAttribute("class","box1");
		if(view.viewName != undefined)
		{
			nameCell.innerText = view.viewName;
		}
		else
		{
			nameCell.innerText = 'unnamed';
		}
		//nameCell.addEventListener('click', function(){POPUP.loadView(view)});
		newViewLink.appendChild(nameCell);
		icon = document.createElement("img");
		icon.setAttribute("src", "res/ic_menu_delete.png");
		icon.addEventListener('click', function(event){POPUP.removeView(view, this); event.stopPropagation();}, false);
		newViewLink.appendChild(icon);		
		document.getElementById('viewList').appendChild(newViewLink);
		
		//console.log('view should be added to the list now. and have an event no less');
	}
	
	//We are actually going to now call this refresh views.
	p.loadSavedViews = function()
	{
		//clear the current list.
		var vl = document.getElementById('viewList');
		if ( vl.children.length )
		{
			//The first child is the legen element. This is a really bad way to do this, amd should be cleaned up.
			for(var i = vl.children.length -1; i >=0; i-- )
			{
				if(vl.children[i].tagName != 'LEGEND')
				{
					vl.removeChild( vl.children[i] ); 
				}
			}
		}

		//console.log('LoadSavedViews function');
		//NOTE: this is getting an array of viewobjects... not dealing with JSON at this point.
		backgroundPage.getSavedViews(function(views){if(views != undefined){for (var i in views){ console.info('p.loadSavedViews.callback for background.getsavedviews JSON: ' + JSON.stringify(views[i])); p.addViewToList(views[i])} }});
	}
	
	p.getCurrentView = function() //callbacks?
	{
		//console.log('p.getcurrentview reqested of background');
		backgroundPage.getCurrentView();
	}
	
	//Hey lets add ability to save screenshots
	//May want to modify to add ability to pass it a view
	//Add metadata for the view information that took the screenshot... and perhaps overlay image with some timestamps?
	p.saveScreenshot = function()
	{
		//console.log('save screenshot clicked.');
		backgroundPage.takeScreenshot();
	}
	
	//These shoudl probably be wrapers for versions that take a view... if no view provided we get the view using the functions we use for saving.
	p.generateGMapsURL = function()
	{
		//console.log('in popup.generategooglemapslink');
		backgroundPage.getCurrentView(function(view){
			//console.log('in callback');
			backgroundPage.generateGoogleMapsLink(view, setMapsLink)}); 
	}
	
	p.generateIntelURL = function()
	{
			//console.log('in popup.generateintellink');
			backgroundPage.getCurrentView(function(view){
			//console.log('in callback');
			backgroundPage.generateIngressIntelLink(view, setIntelLink)}); 
	}
	
	return p;
}());


function setIntelLink(link)
{
	document.getElementById('input_intelDirectLink').value = link;
}

function setMapsLink(link)
{
	document.getElementById('input_gmapsDirectLink').value = link;
}


function overlay() {
	el = document.getElementById("overlay");
	el.style.visibility = (el.style.visibility == "visible") ? "hidden" : "visible";
}