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

/** contentScript.js
 */

var userData = { userSettings: null
                , storageVersion: null
                , userViews: null };
var transientData = { "userLocation": { "status": "pending",
                                        "message": "Geolocation retrieval has not yet been attempted."},
                      "initialized": false,
                      "compatibility": "incompatible",
                      "IITCDetected": false };

var head = document.head || document.getElementsByTagName("head")[0] || document.documentElement;

//TODO: While this fixes the immediate issue, determine if chrome prerendered the page and never actually displays it, are we leaking memory?
var initSent = false; //This is a flag that is used to work around page being prerendered and background page not being able to talk to it.

/**
 * checks to see if we are logged into the intel site. That way we don't get undefined errors.
 * NOTE: we may want to look for a specific element on the page like the login info box, but some userscript might remove it for who knows what.
 */
function loggedIn() {
    var retVal = false;

    if (document.getElementById("header_login_info") != null) {
        retVal = true;
    }
    else{
        var title = head.getElementsByTagName("title")[0].textContent;
        if (title == "Ingress Intel Map") {
            retVal = true;
        }
        else if (title == "Ingress") {
            retVal = false;
        }
        else {
            console.error('It seems that the title of the page is not the login or the map as expected... this is what it is: ' + title);
            retVal = false;
        }
    }
    return retVal;    
}

function getDashboardURI()
{
    var retVal = null;
    try
    {
        var matches = document.querySelectorAll('script[src*=gen_dashboard]');
        if(matches.length==1)
        {
            retVal = matches[0].src;

        }
    }
    catch(e)
    {
        console.error('Problem detecting the dashboard script version: ' + e.message);
    }
    finally
    {
        if(retVal == null)
        {
            console.error('Using generic dashboard location');
            retVal = "https://www.ingress.com/intel/jsc/gen_dashboard.js";
        }
        console.info('Using dashboard url:' + retVal);
    }
    return(retVal);
}

/**
 * This section deals with actually injecting the injectScript.js into the ingress page. We are not checking the url on the assumption the manifest will
 * at release only fire for ingress pages. Anyway the reason we have an injectScript.js file at all is because contentScript can not access the pages window variables
 * just dom.
 */
var script = document.createElement('script');
    script.setAttribute("type", "text/javascript");
    script.setAttribute("async", true);
    script.setAttribute("src", chrome.extension.getURL("injectScript.js"));
    head.insertBefore(script, head.firstChild);
    
//Now adding in IITC plugin    
    script = document.createElement('script');
    script.setAttribute("type", "text/javascript");
    script.setAttribute("async", true);
    script.setAttribute("src", chrome.extension.getURL("iitc-connection.js"));
    head.insertBefore(script, head.firstChild);

/**
 * This section sets up the message listeners in the content script for messages from the background.js page.
 * it ends up acting as a middle man
 */
