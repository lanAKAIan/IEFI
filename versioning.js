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

//TODO: Find a way to incorporate upgrade process into this... or at least the checks and know which version to go to.
/**
 * Flag for testing. When true, we will always use the alternate method of hooking in functionality.
 * @type {Boolean}
 */
var forceIncompatible = false;

//Use runtime over extension... for event pages...
var currentVersion = parseVersion(chrome.runtime.getManifest().version).versionString;

//So, interesting thought is this is the gzip compressed size/length of the file.
var dashboardHashes = [ {"sha1": "759f4a6f0401791573bbe2720240b9cb31e7bf72", "length": null  }
					   ,{"sha1": "4d1b4cfe7eb11ae7434444c4dadc0172cd9d1b1a", "length": 26546 }
					   ,{"sha1": "7c782a69b1f59dc1afeaa56bf2f5e67106c62163", "length": 23839 }
					   ,{"sha1": "8d180a277784ac2032968fed2bdb33c535f8d804", "length": 27341 }
					   ,{"sha1": "7a0f9cd8319f7b1f764fadcfd05b68bce6065f89", "length": 27840 }
					   ,{"sha1": "c288bed0941a4d73d2319581fbecf2682f95c392", "length": 30026 }
					   ,{"sha1": "a807091bd330268d14e1ae9ee7c2d7922ac024ff", "length": 30060 }
					   ,{"sha1": "d358366e1c76caaf825e4bd51c843024e5a01e25", "length": 30136 }
					   ,{"sha1": "6521ef7e90d7e8f62db39c50c0011a0f28109531", "length": 30188 } ];
					    

/*
 * upgrade process flag implies an upgrade process is needed to get to this version, not necessarily from it to the next.
 * */
var versionTree = [ { "version": "1.0.0.0",  "compatible": dashboardHashes[0], upgradeProcess: false }
				   ,{ "version": "1.0.1.0",  "compatible": dashboardHashes[0], upgradeProcess: false }
				   ,{ "version": "1.0.2.0",  "compatible": dashboardHashes[1], upgradeProcess: false }
				   ,{ "version": "1.1.0.30", "compatible": dashboardHashes[1], upgradeProcess: true  }
				   ,{ "version": "1.2.0.6" , "compatible": dashboardHashes[1], upgradeProcess: true  }
				   ,{ "version": "1.2.1.0" , "compatible": dashboardHashes[2], upgradeProcess: false }
				   ,{ "version": "1.2.2.0" , "compatible": dashboardHashes[2], upgradeProcess: false }
				   ,{ "version": "1.2.3.0" , "compatible": dashboardHashes[3], upgradeProcess: false }
				   ,{ "version": "1.3.0.9" , "compatible": dashboardHashes[3], upgradeProcess: true  }
				   ,{ "version": "1.3.1.0" , "compatible": dashboardHashes[3], upgradeProcess: false }
				   ,{ "version": "1.3.2.0" , "compatible": dashboardHashes[4], upgradeProcess: false }
				   ,{ "version": "1.3.2.1" , "compatible": dashboardHashes[4], upgradeProcess: false }
				   ,{ "version": "1.3.2.2" , "compatible": dashboardHashes[4], upgradeProcess: false }
				   ,{ "version": "1.3.3.0" , "compatible": dashboardHashes[4], upgradeProcess: false }
				   ,{ "version": "1.3.3.8" , "compatible": dashboardHashes[5], upgradeProcess: false }
				   ,{ "version": "1.3.4.0" , "compatible": dashboardHashes[6], upgradeProcess: false }
				   ,{ "version": "1.3.5.0" , "compatible": dashboardHashes[7], upgradeProcess: false }
				   ,{ "version": "1.3.6.0" , "compatible": dashboardHashes[8], upgradeProcess: false }
				   ,{ "version": "1.3.7.0" , "compatible": dashboardHashes[8], upgradeProcess: false }
				   ,{ "version": "1.4.0.1" , "compatible": dashboardHashes[8], upgradeProcess: true  } ];

