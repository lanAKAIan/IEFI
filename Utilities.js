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