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
//Utilities.js

//http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
//Do we need to use window.crypto for better randoms?
function getGUID()
{
return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
});
}

function convertDataURIToBlob(dataURI, mimetype) {
    var BASE64_MARKER = ';base64,';
    var base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
    var base64 = dataURI.substring(base64Index);
    var raw = window.atob(base64);
    var rawLength = raw.length;
    var uInt8Array = new Uint8Array(rawLength);

    for (var i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
    }

    console.log('about to make the actual Blob');
    var newBlob = new Blob([uInt8Array], {type: mimetype});
    return newBlob;
}

//http://updates.html5rocks.com/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
function ab2str(buf) {
    return String.fromCharCode.apply(null, new Uint16Array(buf));
}
function str2ab(str) {
    var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
    var bufView = new Uint16Array(buf);
    for (var i=0, strLen=str.length; i<strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}

/**
 * Checks to see if any keys have been initialized in an object.
 * @param {Object} obj the object you want to check is not empty.
 */
function isEmpty(obj)
{
	var retval = true;
	for(var k in obj)
	{
		retval = false;
		break;
	}
	return retval;
}


function setTheme(backgroundPage)
{
    document.body.classList.remove("enlightened");
    document.body.classList.remove("resistance");
    document.body.classList.remove("classic");
    
    console.log("about to request theme.");
    backgroundPage.getTheme(function(themeChoice){console.log("got themeChoice " + themeChoice); document.body.classList.add(themeChoice);});
    
}
