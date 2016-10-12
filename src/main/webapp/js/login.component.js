/**
 * The component for the login module. This module will probably get deleted during development.
 * Right now, it's purpose is to act as second page for testing when necessary.
 */
angular.
module('login').
  component('login', {
    templateUrl: 'html/login_view.template.html',
    controller: function LoginController($scope, $window) {
    	"use strict";
    	
    	/**
    	 * redirects to the sensor data view
    	 */
    	$scope.login = function()	{
    		gapi.client.oauth2.userinfo.get().execute(function(resp) {
    		    if (!resp.code) {
    		    	$window.location = "https://analysis-dot-madcap-dev1.appspot.com/#!/sensor-data-presentation";
    		    }
    		});
    	};
    } 
});
 