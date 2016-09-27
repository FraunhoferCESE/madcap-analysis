angular.
  module('mc-a').
  config(['$locationProvider', '$routeProvider',
    function config($locationProvider, $routeProvider) {
      $locationProvider.hashPrefix('!');
      $routeProvider.
        when('/testit', {
        }).
        when('/sensor-data-presentation', {
          template: '<sensor-data-presentation></sensor-data-presentation>'
        }).
        otherwise('/sensor-data-presentation');
    }
  ]);