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

var IPP;
if(!IPP){ IPP = {} };
if(!IPP.Injected){ IPP.Injected = {} };
(function() {
	var ns = IPP.Injected; //ns is the namespace
	var head = document.head || document.getElementsByTagName( "head" )[0] || document.documentElement;
    var initialized = false;
    var ingressInit;
	
	//The signatures object is used to hold signatures of variables and functions for use in identifying overrides.
	var signatures = {};
		signatures.nativeFunction   = /\{ \[native code\] \}/;
		signatures.redeem           = /var a = document\.getElementById\("passcode"\), b = a\.value;/;

    var replacedFunctions = {};

    var userData = { userSettings: null
                   , storageVersion: null
                   , userViews: null };


    /* Responsible for storing and overriding the normal ingress initiating so we can do any customization we need first.
     * */
    function hookIngressInit()
    {
        ingressInit = document.body.onload;
        document.body.onload = '';
    }

	/**
	*	@name: init
	*	@return: NA
	*	@NOTE: Sets up listeners to loadView and REQ-GET_VIEW events.
	*/
	function init(callback)
	{
        hookIngressInit();

        //Add event listeners
		document.addEventListener("loadView", function(e) { loadView(e.detail) });
		document.addEventListener("REQ-GET_VIEW", getCurrentView, false); //false makes events propogate up first.
		document.addEventListener("IPP-UPDATE_USER_SETTINGS", function(e) { setUserSettings(e.detail) }, false); //false makes events propogate up first.
        document.addEventListener("IPP-UPDATE_USER_DATA", function(e){ setUserData(e.detail) }, false);
        document.addEventListener("IPP-INITIALIZED", function(e){
            console.log('DETECTED IPP-INITIALIZED EVENT');
            if(typeof ingressInit !== null && initialized == false)
            {
                //Things that need the userData should be loaded at this time.
                console.log('IPP initialized calling ingress init.');
                initialized = true;
                ingressInit();
            } }, false);

        //Request user settings basically we should probably not go on until we wave them...

        //do any hooking needed.
        //requestGeolocation?
        overwriteRedeemCode();
        //findDateFormatter();

        //Ask for init.
        var event = new CustomEvent("INITIALIZE", {"detail": "initialize" });
           document.dispatchEvent(event);
        console.log('done Setting up init... waiting on IPP-INITIALISED-EVENT.');

	}

    function setUserData(userDataObject)
    {
        userData = userDataObject;
        console.log('got All userData');
    }

	//takes an object.not json.
	function setUserSettings(userSettingsObject)
	{
        userData.userSettings = userSettingsObject;
        console.log('InjectScript  user settings updated.');
	}
	
	//returns an object not json.
	function getUserSettings()
	{
		return userData.userSettings;
	}

    function getUserData()
    {
        return userData;
    }
	
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
	*	@return: if it receives a valid view, the end result is the view is loaded into the ingress page.
	*	@NOTE: is is possible for us to use the panto function or modify it, or define this in terms of it? 
	* This may need micro-degree format? google maps and 1E6 I suspect we already converted the saved thousand oaks and ventura ones.. but not new ones.
	*/
	function loadView(viewJSON)
	{
		console.log('injectScript.js.loadView called with JSON: ' + viewJSON);
		try{
			var view = JSON.parse(viewJSON);
		}catch(e){
		   console.error('injectScript.js.loadView unable to parse JSON!\n ERROR: ' + e.message);}
		   
		 //Of course we should do more than just catch the error... ie not go further.
		console.assert(view.latitude != undefined && view.longitude != undefined && view.zoomLevel != undefined);
		
		//Set Zoom first. This way when we pan we are less likely to have a rounding error that is off from expected.
		if(view.zoomLevel != undefined)
		{
			Z.c().h.setZoom(view.zoomLevel); //was z.d
		}
		
		var c = new google.maps.LatLng(view.latitude, view.longitude);
		Z.c().h.panTo(c); //was z.d
		
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

        //NOTE: an alternate method is document.querySelector('[title="Report errors in the road map or imagery to Google"]').href which should be less succeptable to code?
        //'http://www.ingress.com/intel?' + document.querySelector('[title="Report errors in the road map or imagery to Google"]').href.split('?')[1].split('&t')[0].replace(/\./g,'').replace('ll','latE6').replace(',', '&lngE6=')
		var cv = Z.c().h.getCenter(); //was Z.d
		console.log(cv.Ya + ' ' + cv.Za + '    ' + Z.c().h.getZoom()); //was z.d
		var currentView = '{"zoomLevel": ' + te("zoom") + ',' +
						   '"latitude": '  + te("lat") + ',' +
						   '"longitude": ' + te("lng") + "}";
		return currentView;
	}

	function overwriteRedeemCode()
	{
		//find the redeem function
		for(var f in window)
		{
			//Filter out undefined, non-functions, and functions that are built in natively.
			if(typeof window[f] !== "undefined" && typeof window[f] === "function" && !(signatures.nativeFunction.test(window[f])))
			{
				if(signatures.redeem.test(window[f]))
				{
					var funcName = f;
					//console.log('found it: ' + window[f]);
					if(typeof replacedFunctions[f] === "undefined")
					{
						replacedFunctions[f] = window[f]; //backup
					}
                    var temp = 'IPP.Injected.getUserSettings().redeem_passcode_cleanse === "on" ? a.value.trim() : a.value;'
					var scriptCode = f + ' = ' + window[f].toString().replace(signatures.redeem,
														 'var a = document.getElementById("passcode"), b = ' + temp);
					
					var script = document.createElement('script');
						script.setAttribute("type", "text/javascript");
						script.setAttribute("async", true);
						script.appendChild(document.createTextNode(scriptCode));
						head.appendChild(script);
				}
			}
		}
	}

	/**
	*	@name: getCurrentView
	*	@description: - This is a wrapper for getViewJSON. It is called by, and mostly used in order to communicate back to contentScript.js through events
	*					Since contentScript is in a seperate sandbox from the injectedScript, we need to sue events to message between, because we cant see window, just DOM
	*	@return: Dispatches event "RESP-GET_VIEW" with an Object.detail = a view object(non JSON?"). object.detail.viewInfo contains the latitude, longitude and zoom information
	*	@NOTE: I may have been wrong. We might be able to send objects back and forth so perhaps we could have sent functions in?
	*	@NOTE: this is for internal use... i mean it could be external but for the moment I cant see why people would want access to it.
	*/
	function getCurrentView(){
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

	ns.loggedIn = loggedIn;
	ns.loadView = loadView;
	ns.getViewJSON = getViewJSON;
	ns.init = init;
	ns.getUserSettings = getUserSettings;
    ns.getUserData = getUserData;
})();
IPP.Injected.init();



