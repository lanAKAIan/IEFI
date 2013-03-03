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

document.addEventListener('DOMContentLoaded', initPopup);
var backgroundPage = chrome.extension.getBackgroundPage();

function initPopup()
{
	document.getElementById("menu_saveView").addEventListener(  'click', showSaveView);
	document.getElementById("menu_shareLink").addEventListener( 'click', showDirectLinks);
	document.getElementById("menu_screenshot").addEventListener('click', POPUP.saveScreenshot);
	document.getElementById("menu_about").addEventListener('click', loadAboutPage);
	document.getElementById("menu_options").addEventListener('click', displayOptions);

	//document.getElementById("DEBUG_MENU_ITEM").addEventListener('click', function(){});
	//Populate the user's list of views
	POPUP.loadSavedViews();
}

function redirectPopupTo(url)
{
    window.location.href = url;
}

function showSaveView()
{
    redirectPopupTo("saveView.html");
}

function showDirectLinks()
{
    redirectPopupTo("directLinks.html");
}

function displayOptions()
{
	chrome.tabs.create({ url: "options.html"});
}

function loadAboutPage()
{
	chrome.tabs.create({url: "http://code.google.com/p/intelligence-enhancer-for-ingress/wiki/About"});
}

function checkLogin()
{
	backgroundPage.loggedIn(function(status){
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

	//May want to modify to add ability to pass it a view
	//Add metadata for the view information that took the screenshot... and perhaps overlay image with some timestamps?
	p.saveScreenshot = function()
	{
		console.log('save screenshot clicked.');
		backgroundPage.takeScreenshot();
	}
	
	return p;
}());