chrome.extension.onMessage.addListener(
    function (request, sender, sendResponse) {
        //console.log(sender.tab ? "from a content script:" + sender.tab.url : "from the extension");
        //console.log('contentScript revieved request: ' + request.request);
        if (request.request == "LOAD_VIEW") {
            // create and dispatch the event

            var event = new CustomEvent("loadView", {"detail":request.view });
            document.dispatchEvent(event);

            sendResponse({farewell:"VIEW lOADED"});
            //console.log('response sent');
        }
        else if (request.request == "GET_VIEW") {
            //console.log('ContentScript requested to load a view.');
            //set up how to handle the response
            var getViewResponseListener = function (e) {
                document.removeEventListener("RESP-GET_VIEW", getViewResponseListener, false); //make sure we dont keep capturing this event, otherwise we will keep duplicating.

                //console.log('RESP-GET_VIEW Recieved sending it back to background page');
                //console.log('RESP-GET_VIEW got from page: ' + e.detail.viewInfo);
                sendResponse({ viewInfo:e.detail.viewInfo }, function () {/*this is so we dont get error because background sent back a thanks*/
                });
                //console.log('GET_VIEW response sent');
            }
            document.addEventListener("RESP-GET_VIEW", getViewResponseListener, false);

            // create and dispatch the event
            var event = new CustomEvent("REQ-GET_VIEW", {"detail":"please" });
            document.dispatchEvent(event);
            //console.log('conentScript sent request to the injectedpage for the view info.');
        }
        else if (request.request == "GET_PLAYER_TEAM") {
            //console.log('ContentScript requested to load a view.');
            //set up how to handle the response
            
            sendResponse({ teamName: getPlayerTeam() }, function () {/*this is so we dont get error because background sent back a thanks*/
                });
        }
        else if (request.request == "HIDE_PII") {
            //console.log('ContentScript requested to hide pii');
            //hidePII(true, function(){alert('god damn you');});
            //sendResponse( {farewell: "PII_HIDDEN"} );
            //setTimeout(function(){sendResponse( {farewell: "PII_HIDDEN"}, function(){})}, 1000);
            hidePII(true, function () {
                console.log('sure would like to send a callback here')
            });
            sendResponse({farewell:"PII_HIDDEN"});
        }
        else if (request.request == "SHOW_PII") {
            //console.log('ContentScript requested to show pii.');
            hidePII(false);
            sendResponse({farewell:"PII_SHOWN"});
        }
        else if (request.request == "GET_LOGIN_STATUS") {
            //console.log('ContentScript checking if we are logged in for backbroundpage.');
            sendResponse({loginStatus:loggedIn()});
        }
        else if (request.request == "NOTIFY_SETTINGS_UPDATED") {
            console.log('Content Script got a notification of new user settings.');
            userData.userSettings = request.userSettings;
            // create and dispatch the event
            var event = new CustomEvent("IPP-UPDATE_USER_SETTINGS", {"detail": userData.userSettings });
            document.dispatchEvent(event);

            sendResponse({farewell:"SETTINGS SENT TO CLIENT"});
            //console.log('response sent');
        }
        else if (request.request == "NOTIFY_ALL_USER_DATA") {
            console.log('Content Script got a notification of all user data.');
            userData = request.userData;
            // create and dispatch the event
            var event = new CustomEvent("IPP-UPDATE_USER_DATA", {"detail": userData });
            document.dispatchEvent(event);

            sendResponse({farewell:"USERDATA SENT TO CLIENT"});
            //console.log('response sent');
        }
        else if (request.request == "INITIALIZE") {
            userData = request.userData;
            // create and dispatch the event
            /*var event = new CustomEvent("IPP-INITIALIZED", {"detail": userData });
            document.dispatchEvent(event);
            sendResponse({farewell:"USERDATA Initialize SENT TO CLIENT"});*/
        }
        else if (request.request == "NOTIFY_INIT_DATA") {
            console.log('Content Script received initialization data from background');
            userData = request.userData;
            transientData.compatibility = request.compatibility;

            var initInjected = function()
            {
                var initData = {"userData": userData,
                    "transientData": transientData};
                // create and dispatch the event
                var event = new CustomEvent("IPP-INITIALIZED", {"detail": initData });
                document.dispatchEvent(event);
                
                fixSelectables();
                adjustCommStyle();
                adjustDeveloperFilterStyle();
            }
            requestUserLocation(initInjected);

            sendResponse({farewell:"USERDATA Initialize SENT TO CLIENT"});
        }
    });

document.addEventListener("INITIALIZE", handleInjectInitRequest, false);
/**
 * This function is the listener for the injected script being initialized.
 */
function handleInjectInitRequest()
{
    console.info('CS handle InjectInitRequest detected page to be %s.', document.webkitVisibilityState );
    //We should request the compatibility... and the userdata etc.
    
    if(document.webkitVisibilityState === "prerender")
    {
        //we need to wait before we send a message, because the backgroudn page cant send one back.
        console.info('we are waiting to send the init message to background page till we are visible.');
    }
    else
    {
        sendInitEvent();
    }
}

function sendInitEvent()
{
    if(!initSent)
    {
        initSent = true;
        chrome.extension.sendMessage( {message:"NEW-INITIALIZE-EVENT", 
                                       dashboardURI: getDashboardURI()}, 
                                       function (response) {
                                        console.log('Content Script got a notification to initialize.');
                                       } );
    }
    else
    {
        console.warn('Blocked double sendInitEvent request in contentScript.');
    }
}

document.addEventListener("TOTAL-CONV-DETECT", notifyTotalConversion, false);
/**
 * This function is the listener for the injected script being initialized.
 */
