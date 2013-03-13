// ==UserScript==
// @id             iitc-plugin-intelligence-enhancer-for-ingress@lanAKAIan
// @name           iitc: iefi connection
// @version        0.01
// @namespace      https://github.com/breunigs/ingress-intel-total-conversion
// @updateURL      blah
// @downloadURL    blah
// @description    Notifys user of potentially missing features and provides a link into iitc.
// @include        https://www.ingress.com/intel*
// @match          https://www.ingress.com/intel*
// ==/UserScript==

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

function wrapper() {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

// PLUGIN START ////////////////////////////////////////////////////////

window.plugin.iefi = function() {};

var setup =  function() {
  //fire off an event letting people IEFI know that IITC is present.
  
  //let IEFI deal with the knowledge that IITC is present.
  var event = new CustomEvent("TOTAL-CONV-DETECT", {"detail": "detected" });
  document.dispatchEvent(event);
  console.log('TOTAL-CONV-DETECT');
  
  //TODO: set up alternate hooks here instead of in inject script.  
}

// PLUGIN END //////////////////////////////////////////////////////////

if(window.iitcLoaded && typeof setup === 'function') {
  setup();
} else {
  if(window.bootPlugins)
    window.bootPlugins.push(setup);
  else
    window.bootPlugins = [setup];
}
} // wrapper end
// inject code into site context
var script = document.createElement('script');
script.appendChild(document.createTextNode('('+ wrapper +')();'));
(document.body || document.head || document.documentElement).appendChild(script);