if(versionTree[versionTree.length -1].version !== currentVersion)
{
    //We are going to assume this is just a new build, and add it to the tree.
    //currentVersion ensures we always update the version even if no upgrade needed
    versionTree[versionTree.length] = {"version": currentVersion, "compatible": dashboardHashes[dashboardHashes.length -1], upgradeProcess: false  }
}



/**
 * Checks a dashboard hash against the known version/hash table to determine if it thinks it is compatible.
 * @param {string} sha1 the SHA1 hash generated for a dashboard to compare with.
 * @param {function} [callback] an optional function to pass the compatibility to when determined.
 * @returns {Boolean} determined compatibility
 *
 */
function isDashboardCompatible(sha1, callback)
{
    var retVal = (versionTree[versionTree.length -1].compatible.sha1 === sha1);

    if(typeof callback !== "undefined")
    {
        callback(retVal);
    }
    return(retVal && !forceIncompatible);
}

/**
 *Pass in a version string... returns an object for the next version. 
 * TODO: What hapens if we messed up and send in an unknown version.
 */
function getNextVersion(fromVersion)
{
	var i, retVal;
	for(i = 0; i < versionTree.length; i++)
	{
		if(versionTree[i].version === fromVersion)
		{
			break;
		}
	}
	if(i < versionTree.length - 1)
	{
		//there is a next version
		retVal = versionTree[i+1].version;
	}
	else
	{
		//this is the latest version
		retVal = null;
	}
	
	return retVal;
}

/**
 * Takes as input a versionString in "major.minor.patch.build" format, and returns a version object.
 * This version object could help with sorting.
 * @param {string} versionString a version string consisting of up to four sections separated by periods
 * @return {Object} a version object with major, minor, patch and build members. Empty members will default to 0
 */
function parseVersion(versionString)
{
    var v = versionString.split('.');
    var out = { "major": v[0] ? parseInt(v[0], 10) : 0,
        "minor": v[1] ? parseInt(v[1], 10) : 0,
        "patch": v[2] ? parseInt(v[2], 10) : 0,
        "build": v[3] ? parseInt(v[3], 10) : 0 };
    out.versionString =( "" + out.major + "." + out.minor + "." + out.patch + "." + out.build);

    //console.log(out.versionString);
    return(out);
}

/**
 *The idea is that this variable would hold the dashboard incase we didnt identify it and wanted to look at it. 
 */
var lastDashboardRetrieved = null;

/**
 * Sends an AJAX request to the server and retrieves the un-adulterated gen_dashboard.js. This is then processed to get the length and sha1 value of its contents.
 * @param {function=} callback an optional callback function that will be passed the response
 */
function retrieveDashboard(callback, dashboardURI)
{
    var xhr = new XMLHttpRequest();
    var xhrTimeoutId = null;
    xhr.open("GET", dashboardURI, true);
    xhr.timeout = 3000;
    //xhr.responseType='blob';
    xhr.onload = function()
    {
        if (xhr.readyState == xhr.DONE) {
            if(xhrTimeoutId != null)
            {
                //cancel it.
                window.clearTimeout(xhrTimeoutId);
            }
            // innerText does not let the attacker inject HTML elements.
            console.log('Got something back');
            var ret = { "sha1": generateSHA1(xhr.response), 
                        "length": parseInt(xhr.getResponseHeader("Content-Length")), 
                        "status": xhr.status, 
                        "statusText": xhr.statusText,
                        "loggedIn": (xhr.getResponseHeader("Content-Type") === "application/javascript" ? true : false) }
                        
            lastDashboardRetrieved = xhr.response;
            if(typeof callback !== "undefined")
            {
                callback(ret)
            }
            else
            {
                console.log('No callback defined: ' + JSON.stringify(ret))
            }
        }
    }

    var onerror=function()
    {
        console.error('Some network error occurred in the XMLHttpRequest');
        var ret = { "status": "error", "statusText": "Network Error occurred in the XMLHttpRequest."}
        if(typeof callback !== "undefined")
        {
            callback(ret)
        }
        else
        {
            console.log('No callback defined: ' + JSON.stringify(ret))
        }
    };
    xhr.onerror = onerror;

    var onXHRTimeout=function()
    {
        console.warn('Timeout occurred in XMLHttpRequest');
        var ret = { "status": "timeout", "statusText": "Timeout occured retrieving the file."}
        if(typeof callback !== "undefined")
        {
            callback(ret)
        }
        else
        {
            console.log('No callback defined: ' + JSON.stringify(ret))
        }
    };

    if(typeof xhr.ontimeout === "undefined")
    {
        //This is expected in chrome at the moment =/
        var alternateTimeout = function()
        {
            if(xhr.readyState != 4)
            {
                try
                {
                    xhr.abort();
                    onXHRTimeout();
                }
                catch(e)
                {
                    console.error('Problem in alternate set timeout for XMLHttpRequest ' + e.message);
                }
            }
            xhrTimeoutId = null;
        }
        xhrTimeoutId = window.setTimeout(alternateTimeout, xhr.timeout + 500);
    }
    else
    {
        //supported!
        xhr.ontimeout = onXHRTimeout;
    }

    xhr.send();
}