function notifyTotalConversion()
{
    //We should request the compatibility... and the userdata etc.
    transientData.IITCDetected = true;
    chrome.extension.sendMessage({message:"TOTAL-CONVERSION-DETECTED"}, function (response) {
        console.log('Content Script got a notification that it was in totalConversion.');
    });
}

var screenshotStyle;
function hidePII(hide, callback) {
    var locus = "";

    var screenshotCSS = ""; //fill it out then append
    try {
        if (hide == true) {
            if (userData.userSettings.screenshot_visibility_comm == "hide") {
                locus = "hiding communications";
                screenshotCSS += "#comm,";
            }
            if (userData.userSettings.screenshot_visibility_ap == "hide") {
                locus = "hiding AP";
                screenshotCSS += "#ap,#player_ap_icon,";
            }
            if (userData.userSettings.screenshot_visibility_email == "hide") {
                locus = "hiding header info... and email";
                //document.getElementById('header_email').classList.add('IPP_Screenshot');
                screenshotCSS += "#header_login_info,#header_login_info_box,";
            }
            if (userData.userSettings.screenshot_visibility_butter == "hide") {
                locus = "hiding butterbar";
                screenshotCSS += "#butterbar,";
            }
            if (userData.userSettings.screenshot_visibility_xm == "hide") {
                locus = "hiding XM";
                screenshotCSS += "#xm_slot,#xm,";
            }
            if (userData.userSettings.screenshot_visibility_reward == "hide") {
                locus = "hiding reward";
                screenshotCSS += "#redeem_reward,";
            }
            if (userData.userSettings.screenshot_visibility_invites == "hide") {
                locus = "hiding invites";
                screenshotCSS += "#header_invites,";
            }
            if (userData.userSettings.screenshot_visibility_search == "hide") {
                locus = "hiding geocode search";
                screenshotCSS += "#geotools,";
            }
            if (userData.userSettings.screenshot_visibility_community == "hide") {
                locus = "hiding community link";
                screenshotCSS += "#header_links,#header_links_title,";
            }
            if (userData.userSettings.screenshot_visibility_mu == "hide") {
                locus = "hiding zoom level";
                screenshotCSS += "#game_stats,";
            }
            if (userData.userSettings.screenshot_visibility_zoom == "hide") {
                locus = "hiding mind units";
                screenshotCSS += "#zoom_level_data,";
            }
            if (userData.userSettings.screenshot_visibility_nickname == "hide") {
                locus = "hiding player nickname";
                screenshotCSS += ".player_nickname,";
            }
            if (userData.userSettings.screenshot_visibility_controls == "hide") {
                locus = "hiding map controls";
                screenshotCSS += '.gmnoprint:not([style*="z-index: 1000001;"]),#snapcontrol,'; //Specifically keep Google cpoyright
            }
            if (userData.userSettings.screenshot_visibility_clutter == "hide") {
                locus = "hiding other clutter";
                //screenshotCSS += "#nav,#header_links,#header_links_box,#header_invites,#header_invites_box,";
                screenshotCSS += ".nav_link,#header_links,#header_links_box,#header_invites,#header_invites_box,#header_maplink,";
            }
            //now that we have what we want to apply, lets add the style. replace last ,. need to deal with empty
            screenshotCSS = screenshotCSS.replace(/,$/, '{visibility: hidden;}')

            //Add content
            if (userData.userSettings.screenshot_visibility_advertise == "show") {
                locus = "add icon";
                screenshotCSS += "\n #nav:before { float: left; display: inline-block; height: 21px; width: 21px; margin-top: 6px; content: ' '; background: url(" + chrome.extension.getURL('res/icon-128-menu.png') + ") no-repeat;  background-size: auto 100%; }";
            }

             //At the moment this does not know how to get the current view link... ironic no?
             /*if(userData.userSettings.screenshot_visibility_link == "show")
             {
             locus = "add direct link";
             //var link = 'https://www.ingress.com/intel?\' + document.querySelector(\'[title="Report errors in the road map or imagery to Google"]\').href.split(\'?\')[1].split(\'&t\')[0].replace(/\./g,\'\').replace(\'ll\',\'latE6\').replace(\',\', \'&lngE6=\')'
             var link = 'document.domain';
                 screenshotCSS+="\n #nav:after { display: inline-block; position: relative; right: 0; height: 40px; padding-left: 4px; top: 4px; font-size: 15px; text-transform: none; content: '"+link+"'; }";
             }
            */

            console.log('screenshotCSS: ' + screenshotCSS);
            screenshotStyle = document.createElement('style');
            screenshotStyle.setAttribute("type", "text/css");
            screenshotStyle.appendChild(document.createTextNode(screenshotCSS));
            var screenshotStyleWatch = function () {
                screenshotStyle.removeEventListener('load', screenshotStyleWatch, false);
                callback();
            }
            screenshotStyle.addEventListener('load', screenshotStyleWatch, false);
            /*test success*/
           //NOTE: aslong as we add the listenerbefore code is actually added to the page below, we are fine.
            head.appendChild(screenshotStyle);
            console.log('sent append style');

        }
        else {
            locus = "reshowing";
            head.removeChild(screenshotStyle);
        }

    } catch (e) {
        console.error('There was a problem changing the visibility of Ingress Components: \n' + locus + '\n' + e.message);
    }
}

