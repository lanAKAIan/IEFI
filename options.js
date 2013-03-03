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
    SM = chrome.extension.getBackgroundPage().IPP.StorageManager;
document.addEventListener('DOMContentLoaded', function () {
  initOptions();
//document.getElementById('getJSON').addEventListener('click', function(){alert(getJSON()); return false;});
document.getElementById('saveButton').addEventListener('click', function(){saveChanges(); return false;});
initOptionRequests();
});


/*Chrome really wants this to only be triggered by a user intent such as a click.*/
function requestPermission(permissionsArray, grantedCallback, deniedCallback, event)
{
    console.info('Requesting permissions for: ' + JSON.stringify(permissionsArray))
        chrome.permissions.request({
            permissions: permissionsArray
        }, function(granted) {
            // The callback argument will be true if the user granted the permissions.
            console.log(JSON.stringify(granted));
            if (granted) {
                console.info('Permission granted for ' + JSON.stringify(permissionsArray));
                grantedCallback(event);
            } else {
                console.info('Permission denied for ' + JSON.stringify(permissionsArray));
                deniedCallback(event);
            }
        });
}

function initOptionRequests()
{
    //It turns out that the geolocation permission automatically prompts user.... if you put it in normal permissions its to not prompt.
    //So when i tried to do ti as optional it just says thats crap!. Hrm well thats interesting.
    /*
    console.log('initializing geolocation permission request');


    document.querySelector('#auto_load_page_geolocation').addEventListener('click', function(event) {
        requestPermission(['geolocation'], function(){alert('we got permission')}, function(){alert('bummer they want us to do something but dont want to let us do it')}, event)
    });
    */
}

function getJSON()
{
	return( JSON.stringify(GetCurrentSettings()));
	//return(outputJSON);
}

function saveChanges()
{
	SM.setUserSettings(GetCurrentSettings(), function(){
        document.getElementById("SaveStatusBox").innerText = "Settings successfully saved.";
    });
}

function GetCurrentSettings()
{
	//gets the json for all the settings on the page. i hope.
	var allOptions = document.getElementsByTagName('input');
	var i = 0;
	var out = {};
	for(i=0; i < allOptions.length; i++)
	{
		//console.log(allOptions[i].id + ' ' + allOptions[i].checked);
		if(allOptions[i].type == 'radio')
		{
            if(allOptions[i].checked == true)
            {
                out[allOptions[i].name] = allOptions[i].value;
            }
			//outputJSON += ', "' + allOptions[i].name + '": "' + allOptions[i].value + '"';
		}
	}

    //now the selects
    allOptions = document.getElementsByTagName('select');
    for(i=0; i < allOptions.length; i++)
    {
        out[allOptions[i].name] = allOptions[i].value;
    }

	return(out);
}

function initOptions()
{
	var settings = SM.getUserSettings();

    fillViewList();
	
	//Right now we are just going to init from default options
	var allOptions = document.getElementsByTagName('input');
	//console.log(allOptions.length);
	var i = 0;
	for(i=0; i < allOptions.length; i++)
	{
		//console.log('on option ' + i );
		if(allOptions[i].type == 'radio')
		{
			//see if we have a value for it.
			//console.log(settings[allOptions[i].name]);
			
			//look for the option in the settings
			for(var key in settings)
			{
				if(allOptions[i].name == key)
				{
					//console.log('Match');
					setRadio(allOptions[i].name, settings[key]);
				}
				else
				{
					//console.log('Nope!');
				}
			}
		}
        else if(allOptions[i].type == 'select')
        {
            allOptions[i].value = settings[key];
        }
	}

    //Handle any selects
    allOptions = document.getElementsByTagName('select');
    //console.log(allOptions.length);
    for(i=0; i < allOptions.length; i++)
    {
        for(var key in settings)
        {
            if(allOptions[i].name == key)
            {
                //console.log('Match');
                allOptions[i].value = settings[key];
            }
            else
            {
                //console.log('Nope!');
            }
        }
    }
}

function fillViewList()
{
    //generate the select list that will go inside.
    var userViews = SM.getUserViews();
    var viewList = document.getElementById("auto_load_view");

    if(viewList != null)
    {

        while (viewList.firstChild) {
            viewList.removeChild(viewList.firstChild);
        }

        //start with a blank option...
        var viewOption = document.createElement("option");
            viewOption.setAttribute("value", "");

        var viewName = document.createTextNode("");

            viewOption.appendChild(viewName);
              viewList.appendChild(viewOption);

        for(v in userViews)
        {
            viewOption = document.createElement("option");
            viewOption.setAttribute("value", userViews[v].guid);

            viewName = document.createTextNode(userViews[v].viewName);
            viewOption.appendChild(viewName);

            viewList.appendChild(viewOption);
        }
    }

    //now pick the value if in the userstore
    //viewList.value = SM.getUserSettings().auto_load_view;
}

function setRadio(option_group, set_to_value)
{
	//console.log('checking ' + option_group + ' to ' + set_to_value);
	var options = document.getElementsByName(option_group);
	var i = 0;
	for(i = 0; i < options.length; i++)
	{
		if(options[i].value == set_to_value)
		{
			options[i].checked = true;
			return;
		}
	}
}

//this is the current settings mirrored with storage.



console.log('parsed');