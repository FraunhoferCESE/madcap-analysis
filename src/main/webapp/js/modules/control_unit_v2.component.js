/**
 * This module contains the control elements for all visualization views (map, timeline, ...). Listening to the elements is normally handled
 * directly by the visualization views. This element works as a middle man between the the control elements and the visualization. It will handle precalculations and such.
 * Moreover, this module manages the logic of the control unit. This includes:
 * - Dynamic managing of the visible elements for the control unit
 * - Firing events for the visualizations
 * - providing containers for controling-related information
 * - setup of all control elements
 * 
 *  IMPORTANT!: This module is intended to be used only together with the master
 * module and the control_unit_v2 module. It will NOT work on it's own!
 * @author Stefan Hintzen
 */
angular.
module('controlUnitV2').
  component('controlUnitV2', {
    templateUrl: 'html/control_unit_v2.template.html',
    controller: function controlController($scope, $timeout, helper) {
    	"use strict"; 	
    	
    	$scope.eventTrigger = '';
    	
    	//Data regarding the chosen user
    	$scope.userData = {
       		users: [],
       		chosen_user_for_gui: '',
       		currentSubject: '',
       		lastSubject: '',
       		/**
       		 * This method ges called, when the user changes the chosen user in the user dropdown. The user gets changed and the filler value gets deleted,
       		 * when it is still part of the user array.
       		 */
       		userChange: function()	{
       			$scope.eventTrigger = 'user';
       			if($scope.userData.currentSubject === '')	{
 					for(var i=0; i<$scope.userData.users.length-1; i++)	{
 						$scope.userData.users[i] = $scope.userData.users[i+1];
 					}
 					delete $scope.userData.users.splice($scope.userData.users.length-1,1);
					}
       			$scope.userData.lastSubject = $scope.userData.currentSubject;
 				$scope.userData.currentSubject = document.getElementById("chosen_user").options[document.getElementById("chosen_user").selectedIndex].text;
       		}
        };

    	// These booleans control which part of the control unit are shown and which are not
    	$scope.control = {
    		mapButtonsVisible: false,
    		csvMapButtonsVisible: false,
    		csvTimelineButtonsVisible: false,
    		csvUserInformationButtonsVisible: false,
   			timelineDatapickerVisible: false,
    		userpickerVisible: false,
    		datepickerVisible: false,
    		sliderVisible: false,
    		mapOriginCheckboxesVisible: false,
    		timelineCsvTrigger: false,
    		locationCsvTrigger: false,
    		blockCsvTrigger: false,
    		userInformationOneCsvTrigger: false,
    		userInformationAllCsvTrigger: false,
    		blockCsvTrigger: false,

    		/**
    		 * Re-renders the slider to show correct values.
    		 */
    		rerenderSlider: function()	{
    	    	$scope.$broadcast('rzSliderForceRender');
    		},
    	};
    	
    	// Functions and variables to control visualization refresh orders.
    	$scope.refreshOrders =	{
    		refreshTimeline: false,
    		refreshMap: false,
    		timeline: function()	{
            	$scope.eventTrigger = 'timelineRefresh';
            	$scope.refreshOrders.refreshTimeline = true;
    		},
    		usermap: function()	{
            	$scope.eventTrigger = 'mapRefresh';
            	$scope.refreshOrders.refreshMap = true;
        	}
    	};
    	
    	// Data regarding the source if a visualization displays multiple like the timeline for example
    	$scope.sourceData = {
        	timeline_source_for_gui: 'Activity in Foreground',
    		lastTimelineSource: '',
    		timelineSource: 'Activity in Foreground',
          	timelineSources: ['Activity in Foreground','Kind of Movement'],
            /**
             * States the source of the timeline render request.
             */
          	timelineSourceChange: function()	{
            	$scope.eventTrigger = 'timelineSource';
           		$scope.sourceData.lastTimelineSource = $scope.sourceData.timelineSource;
            	$scope.sourceData.timelineSource = document.getElementById("chosen_source").options[document.getElementById("chosen_source").selectedIndex].text;
           	}	
        };
    	
        // Makes itself known to the master module
    	$scope.$parent.controlControl.childScope = $scope;
    	
    	//Data regarding the slider
    	$scope.slider = {
        	minValue: 0,
        	maxValue: 1440,
    		options: {
    			floor: 0,
    			ceil: 1440,
    			disabled: false,
    			translate: function(value)	{
    				if(value === 1440)	{
    					return "24:00:00";
    				}
			    	return helper.getDateFromUnix(value*60000+$scope.dateData.unixRest);
    			}
    		},
    	};
    	
    	//Data regarding the currently chosen date
    	$scope.dateData = {
    		unixRest: 0,
    		lastUnixRest: 0
    	};
    	
    	//Trigger methods for the csv downloads of all visualizations
    	$scope.csvTrigger = {
    		startTimelineCsv: function()	{
    			$scope.control.timelineCsvTrigger = true;
    		},
    		startBlockCsv: function()	{
    			$scope.control.blockCsvTrigger = true;
    		},
    		startLocationCsv: function()	{
    			$scope.control.locationCsvTrigger = true;
    		},
    		startUserInformationCsvOne: function()	{
    			$scope.control.userInformationOneCsvTrigger = true;
    		},
    		startUserInformationCsvAll: function()	{
    			$scope.control.userInformationAllCsvTrigger = true;
    		}
        };
    	
    	// Diverse flags for the csv exports
    	$scope.csvParameter = {
    			createCsvMap: false,
    			createCsvTimeline: false,
    			createCsvUserInformation: false,
    			maxMap: 0,
    			csvProgressMap: 0,
    			csvProgressUserInformation: 0
    	};
    	
    	//Data regarding the map, which has to be part of the control panel
    	$scope.mapControlData =	{
    		isHeat: false,
    		centerMapOrder: false,
    		toggleHeatmap: function()	{
    			if($scope.mapControlData.isHeat)	{
    				$scope.mapControlData.isHeat = false;
    			}
    			else	{
    				$scope.mapControlData.isHeat = true;
    			}
    		},
    		centerMap: function()	{
    			$scope.mapControlData.centerMapOrder = true;
    		},
    		requestCensusData: function()	{
    			$scope.mapControlData.censusRequest = true;
    		},
    		censusRequest: false,
    		wifiAsOriginChecked: true,
    		gpsAsOriginChecked: true,
    		cellAsOriginChecked: true
    	};
    	
    	//First setting of the unixRest. unixRest states midnight of the chosen date in Unix milliseconds.
    	var time = new Date();
		$scope.dateData.unixRest = time - ((time-(time.getTimezoneOffset()*60000))%86400000);
       
		// Listener to the datepicker. Sets the unixRest, to which the visualizations listen
    	$scope.$watch('dt.value', function(newValue) { 
			$scope.eventTrigger = 'date';
    		if(typeof newValue !== 'undefined' && newValue !== 'Please select a date ...')	{
				$scope.dateData.lastUnixRest = $scope.dateData.unixRest; 
				$scope.dateData.unixRest = newValue - ((newValue-(newValue.getTimezoneOffset()*60000))%86400000);
			}
	    });
    	
    	//Requests a list of all users, which are connected to LocationEntries. Also inserts a filler value when no user is chosen.
		gapi.client.analysisEndpoint.getUsers().execute(function(resp){
			for(var i=0; i<resp.returned.length; i++)	{
				$scope.userData.users[i+1] = resp.returned[i]+""; 
			}
			$scope.userData.users[0] = 'Please choose a user ...';	
			$scope.$apply(function(){
				$scope.userData.chosen_user_for_gui = $scope.userData.users[0];	
			});
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