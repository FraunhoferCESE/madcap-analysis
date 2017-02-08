angular.
module('userV2').
component('userV2', {
    templateUrl: 'html/user_information_v2_view.template.html',
    controller: function UserInfoController($scope, $timeout, helper, loading_overlay) {
    	"use strict";
    	
    	// Access to the controlling variables of the control unit component
    	$scope.controlScope = $scope.$parent.controlControl.childScope;
    	$scope.firstOpen = true;
    	
    	$scope.informationData = {
    		onTimeDay: "No user or date",
    		onTimeMonth: "No user or date",
    		interruptionTimeDay: "No user or date",
    		interruptionTimeMonth: "No user or date",
    		interruptionCountDay: "No user or date",
    		interruptionCountMonth: "No user or date",
    		model: "No user or date",
    		manufacturer: "No user or date",
    		api: "No user or date",
    		madcapVersion: "No user or date",
    	};
    	
    	$scope.dialog = [];
    	$scope.dialog[0] = {
    		parentElement: null
    	};

    	$scope.cache = [];
    	
  		// Listener for the datepicker
    	$scope.$watch('controlScope.dateData.unixRest', function(newValue) { 
			if($scope.$parent.viewControl.userinfo.visible && typeof newValue !== 'undefined' && newValue !== 'Please select a date ...' && $scope.controlScope.userData.currentSubject !== '')	{
				$scope.refreshData();
			}
	    });
    	
    	// Listener for the userpicker
    	$scope.$watch('controlScope.userData.currentSubject', function(newValue) { 
    		if($scope.$parent.viewControl.userinfo.visible && $scope.controlScope.userData.currentSubject !== '')	{
				$scope.refreshData();
			}
	    });
    	
    	// Listener for the timeline csv download button
    	$scope.$parent.$watch('viewControl.userinfo.visible', function(newValue) { 
			if(!($scope.firstOpen) && $scope.$parent.viewControl.userinfo.visible)	{
				$scope.firstOpen = false;
				$scope.refreshData();
			}
	    });
    	
    	$scope.refreshData = function()	{
			if ($scope.dialog[0].parentElement === null) {
				$scope.dialog = loading_overlay.createLoadOverlay("Loading data ...", this,'user_content');
			}
    		gapi.client.analysisEndpoint.getUserInformation({"user" : $scope.controlScope.userData.currentSubject, "time" : $scope.controlScope.dateData.unixRest+10000, "with_month" : true}).execute(function(resp)	{
				var returned = resp;
    			
	    		$scope.$apply(function(){
	    			if ($scope.dialog[0].parentElement !== null) {
	    				$scope.dialog.remove();
	    			}
	    			$scope.informationData.onTimeDay = helper.getTimeWithUnits(returned.returned[0]);
	    			$scope.informationData.onTimeMonth = helper.getTimeWithUnits(returned.returned[1]);
	    			$scope.informationData.interruptionTimeDay = helper.getTimeWithUnits(returned.returned[2]);
	    			$scope.informationData.interruptionCountDay = returned.returned[3];
	    			$scope.informationData.interruptionTimeMonth = helper.getTimeWithUnits(returned.returned[4]);
	    			$scope.informationData.interruptionCountMonth = returned.returned[5];
	    			$scope.informationData.model =  returned.returned[6];
	    			$scope.informationData.manufacturer = returned.returned[7];
	    			$scope.informationData.api = returned.returned[8];
	    			$scope.informationData.madcapVersion = returned.returned[9];
	    		});
	    	});
    	};
    }
});