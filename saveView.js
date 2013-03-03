/*
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

var backgroundPage = chrome.extension.getBackgroundPage();

document.addEventListener('DOMContentLoaded', initPopup);

if(window.location.search.replace( "?", "").length>0)
{
    backgroundPage.saveView(view);
}

function initPopup()
{
    document.getElementById("performSaveButton" ).addEventListener('click', saveCurrentView);
    document.getElementById("closeButton"       ).addEventListener('click', loadMainMenu);
    document.getElementById("saveViewForm"      ).addEventListener('submit', function(e){e.preventDefault(); saveCurrentView(); });
    document.getElementById('input_saveViewName').focus();
    document.getElementById('input_saveViewName').addEventListener('click', clearStatus);
}

function loadMainMenu()
{
    window.location.href="popup.html";
}

function saveCurrentView()
{
    //console.info('retrieving view information, then saving it to local store.');

    // we need to prompt them for a view name.
    var viewName = document.getElementById('input_saveViewName').value;
    var status = document.getElementById('saveStatus');

    if(typeof viewName == "undefined" || viewName.length == 0)
    {
        status.innerText = "No view Name entered";
        status.style.display = "block";
    }
    else
    {
        backgroundPage.getCurrentView(function(viewJSON)
        {
            //if(viewJSON != undefined){ console.log('popup.js.getCurrentView got view from backgroundPage: ' + viewJSON); }
            //Call this function when we get the currentView.
            var view = JSON.parse(viewJSON);
            view.viewName = viewName;
            backgroundPage.saveView(view);
            loadMainMenu();
        });
    }
}

function clearStatus()
{
    var status = document.getElementById('saveStatus');
    status.innerText = '';
    status.style.display = "none";
}

var POPUP = (function(){
    var p = {};
    return p;
}());