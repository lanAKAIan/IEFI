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
var SM = chrome.extension.getBackgroundPage().IPP.StorageManager;
var importButton, exportButton, dataText;

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('export').addEventListener('click', getSettings);
    document.getElementById('import').addEventListener('click', setSettings);
    document.getElementById('file').addEventListener('change', handleFileSelect, false);
    document.getElementById('SaveToDisk').addEventListener('click', exportSettings);
    document.getElementById("saveFileName").placeholder = "iefi_settings_TIMESTAMP.json";
    //getSettings();
});

var doNotCheckInput = true; /*basically... do not try and make sure things line up.*/

function getSettings()
{
    dataText = document.getElementById("data");
    var userData = SM.getAllData();
    //http://blogs.developerforce.com/pat-patterson/2011/08/quick-tip-pretty-print-json-in-the-browser.html
    dataText.value = JSON.stringify(userData, null, "  ");
}

function setSettings()
{
    dataText = document.getElementById("data").value;
    var callback = function()
    {
        alert('Settings Imported');
    }
    var userData = SM.setAllData(JSON.parse(dataText), false, callback);
//should add a callback.
}

var uploadedFile;

//Filesaver stuff
function handleFileSelect(evt) {
    var files = evt.target.files; // FileList object

    //even though we are only selecting one file, we allways get a filelist.
    // files is a FileList of File objects. List some properties.
    var output = [];
    var f = files;

    for (var i = 0, f; f = files[i]; i++) {
        output.push('<li><strong>', encodeURI(f.name), '</strong> (', f.type || 'n/a', ') - ',
            f.size, ' bytes, last modified: ',
            f.lastModifiedDate ? f.lastModifiedDate.toLocaleDateString() : 'n/a',
            '</li>');
        loadFile(f);
    }
    document.getElementById('list').innerHTML = '<ul>' + output.join('') + '</ul>';
}

function loadFile(File)
{
    var reader = new FileReader();

    reader.onload = (function(theFile) {
        return function(e) {
            // Render thumbnail.
            var impText =  e.target.result;
            var imported = JSON.parse(impText);
            var dataText = document.getElementById("data");
            dataText.value = JSON.stringify(imported, null, "  ");
        };
    })(File);

    // Read in the image file as a data URL.
    reader.readAsText(File, 'UTF-16');
}


var now = new Date(); //Purposefully out here to grab when we build the page.
var fileExtension = "json";

function exportSettings()
{
    console.log('about to attempt save');

    var filename = document.getElementById('saveFileName').value;
    if(filename.length < 1)
    {
        filename = generateFilename();
    }

    //strip any fileextensions off..
    filename = filename.replace(/(\.(json))$/i, '');

    var userData = JSON.stringify(SM.getAllData(), null, "  ");
    var ab = str2ab(userData);
    //http://blogs.developerforce.com/pat-patterson/2011/08/quick-tip-pretty-print-json-in-the-browser.html

    var newBlob = new Blob([ab], {type: "application/json"});

    saveAs( newBlob, filename + "." + fileExtension );
    console.log('saved ' + filename + "." + fileExtension);
}

function generateFilename()
{
    return ('iefi_settings_' + now.toGMTString().replace(/ /g, '_').replace(',', ''));
}
