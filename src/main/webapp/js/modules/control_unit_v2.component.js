angular.
module('controlUnitV2').
  component('controlUnitV2', {
    templateUrl: 'html/control_unit_v2.template.html',
    controller: function controlController($scope, $timeout, helper) {
    	"use strict"; 	
    	
    	
    	$scope.userData = {
       		users: [],
       		chosen_user: '',
       		currentSubject: '',
       		/**
       	  	 * Handles the change of the chosen user. Updates the user and renders the timeline anew
          	 */
        	userChange: function()	{

        	}
        };
    	
    	var time = new Date();
		$scope.unixRest = time - (time%86400000) + (time.getTimezoneOffset()*60000);
       
    	$scope.slider = {
        	minValue: 0,
        	maxValue: 1439,
    		options: {
    			floor: 0,
    			ceil: 1439,
    			disabled: false,
    			translate: function(value)	{
			    	return helper.getDateFromUnix(value*60000+$scope.unixRest);
    			},
    			onChange: function(sliderId)	{
    			    var x=0;        	
    			}
    		},
    	};
    	
    	$scope.$watch('dt.value', function(newValue) { 
			if(typeof newValue !== 'undefined' && newValue !== 'Please select a date ...')	{
				$scope.unixRest = newValue - (newValue%86400000) + (newValue.getTimezoneOffset()*60000);
			}
	    });
    	
		//-------------------------Stuff for the Datepicker------------------------------------
		$scope.today = function() {
		    $scope.dt = new Date();
		};
		
		$scope.clear = function() {
		    $scope.dt = null;
		};

		$scope.inlineOptions = {
			customClass: getDayClass,
		    minDate: new Date(2016, 1, 1),
		    showWeeks: true
		};

		$scope.dateOptions = {
		    formatYear: 'yy',
		    maxDate: new Date(),
		    minDate: new Date(2016, 1, 1),
		    startingDay: 1
		};
			  
		$scope.toggleMax = function() {
		    $scope.inlineOptions.maxDate = $scope.inlineOptions.maxDate ? null : new Date();
		    $scope.dateOptions.maxDate = $scope.inlineOptions.maxDate;
		};

		$scope.setDate = function(year, month, day) {
		    $scope.dt = new Date(year, month, day);
		};

		$scope.open = function() {
		    $scope.popup.opened = true;
		};

		$scope.popup = {
		    opened: false
		};
		
		function getDayClass(data) {
			var date = data.date;
			var mode = data.mode;
			if (mode === 'day') {
				var dayToCheck = new Date(date).setHours(0,0,0,0);

				for (var i = 0; i < $scope.events.length; i++) {
					var currentDay = new Date($scope.events[i].date).setHours(0,0,0,0);
					
					if (dayToCheck === currentDay) {
						return $scope.events[i].status;
			        }
			    }
			}
		return '';
		}
			
		$scope.today();
		$scope.toggleMax();
		$scope.format = 'MM/dd/yyyy';
		$scope.altInputFormats = ['M!/d!/yyyy'];
		$scope.dt.value = $scope.dt;
			
		var tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		var afterTomorrow = new Date();
		afterTomorrow.setDate(tomorrow.getDate() + 1);
		$scope.events = [
			{
			  date: tomorrow,
			  status: 'full'
			},
			{
			  date: afterTomorrow,
			  status: 'partially'
			}
		];
		//----------------End for the stuff of the Datepicker--------------------------------------	
    }
});