/**
 * Checks the version of the dashboard against the known versions, and their known compatible extension versions. 
 * Passes information to the callback function
 * @param {function} callback function to be passed the compatibility object.
 * @param {object=} opt_CompatibilityReturn object that will be set to the compatibility as detected.
 */
function checkDashboardCompatibility(callback, opt_CompatibilityReturn, dashboardURI)
{
    //console.groupCollapsed("Dashboard Compatibility Check").
        console.info('Checking compatibility of dashboard with extension version ' + currentVersion);
    if(forceIncompatible)
    {
        console.warn('forceIncompatible setting is turned on, function will all ways return "unknown" compatibility.');
    }
    var haveDB = function(dbInfo)
    {
        var retVal = {compatibility: null};
        console.info("Retrieved Dashboard: " + JSON.stringify(dbInfo));

        if(dbInfo.status == 200)
        {
            //200 status code would be regular.
            if(dbInfo.loggedIn === true)
            {
                //Now we jsut need to see if we recognize the hash.
                if(isDashboardCompatible(dbInfo.sha1))
                {
                    retVal.compatibility = "compatible";
                    console.info("Dashboard determined to be compatible.");
                }
                else
                {
                    retVal.compatibility = null;
                    console.info("Successfully retrieved dashboard, but we dont recognize it so compatability is unknown.");
                }
            }
            else
            {
                retVal.compatibility = "ignore";
                console.info("It appears that the user was not authenticated, and we were redirected to login page.");
            }
        }
        else if(dbInfo.status === "timeout")
        {
            console.warn("We had a timeout and the version of the dashboard is unknown to us. Some functions may not work correctly.");
            retVal.compatibility = "unknown";
        }
        else
        {
            console.warn("Problem getting dashboard - Status: " + dbinfo.status);
            retVal.compatibility = "unknown";
        }

        if(retVal.compatibility === "unknown")
        {
            console.warn("This version of the dashboard is unknown to us. Some functions may not work correctly.");
        }

        if(typeof callback !== "undefined")
        {
            callback(retVal);
        }

        if(typeof opt_CompatibilityReturn !== "undefined")
        {
            opt_CompatibilityReturn = retVal;
        }
        //console.groupEnd("Dashboard Compatibility Check")
    }
    retrieveDashboard(haveDB, dashboardURI);
}

/**
 * Takes as input a file and returns the computed SHA1 hash for it. Makes use of open source CryptoJS
 * @param file a file to generate the SHA1 hash of
 * @return {String} the SHA1 hash generated for the file
 */
function generateSHA1(file) {
    var sha1 = CryptoJS.algo.SHA1.create();
    sha1.update(CryptoJS.enc.Latin1.parse(file)); //ensure binary
    return sha1.finalize().toString();
}