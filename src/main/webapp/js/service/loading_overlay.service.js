/**
 * This service provides a loading overlay when necessary. The overlay is created as transparent window, which gets laid over the the actual window. 
 */
angular.module('madcap-analysis')
.factory('loading_overlay', function(){
	  "use strict";
	  	  
	  return {
		/**
		 * Creates an dialog with a loading spinner and custom message.
		 * @return the dialog, so that it can be closed in the controller
		 */
        createLoadOverlay : function(message, passedCon, anchor) {
        	var anchorElement = document.getElementById(anchor);
        	var width = anchorElement.offsetWidth;	
        	var height = anchorElement.offsetHeight;
        	// Creates the overlay with the windows measurements.
        	var dialog = $('<div class="well well-sg opacityscarf" style="width:'
        		+width+'px; height:'
        		+height+'px;"><div id="loadoverlayspinner'+anchorElement.id+'" class="innerloader" style="display: block; margin-left: auto; margin-right: auto;"></div><h2 id="loadoverlaymessage'+anchorElement.id+'" style="text-align: center;"></h2>');
        	//LAys the overlay over the actual window.
        	dialog.appendTo(anchorElement);
        	var messageGui = document.getElementById('loadoverlaymessage'+anchorElement.id);
        	var spinner = document.getElementById('loadoverlayspinner'+anchorElement.id);
        	spinner.style['margin-top'] = Math.floor((height-spinner.offsetHeight-70)/2) + "px";
        	messageGui.innerHTML = message;
        	return dialog;
        }
    };
}
);