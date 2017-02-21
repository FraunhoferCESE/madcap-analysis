/**
 * Defines the routing configuration for the webapp
 */
angular.
module('madcap-analysis').
config(['$locationProvider', '$routeProvider',
    /**
     * Routes to the user map view by default.
     */      
    function config($locationProvider, $routeProvider) {
	  "use strict";
	  $locationProvider.hashPrefix('!');
      $routeProvider.
      when('/master', {
          template: '<master></master>'
        }).  
      when('/madcap-control',	{
    	  template: '<madcap-control></madcap-control>'
      }).
      when('/timeline',	{
      	  template: '<timeline></timeline>'
      }).
      when('/user-map',	{
      	  template: '<user-map></user-map>'
      }).
          otherwise('/master');
      }
  ]);
