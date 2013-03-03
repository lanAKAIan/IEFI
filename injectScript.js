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

var IPP;
if(!IPP){ IPP = {} };
if(!IPP.Injected){ IPP.Injected = {} };
(function() {
	var ns = IPP.Injected; //ns is the namespace
	var head = document.head || document.getElementsByTagName( "head" )[0] || document.documentElement;
    var initialized = false;
    var ingressInit;
	
	//The signatures object is used to hold signatures of variables and functions for use in identifying overrides.
    //"somestringToRegex".replace(/(\(|\)|\.|\\)/g, '\\$1').replace(/([a-zA-Z$_]+)/g, '[a-zA-Z$_]+');
	var signatures = {};
		signatures.nativeFunction   = /\{ \[native code\] \}/;
        signatures.redeem           = /var a\s*=\s*document\.getElementById\("passcode"\),\s*b =\s*a\.value;/; //Can have or not have spaces.
        signatures.geocode          = /document\.getElementById\("address"\)/;
        signatures.map_in_geocode   = /([a-zA-Z_$]+\.[a-zA-Z_$]+\(\)\.[a-zA-Z_$]+)\.fitBounds\([a-zA-Z_$]+\)/;
        signatures.cookieParser     = /return [a-zA-Z_$]+\("ingress\.intelmap\." \+ [a-zA-Z_$]+\)/;
        signatures.mapConstructor   = /([a-zA-Z_$]+\.[a-zA-Z_$]+) = new google\.maps\.Map\(document\.getElementById\("map_canvas"\)\, [a-zA-Z_$]+\);/;
        signatures.chatCreation     = /[a-zA-Z_$]+\.[a-zA-Z_$]+ = new [a-zA-Z_$]+\([a-zA-Z_$]+\.[a-zA-Z_$]+\(\)\.[a-zA-Z_$]+, [a-zA-Z_$]+\.[a-zA-Z_$]+\), [a-zA-Z_$]+\.[a-zA-Z_$]+\.[a-zA-Z_$]+\(\)/;
        signatures.defaultChat      = /this(\.[a-zA-Z$_]+)\s*=\s*"all"/
        signatures.chatlog          = /([a-zA-Z$_]+\.[a-zA-Z$_]+) = [a-zA-Z$_]+ [a-zA-Z$_]+\([a-zA-Z$_]+\.[a-zA-Z$_]+\(\)\.[a-zA-Z$_]+, [a-zA-Z$_]+\.[a-zA-Z$_]+\), [a-zA-Z$_]+\.[a-zA-Z$_]+\.[a-zA-Z$_]+\(\)/
    var replacedFunctions = {};
    var userData = { userSettings: null
                   , storageVersion: null
                   , userViews: null };

    var compatible; /*extension compatibility true or false*/


    /* Responsible for storing and overriding the normal ingress initiating so we can do any customization we need first.
     * */
    function hookIngressInit()
    {
        ingressInit = document.body.onload;
        document.body.onload = '';
    }

    var hooks = {};


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
            userData = e.detail.userData;
            compatible = (e.detail.compatibility.compatibility=="compatible");
            console.log('DETECTED IPP-INITIALIZED EVENT');
            if(typeof ingressInit !== null && initialized == false)
            {
                //Things that need the userData should be loaded at this time.
                console.log('IPP initialized calling ingress init.');
                if(compatible)
                {
                    console.log("Use known variable names");
                    setUpKnownHooks();
                }
                else
                {
                    console.warn("Alternate hooking needed");
                    identifyHooks();
                }
                //TODO: move to correct placement.
                overrideDashboard();

                initialized = true;
                ingressInit();

            } }, false);

        //Request user settings basically we should probably not go on until we wave them...

        //do any hooking needed.
        //requestGeolocation?
        overwriteRedeemCode();
        //findDateFormatter();

        //Ask content script for init.
        var event = new CustomEvent("INITIALIZE", {"detail": "initialize" });
           document.dispatchEvent(event);
        console.log('done Setting up init... waiting on IPP-INITIALISED-EVENT.');
	}

    function setUpKnownHooks()
    {
        hooks.getMap            = function(){return (Z.c().h); }
        hooks.panTo             = function(point){ return(hooks.getMap().panTo(point)); };
        hooks.getCenter         = function(){ return(hooks.getMap().getCenter())};
        hooks.setZoom           = function(zoomLevel){ return(hooks.getMap().setZoom(zoomLevel)); };
        hooks.getZoom           = function(){ return(hooks.getMap().getZoom()); };
        hooks.valueFromCookie   = function(name){ return(te(name)) };
        hooks.dashboardConstructor = bf;

        //Originally I wanted to do something like this, but i could nto figure out how to make this the right way.
        /*
         knownHooks.map       = function(){return Z.c().h};
         knownHooks.setZoom   = function(){knownHooks.map().setZoom.apply(Z.c().h, arguments)};
         knownHooks.panTo     = function(){knownHooks.map().panTo.apply(Z.c().h,arguments)};
         knownHooks.getCenter = function(){knownHooks.map().getCenter.apply(Z.c().h, arguments)};
         hooks = knownHooks;
         */
    }

    function overrideDashboard()
    {
        //IF we recognize it
        if(compatible)
        {
            var targetLine = /a\.la\s*=\s*new Re\(T\.c\(\).r,\s*a\.h\),\s*a\.la\.v\(\)/g;
            var myLine = "\na.la.k = IPP.Injected.getUserSettings().comm_default_chat_tab;" + //Sets the default chat tab
                "\nvar c = document.getElementById(\"pl_tab_all\"), d = document.getElementById(\"pl_tab_fac\");" +
                "\na.la.k == \"all\" ? (K(c, \"tab_selected\"), L(d, \"tab_selected\")) : (K(d, \"tab_selected\"), L(c, \"tab_selected\"));";
            //replaceInFunction("bf",targetLine,targetLine+myLine)
            appendInFunction("bf",targetLine,myLine);
        }
        else
        {

            //TODO: finish this... at the moment it only adds an alert...
            var constFunc = findFunctionContaining2(signatures.mapConstructor); // returns bf function
            var chatLogFaction = findInFunction(constFunc.funcPointer,signatures.chatlog); //returns a.la

            //find k... the default chat.
            var chatConst = findFunctionContaining2(signatures.defaultChat); //Re
            var theDefVar = findInFunction(chatConst.funcPointer,signatures.defaultChat) // .k

            var myLine = "\n " + chatLogFaction + theDefVar + " = IPP.Injected.getUserSettings().comm_default_chat_tab;"
               + "\nIPP.Injected.swapClass('tab_selected', document.getElementById('pl_tab_all'), document.getElementById('pl_tab_fac'))";

            var dbConst = findFunctionContaining2(signatures.mapConstructor);
            appendInFunction(dbConst.name, signatures.chatCreation, myLine)
        }
    }

    /*Used to visually swap the classes on a pair of elements. if the class is not there to begin with, it does not swap.*/
    function swapClass(className, elementFrom, elementTo)
    {
        if(elementFrom.classList.contains(className))
        {
            elementFrom.classList.remove(className);
            if(!elementTo.classList.contains(className))
            {
                elementTo.classList.add(className);
            }
        }
    }

    function appendInFunction(aFunctionName,whatToAppendTo,whatToAppendWith)
    {
        var funcName = aFunctionName;
        if(typeof replacedFunctions[funcName] === "undefined")
        {
            replacedFunctions[aFunctionName] = window[funcName]; //backup
        }
        var match = window[funcName].toString().match(whatToAppendTo);
        var scriptCode = funcName + ' = ' + window[funcName].toString().replace(match, match + whatToAppendWith);

        var script = document.createElement('script');
        script.setAttribute("type", "text/javascript");
        script.setAttribute("async", true);
        script.appendChild(document.createTextNode(scriptCode));
        head.appendChild(script);
    }

    function replaceInFunction(aFunctionName,whatToReplace,whatToReplaceWith)
    {
        var funcName = aFunctionName;
        if(typeof replacedFunctions[funcName] === "undefined")
        {
            replacedFunctions[aFunctionName] = window[funcName]; //backup
        }
        var temp = 'IPP.Injected.getUserSettings().redeem_passcode_cleanse === "on" ? a.value.trim() : a.value;'
        var scriptCode = funcName + ' = ' + window[funcName].toString().replace(whatToReplace, whatToReplaceWith);

        var script = document.createElement('script');
        script.setAttribute("type", "text/javascript");
        script.setAttribute("async", true);
        script.appendChild(document.createTextNode(scriptCode));
        head.appendChild(script);
    }

    function findFunctionContaining(someRegex)
    {
        var retVal = null;
        for(var f in window)
        {
            //Filter out undefined, non-functions, and functions that are built in natively.
            if(typeof window[f] !== "undefined" && typeof window[f] === "function" && !(signatures.nativeFunction.test(window[f])))
            {
                if(someRegex.test(window[f]))
                {
                    retVal = window[f];
                }
            }
        }
        return(retVal);
    }

    function findFunctionContaining2(someRegex)
    {
        var retVal = {};
        for(var f in window)
        {
            //Filter out undefined, non-functions, and functions that are built in natively.
            if(typeof window[f] !== "undefined" && typeof window[f] === "function" && !(signatures.nativeFunction.test(window[f])))
            {
                if(someRegex.test(window[f]))
                {
                    retVal.funcPointer = window[f];
                    retVal.name = f;
                }
            }
        }
        return(retVal);
    }

    function findInFunction(aFunction,someRegex)
    {
        return(aFunction.toString().match(someRegex)[1]);
    }

    function identifyHooks()
    {
        var scriptCode = "";
        var geoFunc = findFunctionContaining(signatures.geocode);
        var mapRef = findInFunction(geoFunc, signatures.map_in_geocode);
            scriptCode += "IPP.Injected.hooks.getMap = function(){return ("+mapRef+"); };";
        var cookieFunc = findFunctionContaining(signatures.cookieParser);
            scriptCode += "\nIPP.Injected.hooks.valueFromCookie = function(name){return ("+cookieFunc+"(name)); };";
        var dashConst = findFunctionContaining(signatures.mapConstructor);
            scriptCode += "\nIPP.Injected.hooks.dashboardConstructor = "+dashConst+";";

        var script = document.createElement('script');
            script.setAttribute("type", "text/javascript");
            script.setAttribute("async", true);
            script.appendChild(document.createTextNode(scriptCode));
            head.appendChild(script);

        //For the moment we are going to assume that since there are google Maps api calls, they will keep their names.
        hooks.panTo             = function(point){ return(hooks.getMap().panTo(point)); };
        hooks.getCenter         = function(){ return(hooks.getMap().getCenter())};
        hooks.setZoom           = function(zoomLevel){ return(hooks.getMap().setZoom(zoomLevel)); };
        hooks.getZoom           = function(){ return(hooks.getMap().getZoom()); };

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
            hooks.setZoom(view.zoomLevel); //was z.d
		}
		
		var c = new google.maps.LatLng(view.latitude, view.longitude);
        hooks.panTo(c); //was z.d
		
		//This is what actually moves the map
		//Use the function defined in gen_dashboard.js by v("panto", function(a, b);
		//panto(view.latitude, view.longitude);
		//The oa() >0 live caused loading the same view to zoom in and out on occasion.
		//For now, we will just manually write.
	}

    /*Attempts to determine if ingress total conversion is all up in the page.*/
    function totallyConverted()
    {
        return (document.querySelector('[src*=total-conversion]') ? true : false);
    }

    /*Do basic overrides for the user... to give basic functionality... load and save.*/
    if(totallyConverted())
    {
        console.log('total conversion detected, hacking back in view loading.')
        loadView = function(viewJSON)
        {
            try{
                var view = JSON.parse(viewJSON);
            }catch(e){
                console.error('injectScript.js.loadView unable to parse JSON!\n ERROR: ' + e.message);}
            map.setView([view.latitude, view.longitude], view.zoomLevel);
        }

        getViewJSON = function()
        {
            var cv = map.getCenter();
            var currentView = '{"zoomLevel": ' + map.getZoom() + ',' +
                '"latitude": '  + cv.lat + ',' +
                '"longitude": ' + cv.lng + "}";
            return currentView;
        }

        //Notify the user wel
        //Ask content script for init.
        var event = new CustomEvent("TOTAL-CONV-DETECT", {"detail": "detected" });
            document.dispatchEvent(event);
            console.log('TOTAL-CONV-DETECT');
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
		var cv = hooks.getCenter();
		console.log(cv.Ya + ' ' + cv.Za + '    ' + hooks.getZoom());
		var currentView = '{"zoomLevel": ' + hooks.valueFromCookie("zoom") + ',' +
						   '"latitude": '  + hooks.valueFromCookie("lat") + ',' +
						   '"longitude": ' + hooks.valueFromCookie("lng") + "}";
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
    ns.swapClass = swapClass;
    ns.hooks = hooks;
})();
IPP.Injected.init();



