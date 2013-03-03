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

/** contentScript.js
  * GENERAL NOTES: So I am wondering if we should be removing the event managers from both pages in callbacks. Not sure whats hapening or rather if we are
  *				   stacking a whole bunch of them onto the page or if they are replacing eachother
  *
  *
  *
  */  

/**
  * checks to see if we are logged into the intel site. That way we dont get undefined errors.
  * NOTE: we may want to look for a specific element on the page like the login info box, but some userscript might remove it for who knows what.
  */
function loggedIn()
{
	var retVal = false;
	
	if(document.getElementById("header_login_info") != null)
	{
		retVal = true;
	}
	
	var head = document.head || document.getElementsByTagName( "head" )[0] || document.documentElement;
	var title = head.getElementsByTagName("title")[0].textContent;
	if(title == "Ingress Intel Map")
	{
		return true;
	}
	else if(title == "Ingress")
	{
		return false;
	}
	else
	{
		console.error('It seems that the title of the page is not the login or the map as expected... this is what it is: ' + title);
		return false;
	}
}

/**
  * This section deals with actually injecting the injectScript.js into the ingress page. We are not checking the url on the assumption the manifest will
  * at release only fire for ingress pages. Anyway the reason we have an injectScript.js file at all is because contentScript can not access the pages window variables
  * jsut dom.
  */
var script = document.createElement('script');
script.setAttribute("type", "text/javascript");
script.setAttribute("async", true);
script.setAttribute("src", chrome.extension.getURL("injectScript.js"));
var head = document.head || document.getElementsByTagName( "head" )[0] || document.documentElement;
head.insertBefore(script, head.firstChild);

/*Test moving the redeem box*/
//This is here to attempt to move the annoyingbox up to the geocode area

//So interesting thing... if we move to top we will ahve to also move the responses to wat we redeem because they display above it.
/*
var css = document.createElement('style');
css.setAttribute("type", "text/css");
css.appendChild(document.createTextNode("#redeem_reward {top: -99px; bottom: auto; font-size: 15px; position: absolute; right: auto; left: 340px; text-align: right; z-index: 1;}"));
head.appendChild(css);
*/
/*end test*/
var CSSCode = ".IPP_Screenshot {display: none;}";
var css = document.createElement('style');
css.setAttribute("type", "text/css");
if(css.styleSheet){
css.styleSheet.cssText = CSSCode;
}
else{
css.appendChild(document.createTextNode(CSSCode));
}
head.appendChild(css);



/**
  * This section sets up the message listeners in the content script for messages from the background.js page.
  * it ends up acting as a middle man
  */
chrome.extension.onMessage.addListener(
  function(request, sender, sendResponse)
  {
    //console.log(sender.tab ? "from a content script:" + sender.tab.url : "from the extension");
	//console.log('contentScript revieved request: ' + request.request);
    if (request.request== "LOAD_VIEW")
	{
		// create and dispatch the event

		var event = new CustomEvent("loadView", {"detail": request.view });
		document.dispatchEvent(event);
		
		sendResponse( {farewell: "VIEW lOADED"} );
		//console.log('response sent');
	 }
	else if (request.request== "GET_VIEW")
	{
		//console.log('ContentScript requested to load a view.');
		//set up how to handle the response
		var getViewResponseListener = function(e)
		{
			document.removeEventListener("RESP-GET_VIEW", getViewResponseListener, false); //make sure we dont keep capturing this event, otherwise we will keep duplicating.
			
			//console.log('RESP-GET_VIEW Recieved sending it back to background page'); 
			//console.log('RESP-GET_VIEW got from page: ' + e.detail.viewInfo);
			sendResponse( { viewInfo: e.detail.viewInfo }, function(){/*this is so we dont get error because background sent back a thanks*/} ); 
			//console.log('GET_VIEW response sent');
		}
		document.addEventListener("RESP-GET_VIEW", getViewResponseListener, false);
		
		// create and dispatch the event
		var event = new CustomEvent("REQ-GET_VIEW", {"detail": "please" });
		document.dispatchEvent(event);
		//console.log('conentScript sent request to the injectedpage for the view info.');
	 }
	 else if(request.request=="HIDE_PII")
	 {
		//console.log('ContentScript requested to hide pii');
		hidePII(true);
		sendResponse( {farewell: "PII_HIDDEN"});
		//setTimeout(function(){sendResponse( {farewell: "PII_HIDDEN"}, function(){})}, 1000);
	 }
	 else if(request.request=="SHOW_PII")
	 {
		//console.log('ContentScript requested to show pii.');
		hidePII(false);
		sendResponse( {farewell: "PII_SHOWN"} );
	 }
	 else if(request.request=="GET_LOGIN_STATUS")
	 {
		//console.log('ContentScript checking if we are logged in for backbroundpage.');
		sendResponse( {loginStatus: loggedIn()} );
	 }
  });
  
  function hidePII(hide)
  {
	if(hide == true)
	{
		document.getElementById('comm').classList.add('IPP_Screenshot');
		document.getElementById('player_ap_icon').classList.add('IPP_Screenshot');
		document.getElementById('header_email').classList.add('IPP_Screenshot');
		document.getElementById('butterbar').classList.add('IPP_Screenshot');
		document.getElementById('xm_slot').classList.add('IPP_Screenshot');
		document.getElementById('xm').classList.add('IPP_Screenshot');
		document.getElementById('ap').classList.add('IPP_Screenshot');
		document.getElementById('redeem_reward').classList.add('IPP_Screenshot');
	}
	else
	{
		document.getElementById('comm').classList.remove('IPP_Screenshot');
		document.getElementById('player_ap_icon').classList.remove('IPP_Screenshot');
		document.getElementById('header_email').classList.remove('IPP_Screenshot');
		document.getElementById('butterbar').classList.remove('IPP_Screenshot');
		document.getElementById('xm_slot').classList.remove('IPP_Screenshot');
		document.getElementById('xm').classList.remove('IPP_Screenshot');
		document.getElementById('ap').classList.remove('IPP_Screenshot');
		document.getElementById('redeem_reward').classList.remove('IPP_Screenshot');
	}
  }
  
 
//This sections is to handle when we want to display the pageAction icon
function handleVisibilityChange()
 {
	  if (!document.webkitHidden)
	  {
			//the page is now visible and is therefore not at the prerendering or in the background
			chrome.extension.sendMessage({message: "pageLoaded", userLoggedIn: loggedIn()}, function(response) {
			  //console.log(response.farewell);
			});
	  }
}

//We should probably make sure this is only added once, but since this is a content script it should be true.
document.addEventListener("webkitvisibilitychange", handleVisibilityChange, false); 

//Call the function incase the document is already visible
handleVisibilityChange();
  
 //console.info('contentScript.js loaded or something');