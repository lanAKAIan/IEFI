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
////chrome.storage.sync.get(function(r){console.log(JSON.stringify(r, null, "  "))})
var IPP;
if(!IPP){ IPP = {} };
if(!IPP.StorageManager){ IPP.StorageManager = {} };
(function() {
	var ns = IPP.StorageManager; //ns is the namespace

    var userData = { userSettings: null
                   , storageVersion: null
                   , userViews: null };
    
    //ok we are going to set flags on these for when they are not valid.
    var saveNeeded = { userSettings: false
                     , storageVersion: false
                     , userViews: false };
	
	var userSettings = {};
	//So in some respect I feel this should be somewhere else. Perhaps also have the objects be part of a thing to build the options page... ie a option default value description thing.
	var defaultSettings = {   "comm_default_chat_tab": 	 		"faction"
							, "comm_past_dates": 			 	"date_time"
							, "comm_time_format": 		  		"standard"
                            , "screenshot_format":              "png"
							, "screenshot_visibility_comm": 	"hide"
							, "screenshot_visibility_email": 	"hide"
							, "screenshot_visibility_nickname": "show"
							, "screenshot_visibility_ap": 		"hide"
							, "screenshot_visibility_xm": 		"hide"
							, "screenshot_visibility_butter": 	"hide"
							, "screenshot_visibility_reward": 	"hide"
                            , "screenshot_visibility_clutter":  "hide"
                            , "screenshot_visibility_mu":       "show"
                            , "screenshot_visibility_search":   "hide"
                            , "screenshot_visibility_controls": "show"
                            , "screenshot_visibility_timestamp":"hide"
                            , "screenshot_visibility_link":     "hide"
                            , "screenshot_visibility_advertise":"show"
                            , "screenshot_visibility_zoom"     :"show"
                            , "auto_load_fresh":                "world"
                            , "auto_load_page":                 "last"
                            , "auto_load_geo_zoom":             15
                            , "auto_load_view":                 null
							, "redeem_passcode_cleanse": 		"on" };
	var debugViews = [ {"latitude":34.21914466653219,"longitude":-118.86657265823362,"viewName":"CLU","zoomLevel":15}
					  ,{"latitude":34.18707661724589,"longitude":-118.88047722976683,"viewName":"The TO Mall","zoomLevel":16}
					  ,{"latitude":34.198648786607514,"longitude":-118.8714864651489,"viewName":"Thousand Oaks","zoomLevel":13}
					  ,{"latitude":34.28040735750082,"longitude":-119.29248599212644,"viewName":"Downtown Ventura","zoomLevel":16}
					  ,{"latitude":37.76016278842576,"longitude":-122.43828664550784,"viewName":"San Francisco","zoomLevel":12}];
    var currentVersion = chrome.runtime.getManifest().version;
    //Uses in the upgrade process.
    var versionTree = [ null, //no version assume baseline
        "1.0.1.0",
        "1.0.2.0",
        "1.1.0.30",
        "1.2.0.6",
        "1.2.1.0",
        "1.2.2.0",
        "1.2.3.0",
        "1.3.0.6",
        "1.3.0.7",
        "1.3.0.8",
        "1.3.2.2",
        "1.3.3.8",
        "1.3.4.0",
        "1.3.5.0",
        "1.3.6.0"];
    if(versionTree[versionTree.length] != currentVersion)
    {
        //We are going to assume this is just a new build, and add it to the tree.
        //currentVersion ensures we always update the version even if no upgrade needed
        versionTree[versionTree.length] = currentVersion;
    }
	
	var toLoad = {};
	
	//Load up the settings from the chrome storage
	function init(callback)
	{
        console.group("Storage Manager Initialization");
		chrome.storage.sync.get(['userViews', 'userSettings', 'storageVersion', 'savedViews'], function(r){
			userData.userViews 		= r.userViews || r.savedViews || []; //For 1.3 we are renaming saved views to userViews. This will see that userViews is empty and fill with savedViews.
			userData.userSettings 	= r.userSettings || {};
			userData.storageVersion = r.storageVersion || null;

            //TODO: remove the old views in a later storage version. ie get rid of variable savedViews.


           saveNeeded = { userSettings: false
                        , storageVersion: false
                        , userViews: false };

            //See if we need to upgrade
            checkForUpgrade();
            console.groupEnd();
            //console.log(JSON.stringify(saveNeeded));

            if(saveNeeded.userViews || saveNeeded.storageVersion || saveNeeded.userSettings)
            {
                console.log('initiating Saving.');
                saveUserData(callback);
            }
            else
            {
                if(typeof callback !== "undefined")
                {
                    callback();
                    //console.log('there was a callback so im on that.')
                }
                /*else
                {
                    console.log('there was not a callback but im ok with that.');
                }*/
            }
			});
	}

    /*TODO: Remove this or fix it... right now it is wasted logic to do nothing*/
    function checkForUpgrade(callback)
    {
        console.info("Previous storage version: " + userData.storageVersion);

        //vhange to while
        while(userData.storageVersion != currentVersion)
        {
            console.log('Stored Data version mismatch detected.');
            switch(userData.storageVersion) //This becomes the from version
            {
                case null:
                    //Intentionally no break. null indicates its from the before time(before I was adding version numbers.)
                case "1.0.1.0":
                    //Technically we will never see this, we didnt version storage this early.
                    upgrade(userData.storageVersion);
                    break;
                case "1.0.2.0":
                    //Technically we will never see this, we didnt version storage this early.
                    upgrade(userData.storageVersion);
                    break;
                case "1.0.3.0":
                    //Not sure we ever released this version.
                    upgrade(userData.storageVersion);
                    break;
                case "1.1.0.30":
                    upgrade(userData.storageVersion);
                    break;
                case "1.2.0.6":
                    upgrade(userData.storageVersion);
                    break;
                case "1.3.0.6":
                    upgrade(userData.storageVersion);
                    break;
                case "1.3.0.7":
                    upgrade(userData.storageVersion);
                    break;
                case "1.3.0.8":
                    upgrade(userData.storageVersion);
                    break;
                default:
                    //So ideally when we go in later with a version that doesnt need an upgrade, it will fall through to this.
                    upgrade(userData.storageVersion);
                    break;
            }
        }
    }


    function renameStorageVariable(from, to)
    {
        var success = false;
        var locus = "start";
        var fromValue, toObj;
        try
        {
            var retrieved = function(r)
                {
                    locus = "retrieved";
                    fromValue = r[from];
                    toObj = {};
                    toObj[to] = fromValue;

                    locus = "saving under new name";
                    var renamed = function()
                    {
                        locus = "removing original value";
                        chrome.storage.sync.remove(from, function(){
                                                            locus="removed old value";
                                                            if(typeof callback !== "undefined"){
                                                                callback();
                                                            }
                        });
                    }
                    chrome.storage.sync.set(toObj, renamed);


                };
            chrome.storage.sync.get(from, retrieved);
            success = true;
        }
        catch(e)
        {
            console.log('ERROR in renameStorage Variable @locus: ' + locus + ' \n ' + e.message);
        }
        return(success);
    }

    //Should this just be in the checkForUpgrade function? oh well.
    ///yeah thats what we did essentially...
    //TODO: merge with caller.
    function upgrade(fromVersionNumber)
    {
        if(fromVersionNumber === "1.0.1.0")
        {
            console.log("Upgrading from either initial two releases.");
            //The only thing that needs to be done is upgrade the version number since we didnt store it.
            //and to trigger next upgrade
        }
        else if(fromVersionNumber === "1.0.2.0")
        {
            addMissingSettings();
        }
        else if(fromVersionNumber === "1.0.3.0")
        {
            //changing the default zoom level to 15 on the geolocation thing to show level 1 portals. since we never let them use the value, replace it.
            console.info('Modifying default user settings');
            if(userData.userSettings.auto_load_geo_zoom != defaultSettings["auto_load_geo_zoom"])
            {
                console.info('Resetting default Geo Zoom to ' + defaultSettings["auto_load_geo_zoom"]);
                userData.userSettings.auto_load_geo_zoom = defaultSettings["auto_load_geo_zoom"];
                //Some users may want this, and it was already a setting. Just changed default.
                //userData.userSettings.screenshot_visibility_search = "hide";
            }
            addGUIDsToViews();
            addMissingSettings();
        }
        else if(fromVersionNumber === "1.2.3.0" || fromVersionNumber === "1.3.0.3" || fromVersionNumber === "1.3.0.8") //TODO: verify version number at upload.
        {
            addMissingSettings(); // we can assume all the variables will at least exist then.
            console.info('Verifying auto-load settings')
            if(userData.userSettings.auto_load_geo_zoom != defaultSettings["auto_load_geo_zoom"])
            {
                console.info('Resetting default Geo Zoom to ' + defaultSettings["auto_load_geo_zoom"]);
                userData.userSettings.auto_load_geo_zoom = defaultSettings["auto_load_geo_zoom"];
            }

            if(userData.userSettings.auto_load_view == "undefined") //Some beta testers had this.
            {
                console.info("Invalid auto_load_view detected, resetting to default");
                userData.userSettings.auto_load_view = defaultSettings["auto_load_view"];

                if(userData.userSettings.auto_load_page === "saved")
                {
                    console.info("Resetting auto_load_page to default based on invalid view");
                    userData.userSettings.auto_load_page = defaultSettings["auto_load_page"];
                }
                if(userData.userSettings.auto_load_fresh === "saved")
                {
                    console.info("Resetting auto_load_fresh to default based on invalid view");
                    userData.userSettings.auto_load_fresh = defaultSettings["auto_load_fresh"];
                }
            }

            console.info('Verifying stored views.');
            addGUIDsToViews();
        }
        //We know there was an upgrade and it should have been to the next version whatever that was.
        saveNeeded.storageVersion = true;
        userData.storageVersion = versionTree[versionTree.indexOf(fromVersionNumber) + 1];
        /* TODO: Right now if we are coming from an unknown version... or rather one not in the tree... it returns -1
         /        looking for it which we then add one to making it 0... which means we get null as the next version...
         /        basically this puts us on the whole upgrade process. This works, but maybe we should try and find the closest version match. */
        console.log("Upgrade from " + fromVersionNumber + " to " + userData.storageVersion + " complete.");
    }

    function addGUIDsToViews(callback)
    {
        console.info('Verifying guids exist in stored views.');
        var changed = false;
        for(var v in userData.userViews)
        {
            if(typeof userData.userViews[v].guid === "undefined" || userData.userViews[v].guid === "undefined" || userData.userViews[v].guid.length === 0) //better safe than sorry? i mean it shouldn't be there yet.
            {
                userData.userViews[v].guid = getGUID();
                changed = true;
            }

        }
        if(changed)
        {
            console.info("Missing GUIDs added to stored views.");
        }
        else
        {
            console.info("GUIDs did not need to be added.");
        }
        saveNeeded.userViews = (saveNeeded.userViews || changed);

        if(typeof callback !== "undefined")
        {
            callback();
        }
    }

    function saveUserData(callback)
    {
        console.group("Saving User Data");
        console.log('Got a request to save the user data');
        chrome.storage.sync.set(userData, function() {
            console.info('User data saved to storage');
            console.groupEnd();
            if(typeof callback !== "undefined")
            {
                callback();
            }
        });
    }

    function resetVersion()
    {
        userData.storageVersion = versionTree[0];
        saveNeeded.storageVersion = true;

        //SPECIFICALLY USE savedViews
        userData.userViews = debugViews;
        saveNeeded.userViews = true;
        saveUserData(function(){renameStorageVariable("userViews", "savedViews"); console.log('Version reset to ' + userData.storageVersion + ', debug views added to storage');});
    }
	
	//goes through all default settings and if it finds something missing it adds the default
	function addMissingSettings()
	{
        console.group("Missing User Settings Check");
		
		console.info("Current userSettings: " + JSON.stringify(userData.userSettings));
				
		if(typeof userData.userSettings === "undefined")
		{
            console.info("No User Settings detected, loading defaults.")
			userData.userSettings = defaultSettings;
			saveNeeded.userSettings = true;
		}
		else
		{
			//Check all the settings we have defaults for, and load them in if needed
			for(var defSetting in defaultSettings)
			{
				if(typeof userData.userSettings[defSetting] === "undefined")
				{
					console.info("Detected missing setting, loading default for: " + defSetting);
					userData.userSettings[defSetting] = defaultSettings[defSetting];
					saveNeeded.userSettings = true;
				}
				/*else
				{
					console.info("userSettings exists for: " + defSetting);
				}*/
			}
		}
		if(saveNeeded.userSettings)
		{
            console.info("User Settings have been changed, a save will be required.");
			setUserSettings(userData.userSettings);
		}
        console.groupEnd();
	}
	
	//Returns an Array of userSettings. Not JSON.
	getUserSettings = function()
	{
		return(userData.userSettings);
	}
	
	/*Takes as input a settings object... overwrites the user settings with it. May want to do error checking on what we get.*/
	setUserSettings = function(settingsObject, callback)
	{
        userData.userSettings = settingsObject;
        saveNeeded.userSettings = true;

        saveUserData(callback);
	}
	
	//Returns an Array of userViews. not JSON
	getUserViews = function()
	{
		return(userData.userViews);
	}

    //This is basically so we can just pass one object ot the different contexts.
    getAllData = function()
    {
        /*var data = {};
            data.userSettings = userData.userSettings;
            data.storageVersion = userData.storageVersion;
            data.userViews = userData.userViews;*/
        return(userData);
    }

    setAllData = function(newData, force, callback)
    {
        if(force)
        {
            userData = newData
        }
        else
        {
            //we should do some verification that the data is valid, but for now....
            //make sure ti is even an object... etc
            userData.storageVersion = newData.storageVersion;
            userData.userSettings = newData.userSettings
            userData.userViews = newData.userViews; //Wow... i really gotta fix this naming...

        }
        saveUserData(callback);
    }
	
	//Add the public methods.
	ns.init = init;
	ns.getUserSettings = getUserSettings;
	ns.getUserViews = getUserViews;
	ns.setUserSettings = setUserSettings;
    ns.getAllData = getAllData;
    ns.setAllData = setAllData;
    ns.resetVersion = resetVersion;
	//Object.defineProperty(ns, "userSettings", { get : function(){return userSettings;}, configurable : false, enumerable : false } );
})();
IPP.StorageManager.init();

console.log('StorageManager loaded');

//View all in storage
