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
        when('/sensor-data-presentation', {
          template: '<sensor-data-presentation></sensor-data-presentation>'
        }).
        when('/madcap-control',	{
    	  template: '<madcap-control></madcap-control>'
      	}).
      	when('/user-map',	{
      	  template: '<user-map></user-map>'
        	}).
        otherwise('/user-map');
    }
  ]);

/**
 * Sets the necessary Pre-Configurations for ngDialog
 */
angular.
module('madcap-analysis')
.config(["ngDialogProvider", function (ngDialogProvider) {
	  "use strict";
	  ngDialogProvider.setDefaults({
        className: "ngdialog-theme-default",
        plain: false,
        showClose: true,
        closeByDocument: false,
        closeByEscape: false,
        appendTo: false,
        disableAnimation: true,
    });
}]); 