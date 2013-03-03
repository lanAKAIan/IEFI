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
// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function setScreenshotUrl(url) {
  document.getElementById('screenshot').src = url;
    dataUrl = url;
}

var now = new Date(); //Purposefully out here to grab when we build the page.

var dataUrl;

var backgroundPage = chrome.extension.getBackgroundPage();
var fileExtension = backgroundPage.IPP.StorageManager.getUserSettings().screenshot_format;

function saveShot(url)
{
    console.log('about to attempt save');

    var filename = document.getElementById('saveFileName').value;
    if(filename.length < 1)
    {
        filename = generateFilename();
    }

    //strip any fileextensions off..
    filename = filename.replace(/(\.((jpeg)|(png)|(jpg)))$/i, '');

    saveAs( convertDataURIToBlob(url, "image/" + fileExtension), filename + "." + fileExtension );
    console.log('saved ' + filename + "." + fileExtension);
}

function generateFilename()
{
    return (now.toGMTString().replace(/ /g, '_').replace(',', ''));
}

document.addEventListener('DOMContentLoaded', function () {
    initPopup();
});

function initPopup()
{
    document.getElementById("SaveToDisk").addEventListener(  'click', function(){saveShot(dataUrl);});
    document.getElementById('saveFileName').placeholder = generateFilename() + '.' + fileExtension;
}

