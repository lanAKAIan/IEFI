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

var userSettings = {};

var userData = { userSettings: null
                , storageVersion: null
                , userViews: null };

var compatibility = null;

/**
 * checks to see if we are logged into the intel site. That way we don't get undefined errors.
 * NOTE: we may want to look for a specific element on the page like the login info box, but some userscript might remove it for who knows what.
 */
function loggedIn() {
    var retVal = false;

    if (document.getElementById("header_login_info") != null) {
        retVal = true;
    }

    var head = document.head || document.getElementsByTagName("head")[0] || document.documentElement;
    var title = head.getElementsByTagName("title")[0].textContent;
    if (title == "Ingress Intel Map") {
        return true;
    }
    else if (title == "Ingress") {
        return false;
    }
    else {
        console.error('It seems that the title of the page is not the login or the map as expected... this is what it is: ' + title);
        return false;
    }
}

/**
 * This section deals with actually injecting the injectScript.js into the ingress page. We are not checking the url on the assumption the manifest will
 * at release only fire for ingress pages. Anyway the reason we have an injectScript.js file at all is because contentScript can not access the pages window variables
 * just dom.
 */
var head = document.head || document.getElementsByTagName("head")[0] || document.documentElement;
var script = document.createElement('script');
    script.setAttribute("type", "text/javascript");
    script.setAttribute("async", true);
    script.setAttribute("src", chrome.extension.getURL("injectScript.js"));
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
            console.log('Content Script received initialization data');
            userData = request.userData;
            compatibility = request.compatibility;
            var initData = {"userData": userData, "compatibility": compatibility};
            // create and dispatch the event
            var event = new CustomEvent("IPP-INITIALIZED", {"detail": initData });
            document.dispatchEvent(event);
            sendResponse({farewell:"USERDATA Initialize SENT TO CLIENT"});
        }
    });

document.addEventListener("INITIALIZE", handleInjectInitRequest, false);
/**
 * This function is the listener for the injected script being initialized.
 */
function handleInjectInitRequest()
{
    //We should request the compatibility... and the userdata etc.
    chrome.extension.sendMessage({message:"NEW-INITIALIZE-EVENT"}, function (response) {
        console.log('Content Script got a notification to initialize.');
    });
}

document.addEventListener("TOTAL-CONV-DETECT", notifyTotalConversion, false);
/**
 * This function is the listener for the injected script being initialized.
 */
function notifyTotalConversion()
{
    //We should request the compatibility... and the userdata etc.
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
                screenshotCSS += "#geocode_search,";
            }
            if (userData.userSettings.screenshot_visibility_community == "hide") {
                locus = "hiding community link";
                screenshotCSS += "#header_links,#header_links_title,";
            }
            if (userData.userSettings.screenshot_visibility_mu == "hide") {
                locus = "hiding mind units";
                screenshotCSS += "#game_stats,";
            }
            if (userData.userSettings.screenshot_visibility_nickname == "hide") {
                locus = "hiding player nickname";
                screenshotCSS += ".player_nickname,";
            }
            if (userData.userSettings.screenshot_visibility_controls == "hide") {
                locus = "hiding map controls";
                screenshotCSS += '.gmnoprint:not([style*="z-index: 1000001;"]),'; //So this currently hides the google copyright so it should not be used we need to keep [z-index=1000001] could maybe jsut add
            }
            if (userData.userSettings.screenshot_visibility_clutter == "hide") {
                locus = "hiding other clutter";
                //screenshotCSS += "#nav,#header_links,#header_links_box,#header_invites,#header_invites_box,";
                screenshotCSS += ".nav_link,#header_links,#header_links_box,#header_invites,#header_invites_box,";
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
             //var link = 'http://www.ingress.com/intel?\' + document.querySelector(\'[title="Report errors in the road map or imagery to Google"]\').href.split(\'?\')[1].split(\'&t\')[0].replace(/\./g,\'\').replace(\'ll\',\'latE6\').replace(\',\', \'&lngE6=\')'
             var link = 'document.domain';
                 screenshotCSS+="\n #nav:after { display: inline-block; position: relative; right: 0; height: 40px; padding-left: 4px; top: 4px; font-size: 15px; text-transform: none; content: '"+link+"'; }";
             }
            */

            console.log('screenshotCSS: ' + screenshotCSS);
            screenshotStyle = document.createElement('style');
            screenshotStyle.setAttribute("type", "text/css");
            screenshotStyle.appendChild(document.createTextNode(screenshotCSS));
            screenshotStyle.addEventListener('load', function () {
                callback();
            }, false);
            /*test success*/
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

//This sections is to handle when we want to display the pageAction icon
function handleVisibilityChange() {
    if (!document.webkitHidden) {
        //the page is now visible and is therefore not at the pre-rendering or in the background
        chrome.extension.sendMessage({message:"pageLoaded", userLoggedIn:loggedIn()}, function (response) {
            //console.log(response.farewell);
        });

        //chrome.extension.sendMessage({message:"GET_USER_SETTINGS"}, function (response) { });

        chrome.extension.sendMessage({message:"GET_ALL_USER_DATA"}, function (response) {
            //console.log('Content Script got a notification to initialize.');
            userData = response.userData;
            // create and dispatch the event
            var event = new CustomEvent("IPP-UPDATE_USER_DATA", {"detail": userData });
            document.dispatchEvent(event);
        });
    }
}

/*Attempts to determine if ingress total conversion is all up in the page.*/
function totallyConverted()
{
    return (document.querySelector('[src*=total-conversion]') ? true : false);
}

//We should probably make sure this is only added once, but since this is a content script it should be true.
document.addEventListener("webkitvisibilitychange", handleVisibilityChange, false);

//Call the function incase the document is already visible
handleVisibilityChange();