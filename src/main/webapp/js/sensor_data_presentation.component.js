/**
 * The component for the sensorDataPresentation module. It can load an flexible ammount of
 * ProbeEntries and display them on screen.
 */
angular.
module('sensorDataPresentation').
  component('sensorDataPresentation', {
    templateUrl: 'html/sensor_data_presentation_view.template.html',
    controller: function SensorDataPresentationController($scope) {
		"use strict";
		document.getElementById('siteloadspinner').style.display="block";		
		$scope.count = 0;		
	
		/**
		 * Requests from the Cloud storage to load 50 ProbeEntries.
		 * Also makes them visible in the template on response.
		 */
    	$scope.list = function() {
    		function continueFetching()	{
        		gapi.client.analysisEndpoint.getMyProbeEntries({'amount' : 50}).execute(function(resp) {
        	    	if(resp.entries !== null)	{
        	    		$scope.entries = resp.entries;
        	    	}
        		});
        	}
    		$scope.count++;
    		gapi.client.load('analysisEndpoint', 'v1', continueFetching, '//' + window.location.host + '/_ah/api');
    	    
    	};
    	
    	
    	/**
    	 * The filter function for the shown data. Hides the datarows which don't return true for
    	 * the search terms.
    	 */
    	$scope.searchData = function(probe){
    	    if (!$scope.filter_type || (probe.probeType.toLowerCase().indexOf($scope.filter_type) !== -1) || (probe.sensorData.toLowerCase().indexOf($scope.filter_content) !== -1) ){
    	        return true;
    	    }
    	    return false;
    	   };
    	}
  });
