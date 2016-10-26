/**
 * This directive handles the visibility of containers. Every container can have the value 'allowed'
 * as tag, which will contain the different permissions necessary to see the container.
 * The permissions are separated by commas in the value. No comma is needed at the end.
 */
angular.module('madcap-analysis')
.factory('load_overlay', ['ngDialog', function(ngDialog){
	  "use strict";
	  
	  var ids = [];
	  
	  return {
		/**
		 * This method gets called whenever a html ressource has the custom tag 'allowed'
		 * and determines if the container gets shown or not
		 */
        createloadOverlay : function(message) {
        	ngDialog.open({
        		  template: 'templateId',
        		  scope: $scope,
        		  controller: 'FileController',
        		  $event: $event,
        		  className: 'ngdialog-theme-plain'
        		});
        }
    };
}]
);