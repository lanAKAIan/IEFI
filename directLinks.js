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

var backgroundPage = chrome.extension.getBackgroundPage();

document.addEventListener('DOMContentLoaded', initPopup);

function initPopup()
{

    document.getElementById("closeButton").addEventListener('click', loadMainMenu);
    document.getElementById("copy_intelDirectLink").addEventListener('click', copyIntelToClipboard);
    document.getElementById("copy_gmapsDirectLink").addEventListener('click', copyMapsToClipboard);
    generateGMapsURL();
    generateIntelURL();
    
    setTheme(backgroundPage);
}

function loadMainMenu()
{
    window.location.href="popup.html";
}

function copyIntelToClipboard()
{
    var linput = document.getElementById('input_intelDirectLink');
    linput.focus();
    linput.select();
    document.execCommand("Copy");
    document.getSelection().removeAllRanges();
    document.getElementById('notifyStatus').innerText = "Link copied to clipboard.";
    document.getElementById('notifyStatus').style.display = "block";
}

function copyMapsToClipboard()
{
    var linput = document.getElementById('input_gmapsDirectLink');
    linput.focus();
    linput.select();
    document.execCommand("Copy");
    document.getSelection().removeAllRanges();
    document.getElementById('notifyStatus').innerText = "Link copied to clipboard.";
    document.getElementById('notifyStatus').style.display = "block";
}

function setIntelLink(link)
{
    document.getElementById('input_intelDirectLink').value = link;
}

function setMapsLink(link)
{
    document.getElementById('input_gmapsDirectLink').value = link;
}


//These should probably be wrapers for versions that take a view... if no view provided we get the view using the functions we use for saving.
function generateGMapsURL()
{
    //console.log('in popup.generategooglemapslink');
    backgroundPage.getCurrentView(function(view){
        //console.log('in callback');
        backgroundPage.generateGoogleMapsLink(view, setMapsLink)});
}

function generateIntelURL()
{
    //console.log('in popup.generateintellink');
    backgroundPage.getCurrentView(function(view){
        //console.log('in callback');
        backgroundPage.generateIngressIntelLink(view, setIntelLink)});
}