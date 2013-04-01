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

/* versionCheck.js
 * responsible for checking the version of ingress the page is running against. If the version does not match what we
 * expect, we will let the user know that there may be issues.
 *
 * */

/**
 * Flag for testing. When true, we will always use the alternate method of hooking in functionality.
 * @type {Boolean}
 */
var forceIncompatibile = false;


/**
 * Takes as input a versionString in "major.minor.patch.build" format, and returns a version object.
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

var eVersionInfo = parseVersion(chrome.app.getDetails().version);

//NOTE: assumes that the current version is compatible with the latest in the list.
//The key is the SHA1 of the dashboard version.

/**
 * NOTE: assumes that the current version is compatible with the latest in the list. The key is the SHA1 of the dashboard version.
 * @type {Object}
 */
var dashboardHashes = { "759f4a6f0401791573bbe2720240b9cb31e7bf72": { "knownCompatableVersions": [ "1.0.1.0" ] },
                        "4d1b4cfe7eb11ae7434444c4dadc0172cd9d1b1a": { "knownCompatableVersions": [ "1.0.2.0",
                                                                                                   "1.1.0.3",
                                                                                                   "1.2.0.6"],
                                                                      "length": 26546 },
                        "7c782a69b1f59dc1afeaa56bf2f5e67106c62163": { "knownCompatableVersions": [ "1.2.1.0", "1.2.2.0" ] ,
                                                                      "length": 23839 },
                        "8d180a277784ac2032968fed2bdb33c535f8d804": { "knownCompatableVersions": [ "1.2.3.0", "1.3.1.0" ], "length": 27341 },
                        "7a0f9cd8319f7b1f764fadcfd05b68bce6065f89": { "knownCompatableVersions": [ "1.3.2.0", "1.3.2.2" ], "length": 27840 },
                        "c288bed0941a4d73d2319581fbecf2682f95c392": { "knownCompatableVersions": [ "1.3.3.8" ], "length": 30026 },
                        "a807091bd330268d14e1ae9ee7c2d7922ac024ff": { "knownCompatableVersions": [ "1.3.4.0" ], "length": 30060 }, 
                        "d358366e1c76caaf825e4bd51c843024e5a01e25": { "knownCompatableVersions": [ "1.3.5.0" ], "length": 30136 }, 
                        "6521ef7e90d7e8f62db39c50c0011a0f28109531": { "knownCompatableVersions": [ "1.3.6.0", "1.3.7.0", eVersionInfo.versionString ], "length": 30188 }
};

//OK so we really need to centralize all this... and put it in one place.
//TODO: we should just go by version and not by hash. as our primary key that is.

/**
 * Sends an AJAX request to the server and retrieves the un-adulterated gen_dashboard.js. This is then processed to get the length and sha1 value of its contents.
 * @param {function=} callback an optional callback function that will be passed the response
 */
function getDashboardVersion(callback, dashboardURI)
{
    var xhr = new XMLHttpRequest();
    //TODO: determine this off the actual source, not what we assume.
    xhr.open("GET", dashboardURI, true);
    xhr.timeout = 3000;
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            // innerText does not let the attacker inject HTML elements.
            console.log('Got something back');
            var ret = { "sha1": generateSHA1(xhr.response), "length": xhr.getResponseHeader("Content-Length")}
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
    xhr.ontimeout = function()
    {
        var ret = { "message": "timeout"}
        if(typeof callback !== "undefined")
        {
            callback(ret)
        }
        else
        {
            console.log('No callback defined: ' + JSON.stringify(ret))
        }
    }
    xhr.send();
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

/**
 * Checks the version of the dashboard against the known versions, and their know compatible extension versions. Passes information to the callback function
 * @param {function} callback function to be passed the compatibility object.
 * @param {object=} opt_CompatibilityReturn object that will be set to the compatibility as detected.
 */
function checkCompatibility(callback, opt_CompatibilityReturn, dashboardURI)
{
    console.info('Checking dashboard compatibility with extension version ' + eVersionInfo.versionString);
    if(forceIncompatibile)
    {
        console.warn("Force Incompatible setting is on, function will all ways return \"unknown\" compatibility.");
    }
    var haveDB = function(dbInfo)
    {
        var retVal = {compatibility: null};
        console.info("current Dashboard: " + JSON.stringify(dbInfo));

        if(typeof dbInfo.message !== "undefined")
        {
            if(dbInfo.message == "timeout")
            {
                console.warn("We had a timeout and the version of the dashboard is unknown to us. Some functions may not work correctly.");
                retVal.compatibility = "unknown";
            }
        }
        else if(typeof dashboardHashes[dbInfo.sha1] !== "undefined" && !forceIncompatibile)
        {
            //Now check to see if the hash is in the table of known hashes.
            if(dashboardHashes[dbInfo.sha1].knownCompatableVersions.indexOf( eVersionInfo.versionString ) !== -1)
            {
                console.info("Good news everybody, we have a known compatible version."); //professor farnsworth tm
            }
            else
            {
                //Don't really think we should ever end up here... since ti would mean we know the hash but dont know the version of the extension
                //but we already added code to just add the current version to the table.
                console.warn("we matched the dashboard hash, but do not know about its compatibility with this version of the extension");
            }
            retVal.compatibility = "compatible";
        }
        else
        {
            console.warn("This version of the dashboard is unknown to us. Some functions may not work correctly.");
            retVal.compatibility = "unknown";
        }

        if(typeof callback !== "undefined")
        {
            callback(retVal);
        }

        console.log(typeof opt_CompatibilityReturn );
        if(typeof opt_CompatibilityReturn !== "undefined")
        {
            opt_CompatibilityReturn = retVal;
        }
    }
    getDashboardVersion(haveDB, dashboardURI);
}