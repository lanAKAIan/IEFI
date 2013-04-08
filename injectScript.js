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
        signatures.redeem           = /var\s+[a-zA-Z_$]+\s*=\s*document\.getElementById\("passcode"\),\s*[a-zA-Z_$]+\s*=\s*[a-zA-Z_$]+\.value;/;
        signatures.geocode          = /document\.getElementById\("address"\)/; //Now called doGeocode
        signatures.map_in_geocode   = /(([A-Za-z0-9_$]+)(.([A-Za-z0-9_$]+))*)\.fitBounds\([A-Za-z0-9_$\[\]\.]+\)/;
        signatures.cookieParser     = /return\s+[a-zA-Z_$]+\("ingress\.intelmap\."\s*\+\s*[a-zA-Z_$]+\)/;
        signatures.mapConstructor   = /([a-zA-Z_$]+\.[a-zA-Z_$]+)\s*=\s*new\s+google\.maps\.Map\(document\.getElementById\("map_canvas"\)\,\s*[a-zA-Z_$]+\);/;
        signatures.chatCreation     = /[a-zA-Z_$]+\.[a-zA-Z_$]+\s*=\s*new\s+[a-zA-Z_$]+\([a-zA-Z_$]+\.[a-zA-Z_$]+\(\)\.[a-zA-Z_$]+,\s*[a-zA-Z_$]+\.[a-zA-Z_$]+\),\s*[a-zA-Z_$]+\.[a-zA-Z_$]+\.[a-zA-Z_$]+\(\)/;
        //duplicate above except more paren... so shoudl replace.
        signatures.chatlog          = /([a-zA-Z$_]+\.[a-zA-Z$_]+)\s*=\s*new\s+[a-zA-Z$_]+\([a-zA-Z$_]+\.[a-zA-Z$_]+\(\)\.[a-zA-Z$_]+,\s*[a-zA-Z$_]+\.[a-zA-Z$_]+\),\s*[a-zA-Z$_]+\.[a-zA-Z$_]+\.[a-zA-Z$_]+\(\)/;
        signatures.defaultChat      = /this\.([a-zA-Z$_]+)\s*=\s*"faction"/;
        signatures.dashboardConst   = /([\s\S]+zoom\s*:\s*)([a-zA-Z_$]+)(,[\s\S]+new\s+google\.maps\.LatLng)(\([a-zA-Z_$]+,\s*[a-zA-Z_$]+\);)([\s\S]+)/g
        signatures.defaultMapLocation  = /[a-zA-Z_$]+\(MAP_PARAMS\).+/;
    var replacedFunctions = {};
    var userData = { userSettings: null
                   , storageVersion: null
                   , userViews: null };
    var transientData = { "userLocation": { "status": "pending"
                                           ,"message": "Geolocation retrieval has not yet been attempted." }
                         ,"initialized": false
                         ,"compatibility": "incompatible"
                         ,"IITCDetected": false };

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
		document.addEventListener("REQ-GET_VIEW", getCurrentView, false); //false makes events propagate up first.
		document.addEventListener("IPP-UPDATE_USER_SETTINGS", function(e) { setUserSettings(e.detail) }, false); //false makes events propagate up first.
        document.addEventListener("IPP-UPDATE_USER_DATA", function(e){ setUserData(e.detail) }, false);
        document.addEventListener("IPP-INITIALIZED", function(e){
            userData = e.detail.userData;
            transientData = e.detail.transientData;
            
            //compatible = (e.detail.compatibility.compatibility=="compatible");
            console.log('DETECTED IPP-INITIALIZED EVENT');
            if(typeof ingressInit !== null && transientData.initialized == false)
            {
                try
                {
                    //Things that need the userData should be loaded at this time.
                    console.log('IPP initialized calling ingress init.');
                    if(transientData.compatibility == "compatible")
                    {
                        console.log("Use known variable names");
                        setUpKnownHooks();
                    }
                    else
                    {
                        console.warn("Alternate hooking needed");
                        identifyHooks();
                    }
                    transientData.initialized = true;
    
                    console.log(JSON.stringify(userData.userSettings, null, ' '));
                    console.log(JSON.stringify(transientData, null, ' '));

                    overrideDashboard();
                }
                catch(e)
                {
                    console.error("Problem during initialization : " + e.message);
                }
                finally
                {
                    //Make sure this gets called even if we totally mess up.
                    ingressInit();
                }
            } }, false);

        //Request user settings basically we should probably not go on until we wave them...

        //do any hooking needed.
        overwriteRedeemCode();
        //findDateFormatter();

        //Ask content script for init.
        var event = new CustomEvent("INITIALIZE", {"detail": "initialize" });
           document.dispatchEvent(event);
        console.log('done Setting up init... waiting on IPP-INITIALISED-EVENT.');
	}

    function setUpKnownHooks()
    {
        hooks.getMap            = function(){return (V.e().q); }
        hooks.panTo             = function(point){ return(hooks.getMap().panTo(point)); };
        hooks.getCenter         = function(){ return(hooks.getMap().getCenter())};
        hooks.setZoom           = function(zoomLevel){ return(hooks.getMap().setZoom(zoomLevel)); };
        hooks.getZoom           = function(){ return(hooks.getMap().getZoom()); };
        hooks.valueFromCookie   = function(name){ return(Md(name)) };
        hooks.dashboardConstructor = kg;
    }

    function identifyHooks()
    {
        try
        {
            var locus = "identifyHooks - start";
            var scriptCode = "";
            locus = "identifyHooks - findGeoFunc";
            var geoFunc = findFunctionContaining(signatures.geocode);
            locus = "identifyHooks - find mapRef";
            var mapRef = findInFunction(geoFunc, signatures.map_in_geocode);
            scriptCode += "IPP.Injected.hooks.getMap = function(){return ("+mapRef+"); };";
            locus = "identifyHooks - findCookieParser";
            var cookieFunc = findFunctionContaining(signatures.cookieParser);
            scriptCode += "\nIPP.Injected.hooks.valueFromCookie = function(name){return ("+cookieFunc+"(name)); };";
            locus = "identifyHooks - find Dashboard constructor";
            var dashConst = findFunctionContaining(signatures.mapConstructor);
            scriptCode += "\nIPP.Injected.hooks.dashboardConstructor = "+dashConst+";";
    
            locus = "identifyHooks - injecting found hooks.";
            var script = document.createElement('script');
            script.setAttribute("type", "text/javascript");
            script.setAttribute("async", true);
            script.appendChild(document.createTextNode(scriptCode));
            head.appendChild(script);
    
            locus = "identifyHooks - adding additional map hooks.";
            //For the moment we are going to assume that since there are google Maps api calls, they will keep their names.
            hooks.panTo             = function(point){ return(hooks.getMap().panTo(point)); };
            hooks.getCenter         = function(){ return(hooks.getMap().getCenter())};
            hooks.setZoom           = function(zoomLevel){ return(hooks.getMap().setZoom(zoomLevel)); };
            hooks.getZoom           = function(){ return(hooks.getMap().getZoom()); };
        }
        catch(e)
        {
            console.error('Problem in identifyHooks @ ' + locus + '\n' + e.message);
        }

    }

    /*so would return null if the view doesnt exist.*/
    function getDefaultView()
    {
        console.log('Checking for a default View');
        var retVal = null;
        for(var v in userData.userViews)
        {
            if(userData.userViews[v].guid == userData.userSettings.auto_load_view)
            {
                retVal = userData.userViews[v];
                console.log('Default View found');
            }
        }
        if(!retVal)
        {
            console.info("User requested a default load of a view, but did not specify a view");
        }
        return(retVal);
    }

    function overrideDashboard()
    {
        //At this point, we should have identified hoooks.

        //IF we recognize it
        if(transientData.compatibility == "compatible")
        {
            if(userData.userSettings.comm_default_chat_tab != "faction")
            {
                var commConst = findFunctionContaining2(signatures.defaultChat); //Re
                var ChatModeVar = commConst.funcPointer.toString().match(signatures.defaultChat)[1]; //k
                var commVar = hooks.dashboardConstructor.toString().match(RegExp('([a-zA-Z$_]+\\.[a-zA-Z$_]+)\\s*=\\s*new\\s+' + commConst.name +'.+')); //a.la is 1     //TODO: get bf someother way

                var newLine = ';' + commVar[1] + '.' + ChatModeVar + '="' + userData.userSettings.comm_default_chat_tab + '";'; //do the override
                //visually fix
                    newLine += "\nIPP.Injected.swapClass('tab_selected', document.getElementById('pl_tab_all'), document.getElementById('pl_tab_fac'))";

                replaceInFunction("kg",commVar[0],commVar[0]+newLine);
            }


/*
            var targetLine, myLine;
            //Set up default chat
            if(userData.userSettings.comm_default_chat_tab != "all")
            {
                targetLine = "a.la = new Re(T.c().r, a.h), a.la.v()";
                myLine = "\na.la.k = IPP.Injected.getUserSettings().comm_default_chat_tab;" + //Sets the default chat tab
                    "\nvar c = document.getElementById(\"pl_tab_all\"), d = document.getElementById(\"pl_tab_fac\");" +
                    "\na.la.k == \"all\" ? (K(c, \"tab_selected\"), L(d, \"tab_selected\")) : (K(d, \"tab_selected\"), L(c, \"tab_selected\"));";
                replaceInFunction("bf",targetLine,targetLine+myLine);
            }
*/

            //Set up default loads. basically if we are not set to default on one of them
            if(userData.userSettings.auto_load_fresh != "world" || userData.userSettings.auto_load_page != "last")
            {
                var defaultView = getDefaultView();
                //find alternate method for Oe - hooks.valueFromCookie
                var state = hasProperties(MAP_PARAMS) ? (hooks.valueFromCookie("lat") ? "newPage" : "fresh") : "directLink";
                //1.3.1.0 - so we were using the hook for dashboard constructor here... but it was a pointer to the old function... need to create hooks later, or remember to update.
                var matches = signatures.dashboardConst.exec(kg.toString());
                //  matches[0] - whole thing
                //  matches[1] - before zoom
                //  matches[2] - zoomLevel variable
                //  matches[3] - after zoom var
                //  matches[4] - parameters sent to google map LatLng
                //  matches[5] - after point creation.
                var replaceZoom, replaceLatLng;

                //override any map points
                if(transientData.userLocation.status == "known" && ((state == "fresh" && userData.userSettings.auto_load_fresh == "geo") || (state == "newPage" && userData.userSettings.auto_load_page == "geo")))
                {
                    console.info('Using geolocation for map');
                    replaceZoom = userData.userSettings.auto_load_geo_zoom;
                    replaceLatLng = "(" + transientData.userLocation.latitude + "," + transientData.userLocation.longitude + ");"
                }
                else if(defaultView != null && ((state == "fresh" && userData.userSettings.auto_load_fresh == "saved") || (state == "newPage" && userData.userSettings.auto_load_page == "saved")))
                {
                    console.info('Using saved view for map');
                    replaceZoom = defaultView.zoomLevel;
                    replaceLatLng = "(" + defaultView.latitude + "," + defaultView.longitude + ");";
                }
                if(typeof replaceZoom !== "undefined" && typeof replaceLatLng !== "undefined")
                {
                    matches[2] = '(' + matches[2] + ' = ' + replaceZoom + ')';
                    matches[4] = replaceLatLng;
                }

                matches.shift(); //Remove the original function.
                //In the end we just add a script with the new function definition... no assignment or anything needed, beyond backing up.
                addScript(matches.join('')); //need empty string otherwise it adds ,

                if(totallyConverted())
                {
                    console.log('Total conversion making things interesting.');
                    if(transientData.userLocation.status == "known" && ((state == "fresh" && userData.userSettings.auto_load_fresh == "geo") || (state == "newPage" && userData.userSettings.auto_load_page == "geo")))
                    {
                        console.info('Using geolocation for map');
                        map.setView([transientData.userLocation.latitude, transientData.userLocation.longitude], userData.userSettings.auto_load_geo_zoom);
                    }
                    else if(defaultView != null && ((state == "fresh" && userData.userSettings.auto_load_fresh == "saved") || (state == "newPage" && userData.userSettings.auto_load_page == "saved")))
                    {
                        console.info('Using saved view for map');
                        map.setView([defaultView.latitude, defaultView.longitude], defaultView.zoomLevel);
                    }
                }

            }
            else
            {
                console.info('Using ingress defaults for map autoload location.');
            }
        }
        else
        {
            var constFunc;
            var chatLogFaction;
            var chatConst;
            var theDefVar;
            var myLine;
            var dbConst;
            if(userData.userSettings.comm_default_chat_tab != "faction")
            {
                constFunc = findFunctionContaining2(signatures.mapConstructor); // returns bf function
                chatLogFaction = findInFunction(constFunc.funcPointer,signatures.chatlog); //returns a.la

                //find k... the default chat.
                chatConst = findFunctionContaining2(signatures.defaultChat); //Re
                theDefVar = findInFunction(chatConst.funcPointer,signatures.defaultChat) // .k

                myLine = "\n " + chatLogFaction + theDefVar + " = IPP.Injected.getUserSettings().comm_default_chat_tab;"
                   + "\nIPP.Injected.swapClass('tab_selected', document.getElementById('pl_tab_all'), document.getElementById('pl_tab_fac'))";

                dbConst = findFunctionContaining2(signatures.mapConstructor);
                appendInFunction(dbConst.name, signatures.chatCreation, myLine)
            }

            console.log('Currently default view loading does not work when dashbaord is not known.');

            //Set up default loads. basically if we are not set to default on one of them
            //TODO: add support for this with dynamic
            /*if(userData.userSettings.auto_load_fresh != "world" || userData.userSettings.auto_load_page != "last")
            {
                constFunc = findFunctionContaining2(signatures.mapConstructor); // returns bf function
                myLine = "";
                replaceInFunction(constFunc.name,signatures.defaultMapLocation,myLine);
            }*/
        }
    }

    /*Attempts to determine if ingress total conversion is all up in the page.*/
    function totallyConverted()
    {
        return (transientData.IITCDetected);
    }
    
    function setTotallyConverted(isIITC)
    {
        transientData.IITCDetected = isIITC;
    }

    function addScript(scriptCode)
    {
        var script = document.createElement('script');
        script.setAttribute("type", "text/javascript");
        script.setAttribute("async", true);
        script.appendChild(document.createTextNode(scriptCode));
        head.appendChild(script);
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
		console.log('total conversion status: ' + totallyConverted());
		if(totallyConverted())
        {
                try{
                    var view = JSON.parse(viewJSON);
                }catch(e){
                    console.error('injectScript.js.loadView unable to parse JSON!\n ERROR: ' + e.message);}
                map.setView([view.latitude, view.longitude], view.zoomLevel);
        }
        else
        {
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
		
		
	}

	/**
	*	@name: getViewJSON
	*	@description: - pulls the current viewwindow data from the intel map and ereturns it in JSON syntax.
	*	@return: viewJSON: {latitude: value, longitude: value, zoomLevel: value}
	*/
	function getViewJSON()
	{
        if(totallyConverted())
        {
            getViewJSON = function()
            {
                var cv = map.getCenter();
                var currentView = '{"zoomLevel": ' + map.getZoom() + ',' +
                    '"latitude": '  + cv.lat + ',' +
                    '"longitude": ' + cv.lng + "}";
                return currentView;
            }
        }
        else
        {
            //create some JSON.
            //https://developers.google.com/maps/documentation/javascript/reference#Map

            //NOTE: an alternate method is document.querySelector('[title="Report errors in the road map or imagery to Google"]').href which should be less susceptible to code?
            //'https://www.ingress.com/intel?' + document.querySelector('[title="Report errors in the road map or imagery to Google"]').href.split('?')[1].split('&t')[0].replace(/\./g,'').replace('ll','latE6').replace(',', '&lngE6=')
            //var cv = hooks.getCenter();
            //console.log(hooks.valueFromCookie("lat") + ' ' + hooks.valueFromCookie("lng") + ' ' + hooks.getZoom());
            getViewJSON = function()
            {
                var currentView = '{"zoomLevel": ' + hooks.valueFromCookie("zoom") + ',' +
                    '"latitude": '  + hooks.valueFromCookie("lat") + ',' +
                    '"longitude": ' + hooks.valueFromCookie("lng") + "}";
                return currentView;
            }
        }
        return getViewJSON();
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
     * Determines if an object has any properties.
     * If it does not, the for in will not run, and we will return true.
     * @param someObject the object that should be tested for properties
     * @return {Boolean}
     */
    function hasProperties(someObject)
    {
        for(var key in someObject)
        {
            return false;
        }
        return true;
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
    ns.getDefaultView = getDefaultView;
    ns.findFunctionContaining2 = findFunctionContaining2;
    ns.setTotallyConverted = setTotallyConverted;
    ns.hooks = hooks;
})();
IPP.Injected.init();



