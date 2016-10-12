/**
 * Defines the routing configuration for the webapp
 */
angular.
  module('madcap-analysis').
  config(['$locationProvider', '$routeProvider',
    /**
     * Routes to the login view by default.
     */      
    function config($locationProvider, $routeProvider) {
	  "use strict";
	  $locationProvider.hashPrefix('!');
      $routeProvider.
        when('/testit', {
        }).
        when('/sensor-data-presentation', {
          template: '<sensor-data-presentation></sensor-data-presentation>'
        }).
        when('/login',	{
    	  template: '<login></login>'
      	}).
        otherwise('/login');
    }
  ]);