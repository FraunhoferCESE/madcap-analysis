angular.
module('userV2').
component('userV2', {
    templateUrl: 'html/user_information_v2_view.template.html',
    controller: function UserInfoController($scope, $timeout, helper) {
    	"use strict";
    	
    	// Access to the controlling variables of the control unit component
    	$scope.controlScope = $scope.$parent.controlControl.childScope;
    	
    	$scope.cache = [];
    	
  		// Listener for the datepicker
    	$scope.$watch('controlScope.dateData.unixRest', function(newValue) { 
			if($scope.$parent.viewControl.timeline.visible && typeof newValue !== 'undefined' && newValue !== 'Please select a date ...')	{
				$scope.refreshData();
			}
	    });
    	
    	// Listener for the userpicker
    	$scope.$watch('controlScope.userData.currentSubject', function(newValue) { 
			if($scope.$parent.viewControl.timeline.visible)	{
				$scope.refreshData();
			}
	    });
    	
    	$scope.refreshData = function()	{
    		var result={}; //TODO request
    		var month = 'Not requested'; 
    		var day = 'Not requested';
    		if(result.returned[0] !== 'Not requested')	{
    			day = result.returned[0]
    		}
    		if(result.returned[1] !== 'Not requested')	{
    			month = result.returned[0]
    		}
    		
    		var time = new Date($scope.controlScope.dateData.unixRest);
    		time.setDate(1);
    		
    	}
    }
});