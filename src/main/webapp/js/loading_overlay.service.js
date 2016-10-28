/**
 * This service provides a loading overlay when necessary. It uses the ngDialog module to do this.
 */
angular.module('madcap-analysis')
.factory('loading_overlay', ['ngDialog', function(ngDialog){
	  "use strict";
	  	  
	  return {
		/**
		 * Creates an dialog with a loading spinner and custom message.
		 * @return the dialog, so that it can be closed in the controller
		 */
        createLoadOverlay : function(message, passedCon) {
        	var dialog = ngDialog.open({
        		  template: 'html/loading_overlay.html',
        		  scope: passedCon,
        		  controller: function loadOverlayController()	{
        			  passedCon.load_overlay_message = message;
        		  }
        	});
        	return dialog;
        }
    };
}]
);