var selectablesStyle;
function fixSelectables() {
    var locus = "";

    var selectableCSS = ""; //fill it out then append
    try {
        console.log('im going in');
            if (userData.userSettings.nonselectable_spinner === "on") {
                locus = "Making Loading... less annoying.";
                selectableCSS += "#map_spinner {pointer-events: none;}";
                console.log('selectableCSS: ' + selectableCSS);
                selectablesStyle = document.createElement('style');
                selectablesStyle.setAttribute("type", "text/css");
                selectablesStyle.appendChild(document.createTextNode(selectableCSS));
                head.appendChild(selectablesStyle);
                console.log('sent append style');
            }
            else if(typeof selectablesStyle !== "undefined")
            {
                document.removeChild(selectablesStyle);
            }

    } catch (e) {
        console.error('There was a problem making loading... unselectable: \n' + locus + '\n' + e.message);
    }
}

var commStyle;
function adjustCommStyle() {
    var locus = "";

    var commCSS = ""; //fill it out then append
    try {
            if (userData.userSettings.comm_show_portal_addresses === "hide") {
                locus = "Creating portal address hide CSS.";
                commCSS += "span.pl_portal_address {display: none;}\n";
            }
            
            if (userData.userSettings.comm_agentur_readability_css === "on") {
                locus = "Adding root's Tweaks.";
                commCSS += "#comm, .pl_timestamp {font-size: 11px;}\n"
                commCSS += "#comm .comm_expanded {position: absolute; top: 0; bottom: 0;}\n";
                commCSS += "#plexts {background: #1D2525; font-family: Tahoma, Arial, Helvetica, sans-serif; font-size: 11px;}\n";
                commCSS += ".pl_content {line-height: 11px; padding: 0;}\n";
                commCSS += ".pl_portal_name {color: #ecc979; text-decoration: none;}\n";
                commCSS += ".pl_timestamp {color: #eee;}\n";
                commCSS += ".pl_timestamp_spacer {height: 15px;}\n";
                commCSS += "@media (min-height: 800px) {.comm_expanded #plext_container {height: 46rem;}}\n";
            }
            
            if(commCSS.length>0)
            {
                console.log('commCSS: ' + commCSS);
                commStyle = document.createElement('style');
                commStyle.setAttribute("type", "text/css");
                commStyle.appendChild(document.createTextNode(commCSS));
                locus = "Appending Comm Style.";
                head.appendChild(commStyle);
                console.log('sent append style');
            }
            else if(typeof commStyle !== "undefined")
            {
                document.removeChild(commStyle);
            }
    } catch (e) {
        console.error('There was a problem adjusting the comm style: \n' + locus + '\n' + e.message);
    }
}

var developerFilterStyle;
function adjustDeveloperFilterStyle() {
    var locus = "";

    var developerFilterCSS = ""; //fill it out then append
    try {
            if (userData.userSettings.dev_map_filter_mode === "wwii") {
                locus = "adding wwii mode to css";
                developerFilterCSS += "body {-webkit-filter: grayscale(100%) invert(100%);}";
            }
            else if(userData.userSettings.dev_map_filter_mode === "sepia") {
                locus = "adding sepia mode to css";
                developerFilterCSS += "body {-webkit-filter: sepia(100%) invert(100%);}";
            }
            
            if(developerFilterCSS.length>0)
            {
                console.log('developerFilterStyle: ' + developerFilterCSS);
                developerFilterStyle = document.createElement('style');
                developerFilterStyle.setAttribute("type", "text/css");
                developerFilterStyle.appendChild(document.createTextNode(developerFilterCSS));
                locus = "Appending developerFilterStyle.";
                head.appendChild(developerFilterStyle);
                console.log('sent append style');
            }
            else if(typeof developerFilterStyle !== "undefined")
            {
                document.removeChild(developerFilterStyle);
            }
    } catch (e) {
        console.error('There was a problem adjusting the developerFilterStyle style: \n' + locus + '\n' + e.message);
    }
}

