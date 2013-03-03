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

/* Register Event Listeners
NOTE: right now if the extension is reloaded, and the script is reinjected we would have extra listeners. for reinjecting this script.
*/

document.addEventListener("loadView", function(e) { loadView(e.detail) });
document.addEventListener("REQ-GET_VIEW", getCurrentView, false); //false makes events propogate up first.

/**
*	@name: loggedIn
*	@return: if the user is detected as logged in returns true, otherwise false
*	@NOTE: Detection is based on the presence of the javascript PLAYER object. This is not present on the login page.
*/
function loggedIn()
{
	if(PLAYER != undefined)
	{
		return true;
	}
	else
	{
		return false;
	}
}

/**
*	@name: loadView
*	@param: viewJSON - a view in json syntax. Contains members latitude, longitude, zooom, and optionally a view name which is ignored.
*	@return: if it recieves a valid view, the end resilt is the view is loaded into the ingress page.
*	@NOTE: is is possible for us to use the panto function or modify it, or define this in terms of it? 
* This may need microdegree format? google maps and 1E6 I suspect we already converted the saved thousand oaks and ventura ones.. but not new ones.
*/
function loadView(viewJSON)
{
	console.log('injectScript.js.loadView called with JSON: ' + viewJSON);
	try{
		var view = JSON.parse(viewJSON);
	}catch(e){
	   console.error('injectScript.js.loadView unable to parse JSON!\n ERROR: ' + e.message);}
	   
	 //Ofcourse we should do more than just catch the error... ie not go further.
	console.assert(view.latitude != undefined && view.longitude != undefined && view.zoomLevel != undefined);
	
	//Set Zoom first. This way when we pan we are less likely to have a rounding error that is off from expected.
	if(view.zoomLevel != undefined)
	{
		Z.d().h.setZoom(view.zoomLevel);
	}
	
	var c = new google.maps.LatLng(view.latitude, view.longitude);
	Z.d().h.panTo(c);
	
	//This is what actually moves the map
	//Use the function defined in gen_dashboard.js by v("panto", function(a, b);
	//panto(view.latitude, view.longitude);
	//The oa() >0 live caused loading the same view to zoom in and out on occasion.
	//For now, we will just manually write.
}


/**
*	@name: getViewJSON
*	@description: - pulls the current viewwindow data from the intel map and ereturns it in JSON syntax.
*	@return: viewJSON: {latitude: value, longitude: value, zoomLevel: value}
*/
function getViewJSON()
{
	//create some JSON.
	//https://developers.google.com/maps/documentation/javascript/reference#Map
	var cv = Z.d().h.getCenter();
	console.log(cv.Ya + ' ' + cv.Za + '    ' + Z.d().h.getZoom());
	var currentView = '{"zoomLevel": ' + ve("zoom") + ',' +
					   '"latitude": '  + ve("lat") + ',' +
					   '"longitude": ' + ve("lng") + "}";
	return currentView;
}

/**
*	@name: getCurrentView
*	@description: - This is a wrapper for getViewJSON. It is called by, and mostly used in order to communicate back to contentScript.js through events
*					Since contentScript is in a seperate sandbox from the injectedScript, we need to sue events to message between, because we cant see window, just DOM
*	@return: Dispatches event "RESP-GET_VIEW" with an Object.detail = a view object(non JSON?"). object.detail.viewInfo contains the latitude, longitude and zoom information
*	@NOTE: I may have been wrong. We might be able to send objects back and forth so perhaps we could have sent functions in?
*/
function getCurrentView()
{
	//alert(getCurrentView());
	var evt = new CustomEvent("RESP-GET_VIEW", {
		  detail: {
			viewInfo: getViewJSON()
		  },
		  bubbles: true,
		  cancelable: false
		});
		document.dispatchEvent(evt);
		console.log('contentScript.js - we sent back the view info as requested.');
}

//console.info('injectScript.js successfully loaded or something.');





