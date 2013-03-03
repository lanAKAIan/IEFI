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
                            , "screenshot_visibility_search":   "show"
                            , "screenshot_visibility_controls": "show"
                            , "screenshot_visibility_timestamp":"hide"
                            , "screenshot_visibility_link":     "hide"
                            , "screenshot_visibility_advertise":"show"
                            , "auto_load_fresh":                "world"
                            , "auto_load_page":                 "last"
                            , "auto_load_geo_zoom":             2
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
        //"1.2.1.0",
        currentVersion ]; //currentVersion ensures we always update the version even if no upgrade needed
	
	var toLoad = {};
	
	//Load up the settings from the chrome storage
	function init(callback)
	{
        console.group("Storage Manager Initialization");
		chrome.storage.sync.get(['savedViews', 'userSettings', 'storageVersion'], function(r){
			userData.userViews 		= r.savedViews || [];
			userData.userSettings 	= r.userSettings || {};
			userData.storageVersion = r.storageVersion || null;

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



    function checkForUpgrade(callback)
    {
        console.info("Previous storage version: " + userData.storageVersion);

        //vhange to while
        while(userData.storageVersion != currentVersion)
        {
            console.log('Stored Data version mismatch detected.');
            switch(userData.storageVersion)
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
                default:
                    //So ideally when we go in later with a version that doesnt need an upgrade, it will fall through to this.
                    upgrade(userData.storageVersion);
                    break;
            }
        }
    }

    //Should this just be in the checkForUpgrade function? oh well.
    ///yeah thats what we did essentially...
    //TODO: merge with caller.
    function upgrade(fromVersionNumber)
    {
        if(fromVersionNumber == "1.0.1.0")
        {
            console.log("was from initial two releases.");
            //The only thing that needs to be done is upgrade the version number since we didnt store it.
            //and to trigger next upgrade
        }
        else if(fromVersionNumber === "1.0.2.0") //TODO: verify version number at upload.
        {
            //The only thing we really need to do is add guids to the views. The other changes will get handled by themselves.
            console.info('Adding GUIDs to stored views.');
            var v;
            for(v in userData.userViews)
            {
                if(typeof userData.userViews[v].guid === "undefined") //better safe than sorry? i mean it shouldn't be there yet.
                {
                    userData.userViews[v].guid = getGUID();
                }
                saveNeeded.userViews = true;
            }
            console.info("GUIDs added to stored views.");

            addMissingSettings();
        }
        //We know there was an upgrade and it should have been to the next version whatever that was.
        saveNeeded.storageVersion = true;
        userData.storageVersion = versionTree[versionTree.indexOf(fromVersionNumber) + 1];
        console.log("Upgrade from " + fromVersionNumber + " to " + userData.storageVersion + " complete.");
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

        userData.userViews = debugViews;
        saveNeeded.userViews = true;

        saveUserData(function(){console.log('Version reset to ' + userData.storageVersion + ', debug views added to storage');});
    }

    //TODO: need a way to handle upgrades that require processing.
	
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
	
	//Add the public methods.
	ns.init = init;
	ns.getUserSettings = getUserSettings;
	ns.getUserViews = getUserViews;
	ns.setUserSettings = setUserSettings;
    ns.getAllData = getAllData;
    ns.resetVersion = resetVersion;
	//Object.defineProperty(ns, "userSettings", { get : function(){return userSettings;}, configurable : false, enumerable : false } );
})();
IPP.StorageManager.init();

console.log('StorageManager loaded');