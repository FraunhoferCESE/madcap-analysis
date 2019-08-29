angular.
module('userV2').
component('userV2', {
    templateUrl: 'html/user_information_v2_view.template.html',
    controller: function UserInfoController($scope, $timeout, helper, loading_overlay) {
    	"use strict";
    	
    	// Access to the controlling variables of the control unit component
    	$scope.controlScope = $scope.$parent.controlControl.childScope;
    	$scope.firstOpen = true;
    	$scope.processTickets = [];
    	
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

    	$scope.cache = {
    		content: {
        		storage: [],
        	},
       		meta: [],
        	pointer: 0,
        	size: 5
    	};
    	
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
    	$scope.$parent.$watch('viewControl.userinfo.expanded', function(newValue) { 
			if(!($scope.firstOpen) && $scope.$parent.viewControl.userinfo.expanded)	{
				$scope.firstOpen = false;
				$scope.refreshData();
			}
			else if($scope.firstOpen)	{
				$scope.firstOpen = false;
			}
	    });
    	
    	// Listener for the button to download the information of one user
		$scope.$watch('controlScope.control.userInformationOneCsvTrigger',function(newValue) {
			if ($scope.controlScope.control.userInformationOneCsvTrigger) {
				$scope.exportData(false);
				$scope.controlScope.control.userInformationOneCsvTrigger = false;
			}
		});
		
		// Listener for the button to download the information of all users
		$scope.$watch('controlScope.control.userInformationAllCsvTrigger',function(newValue) {
			if ($scope.controlScope.control.userInformationAllCsvTrigger) {
				$scope.exportData(true);
				$scope.controlScope.control.userInformationAllCsvTrigger = false;
			}
		});
    	
    	$scope.refreshData = function()	{
			
    		if ($scope.dialog[0].parentElement === null) {
				$scope.dialog = loading_overlay.createLoadOverlay("Loading data ...", this,'user_content');
			}
    		
    		var time = new Date().getTime();
			var user = $scope.controlScope.userData.currentSubject;
			var date = $scope.controlScope.dateData.unixRest;
			$scope.processTickets[user+date+""] = time+'';
			
			//In correlation to the source of the event change, the identifier for the cache entry gets built			
			var cacheUser = $scope.controlScope.userData.currentSubject;
			var cacheDate = $scope.controlScope.dateData.unixRest;
			var cacheSource = $scope.controlScope.sourceData.timelineSource;
			
			if($scope.controlScope.eventTrigger === 'user')	{
				cacheUser = $scope.controlScope.userData.lastSubject;
			}
			else if($scope.controlScope.eventTrigger === 'date')	{
				cacheDate = $scope.controlScope.dateData.lastUnixRest;
			}
			
			//Chaches the data if there is data to cache
			if(cacheUser !== '')	{
				$scope.cache = helper.cacheData($scope.cache, {
					storage: $scope.informationData,
				}, cacheDate + cacheUser);
			}
    		
    		var cachedAt = -1;
			
			// Checks if the key is in the cache
			for(var j=0; cachedAt === -1 && j< $scope.cache.size; j++){
				if(date + user === $scope.cache.meta[j])	{
					cachedAt = j;
				}
			}
			if(cachedAt !== -1)	{
				
				var maxTicket = 0;
				var keys = Object.keys($scope.processTickets);
				for(var k=0; k<keys.length; k++)	{
					if(maxTicket < parseInt($scope.processTickets[keys[k]]))	{
						maxTicket = parseInt($scope.processTickets[keys[k]]);
					}
				}
				
				if(maxTicket === parseInt($scope.processTickets[user + date]))	{
    				$scope.informationData = {};
					$scope.informationData = $scope.cache.content.storage[cachedAt];
					$scope.processTickets = {};
					if ($scope.dialog[0].parentElement !== null) {
		    			$scope.dialog.remove();
		    		}
				}
			}
			else	{
				gapi.client.analysisEndpoint.getUserInformation({"user" : $scope.controlScope.userData.currentSubject, "time" : $scope.controlScope.dateData.unixRest+10000, "with_month" : true}).execute(function(resp)	{
					var returned = resp;
	    			
		    		$scope.$apply(function(){
		    				
		    			var maxTicket = 0;
		    			var keys = Object.keys($scope.processTickets);
		    			for(var k=0; k<keys.length; k++)	{
		    				if(maxTicket < parseInt($scope.processTickets[keys[k]]))	{
		   						maxTicket = parseInt($scope.processTickets[keys[k]]);
		   					}
		   				}
		    			
		    			if(maxTicket === parseInt($scope.processTickets[user + date]))	{
		    				if ($scope.dialog[0].parentElement !== null) {
				    			$scope.dialog.remove();
				    		}
		    				$scope.informationData = {};
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
				    		$scope.processTickets = {};
		    			}
		    		});
		    	});
			}
		};
    	
    	$scope.exportData = function(forAll)	{
			var subject = $scope.controlScope.userData.currentSubject;
			var date = new Date($scope.controlScope.dateData.unixRest);
			var day = date.getDate();
			var month = 1 + date.getMonth();
			if (day < 10) {
				day = '0' + day;
			}
			if (month < 10) {
				month = '0' + month;
			}
			
			var result = [];
			var userRef = $scope.controlScope.userData.users;
			var userRefLength = userRef.length;
			if(!forAll)	{
				userRef = [$scope.controlScope.userData.currentSubject];
				userRefLength = 1;
			}
			$scope.controlScope.csvParameter.csvProgressUserInformation = 0;
			var step = Math.floor(100/userRefLength);
			$scope.controlScope.csvParameter.createCsvUserInformation = true;
				
			var userCount = 0;

			var initialValueOfLoop = !!forAll ? 1 : 0;

	    	for(var j=initialValueOfLoop; j<userRefLength; j++){
		    	gapi.client.analysisEndpoint.getUserInformation({"user" : userRef[j], "time" : $scope.controlScope.dateData.unixRest+10000, "with_month" : true}).execute(function(returned)	{
		   			result[userCount] = {
		    			user: returned.returned[10],
		    			onTimeDay: Math.floor(returned.returned[0]/1000),
		   				onTimeMonth: Math.floor(returned.returned[1]/1000),
		   				interruptionTimeDay: Math.floor(returned.returned[2]/1000),
		   				interruptionCountDay: returned.returned[3],
		  				interruptionTimeMonth: Math.floor(returned.returned[4]/1000),
	   					interruptionCountMonth: returned.returned[5],
		   				model: returned.returned[6],
		   				manufacturer: returned.returned[7],
	    				api: returned.returned[8],
	    				madcapVersion: returned.returned[9]
	    			};
		    			
		    		$scope.$apply(function(){
		    			$scope.controlScope.csvParameter.csvProgressUserInformation = $scope.controlScope.csvParameter.csvProgressUserInformation + step;
		   			});
					   
		    		if(++userCount === userRefLength-1 || userRefLength === 1 && !forAll)	{
		    			$scope.controlScope.csvParameter.createCsvUserInformation = false;
		    			$scope.controlScope.csvParameter.csvProgressUserInformation = 0;
		   				continueExport(result);
		   			}
		   		});
			}
			
			function continueExport(result)	{
				var row = 'data:text/csv;charset=utf-8,' + '"User","Accountable Time (Day)","Accountable Time (Month)","Interrupted Time (Day)","Interrupted Time (Month)","Interruption Count (Day)","Interruption Count (Day)","Smartphone model","Smartphone manufacturer","Smartphone API version","MADCAP version"\r\n';
				for (var i=0; i<result.length; i++) {
					row = row + '="' + result[i].user + '",="' + result[i].onTimeDay + '",="' + result[i].onTimeMonth + '",="' + result[i].interruptionTimeDay + '",="' + result[i].interruptionTimeMonth + '",="' + result[i].interruptionCountDay + '",="' + result[i].interruptionCountMonth +  '",="' + result[i].model +  '",="' + result[i].manufacturer + '",="' + result[i].api + '",="' + result[i].madcapVersion + '",="' + '"\r\n';
				}
				var encodedUri = encodeURI(row);
				var link = document.createElement("a");
				var subject = $scope.controlScope.userData.currentSubject;
				if(result.length > 1){
					subject ="ALL_USERS";
				}
				link.setAttribute("href",encodedUri);
				link.setAttribute("download","user_information_export_" + subject + "_" + month + "_" + day + "_" + date.getFullYear() + ".csv");
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
			}
    	};
    }
});