/**
 * Geolocation check now in here... so malicios scripts cant call... though in the end we use it...
 * @param callback
 */
function requestUserLocation(callback){
    if(userData.userSettings.auto_load_page != "geo" && userData.userSettings.auto_load_fresh != "geo")
    {
        console.log("Current user settings have no need for geolocation.");
        transientData.userLocation = {"status": "auto-denied", "message": "Current extension settings do not require this information." };
        if(typeof callback !== "undefined")
        {
            callback(transientData.userLocation);
        }
    }
    else
    {
        console.log('Requesting the user Location');
        transientData.userLocation = {"status": "pending", "message": "Geolocation retrieval has not yet been attempted."};

        var opts = {enableHighAccuracy: false, timeout: 3000, maximumAge: 5000}; //timeout appears to not include waiting on user to decide on permission.
        var handleGeolocation = function(position) {
            transientData.userLocation = { "latitude": position.coords.latitude,
                "longitude": position.coords.longitude,
                "status": "known" };
            console.log('User Location: ' + JSON.stringify(transientData.userLocation));
            if(typeof callback !== "undefined")
            {
                callback(transientData.userLocation);
            }
        }
        var handleGeoError = function(positionError)
        {
            if (positionError.code == 0) {
                // unknown error
                transientData.userLocation = {"status": "unknown", "message": "An unknown error occurred retrieving your location." };
            }
            else if (positionError.code == 1) {
                // access is denied
                transientData.userLocation = {"status": "denied", "message": "Permission request to retrieve geolocation was denied." };
            }
            else if (positionError.code == 2) {
                // position unavailable
                transientData.userLocation = {"status": "unavailable", "message": "Geolocation is currently unavailable." };
            }
            else if (positionError.code == 3) {
                // timeout
                transientData.userLocation = {"status": "timeout", "message": "Geolocation could not be determined within the required time." };
            }
            console.error("requestUserLocation: " + transientData.userLocation.message);
            if(typeof callback !== "undefined")
            {
                callback(transientData.userLocation);
            }
        }
        navigator.geolocation.getCurrentPosition(handleGeolocation, handleGeoError, opts);
    }
}

//This sections is to handle when we want to display the pageAction icon
function handleVisibilityChange() {
    if (!document.webkitHidden) {
        //the page is now visible and is therefore not at the pre-rendering or in the background
        chrome.extension.sendMessage({message:"pageLoaded", userLoggedIn:loggedIn()}, function (response) {
            //console.log(response.farewell);
        });

        //chrome.extension.sendMessage({message:"GET_USER_SETTINGS"}, function (response) { });
        
        if(initSent)
        {
            chrome.extension.sendMessage({message:"GET_ALL_USER_DATA"}, function (response) {
                //console.log('Content Script got a notification to initialize.');
                userData = response.userData;
                // create and dispatch the event
                var event = new CustomEvent("IPP-UPDATE_USER_DATA", {"detail": userData });
                document.dispatchEvent(event);
            });
        }
        else
        {
            sendInitEvent();
        }
    }
}

//"GET_PLAYER_TEAM"
function getPlayerTeam()
{
    var team = document.querySelector(".player_nickname").parentElement.className;
    if(team === "ALIENS")
    {
        team = "enlightened";
    }
    else if(team === "RESISTANCE")
    {
        team = "resistance";
    }
    else
    {
        team = "unknown";
    }
    console.log("Determined player to be a %s agent.", team);
    return(team);
}

//We should probably make sure this is only added once, but since this is a content script it should be true.
document.addEventListener("webkitvisibilitychange", handleVisibilityChange, false);

//Call the function incase the document is already visible
handleVisibilityChange();