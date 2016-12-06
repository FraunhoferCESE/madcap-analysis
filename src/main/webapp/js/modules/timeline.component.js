angular.
module('timeline').
  component('timeline', {
    templateUrl: 'html/timeline_view.template.html',
    controller: function SensorDataPresentationController($scope, $timeout, helper, allowed_directive_service) {
    	
    	"use strict"; 	
    	
    	// Various flags to synchronize the multiple callbacks during initialization
    	$scope.stopper = {
    	    showPage: false,
    		directiveFinished: false,
    		renderingfinished: false,
    		firstRendering: true,
    		setScrollListener: false
    	};
    	
    	/* Information about the bars shown right besides the timeline. Shows the information of the bar
    	the mouse last hovered over*/
    	$scope.barInfo = {
    		label: "No activity chosen",
    		start: "No activity chosen",
    		end: "No activity chosen"
    	};
    	
    	// All relevant data about the user
    	//TODO replace filler currentSubject with actual functionality on load
    	$scope.userData = {
    			users: [],
    			chosen_user: '',
    			currentSubject: '101106521377446542291'
    		};
    	
    	// Storage for the event data. eventStorage contains all loaded data, eventCache only the currently shown
    	$scope.eventData = {
    		eventStorage: [],
    		eventCache: []
    	};
    	
    	// Listener for the datepicker
    	$scope.$watch('dt.value', function(newValue) { 
			if(typeof newValue !== 'undefined' && newValue !== 'Please select a date ...')	{
				$scope.unixRest = newValue.getTime();
			}
	    });
    	
    	// passes the callback t the permission check directive
    	allowed_directive_service.passDirectiveCallback(function()	{
      			
    		document.getElementById('timelineloadspinner').style.display="block";
			document.getElementById('timelineloadmessage').style.display="block";		
		
			$scope.stopper.directiveFinished = true;
			if($scope.stopper.renderingFinished)	{
            	$scope.filterAccordingToSlider();	
      			}
		});
    	
    	gapi.client.analysisEndpoint.getUsers().execute(function(resp){
			for(var i=0; i<resp.returned.length; i++)	{
				$scope.userData.users[i+1] = resp.returned[i]+""; 
			}
			$scope.userData.users[0] = 'Please choose a user ...';
						
		});
    
    	
    	/**
    	 * Handles the change of the chosen user. Updates the user and renders the timeline anew
    	 */
    	$scope.userChange = function()	{
			if($scope.userData.currentSubject === '')	{
				for(var i=0; i<$scope.userData.users.length-1; i++)	{
					$scope.userData.users[i] = $scope.userData.users[i+1];
				}
				delete $scope.userData.users.splice($scope.userData.users.length-1,1);
			}
			$scope.userData.currentSubject = document.getElementById("chosen_user").options[document.getElementById("chosen_user").selectedIndex].text;
			$scope.renderTimeline();
    	};
		
		$scope.slider = {
				    minValue: 0,
				    maxValue: 1439,
				    options: {
			            floor: 0,
				    	ceil: 1439,
				    	disabled: false,
			            translate: function(value)	{
			            	return helper.getDateFromUnix(value);
			            },
			            onChange: function(sliderId)	{
			            	$scope.filterAccordingToSlider();        	
			            }
				    },
				};
		
		
		  /**
		   * Filters the barts according to the slider. This contains two main functionalities:
		   * 1. add bars to the cache which are in the sliders range in full
		   * 2. add cutted bars to the cache which are only partially in the sliders range
		   * Filtering has do be done twodimensional (Many events in storage (D1), many times in events(D2)).
		   */
		  $scope.filterAccordingToSlider = function()	{	
				
			  	$scope.eventData.eventCache = [];
			  	var sliderStart = $scope.unixRest + $scope.slider.minValue*60*1000;
				var sliderEnd = $scope.unixRest + $scope.slider.maxValue*60*1000;
			  	// Go through all events
				for(var i=0; i<$scope.eventData.eventStorage.length; i++){					
					  $scope.eventData.eventCache[i] = {};
					  $scope.eventData.eventCache[i].times = [];
					  $scope.eventData.eventCache[i].label = $scope.eventData.eventStorage[i].label;
					  
					  var skippedTimes = 0;
					  // Go through all times in an event
			  		  for(var j=0; j<$scope.eventData.eventStorage[i].times.length; j++){
			  			  var timeframe = $scope.eventData.eventStorage[i].times[j];
			  			  timeframe.starting_time = parseInt(timeframe.starting_time);
			  			  timeframe.ending_time = parseInt(timeframe.ending_time);
			  			  // Bar is not in range. Skip it
			  			  if(sliderEnd < timeframe.starting_time || sliderStart > timeframe.ending_time)	{
			  				  skippedTimes++;
			  			  }
			  			  // Bars end is outside the range. Cut end
			  			  else if(sliderStart < timeframe.starting_time && timeframe.ending_time > sliderEnd)	{
			  				$scope.eventData.eventCache[i].times[j-skippedTimes] = {};
			  				  $scope.eventData.eventCache[i].times[j-skippedTimes].starting_time = $scope.eventData.eventStorage[i].times[j].starting_time;
			  				  $scope.eventData.eventCache[i].times[j-skippedTimes].ending_time = sliderEnd;
			  			  }
			  			  // Bars start is outside the range. Cut start
			  			  else if(sliderStart > timeframe.starting_time && timeframe.ending_time < sliderEnd)	{
			  				  $scope.eventData.eventCache[i].times[j-skippedTimes] = {};
			  				  $scope.eventData.eventCache[i].times[j-skippedTimes].ending_time = $scope.eventData.eventStorage[i].times[j].ending_time;
			  				  $scope.eventData.eventCache[i].times[j-skippedTimes].starting_time = sliderStart;						  
			  			  }
			  			  // Bars start and end are outside the range. Cut on both ends
			  			  else if(sliderStart > timeframe.starting_time && timeframe.ending_time > sliderEnd)	{
				  				$scope.eventData.eventCache[i].times[j-skippedTimes] = {};
			  				  $scope.eventData.eventCache[i].times[j-skippedTimes].starting_time = sliderStart;						  
			  				  $scope.eventData.eventCache[i].times[j-skippedTimes].ending_time = sliderEnd;						  
			  			  }
			  			  // Bars is in range. Copy from storage to cache
			  			  else if(sliderStart < timeframe.starting_time && timeframe.ending_time < sliderEnd)	{
			  				$scope.eventData.eventCache[i].times[j-skippedTimes] = {};
			  				$scope.eventData.eventCache[i].times[j-skippedTimes].ending_time = $scope.eventData.eventStorage[i].times[j].ending_time;
			  				$scope.eventData.eventCache[i].times[j-skippedTimes].starting_time = $scope.eventData.eventStorage[i].times[j].starting_time;
			  				  			  			  }
			  		  }
				  }
				$scope.callback();
		  };
		
    	var time = new Date();
		$scope.unixRest = time - (time%86400000) + (new Date().getTimezoneOffset()*60000);
        $scope.eventData.eventStorage = [];
		$scope.eventData.eventStorage[0] = {};
		$scope.eventData.eventStorage[0].label = "No data";
		$scope.eventData.eventStorage[0].times = [];
		$scope.eventData.eventStorage[0].times[0] = {"starting_time": $scope.unixRest, "ending_time": ($scope.unixRest + 86400000)};
		
		
		/**
		 * Renders the timeline. Loads the events and filters them by bundling multiple timstamps
		 *  for the same event into one timeframe.
		 */
		$scope.renderTimeline = function()	{
			$scope.eventData = {
		    		eventStorage: [],
		    		eventCache: []
		    	};
			gapi.client.analysisEndpoint.getActivityData({"user" : $scope.userData.currentSubject, "start" : $scope.unixRest, "end" : ($scope.unixRest + 86400000)}).execute(function(resp)	{
				if(resp !== null && resp !== false && typeof resp.items !== 'undefined' && resp.items.length !== 0)	{
					var rawData = [];
					for(var i=0; i<resp.items.length; i++){
						rawData[i] = {};
     			   		rawData[i].time = resp.items[i].timestamp;
     			   		rawData[i].block = resp.items[i].packageName;
					}
					var refinedData = helper.refineData(rawData);
					var count = 0;
					// Creates the data for the timeline
					for(var j=0; j<refinedData.length; j++)	{
						var expendedExisting = false;
						for(var k=0; k<$scope.eventData.eventStorage.length; k++)	{
							if(refinedData[j].block === $scope.eventData.eventStorage[k].label)	{
								$scope.eventData.eventStorage[k].times[$scope.eventData.eventStorage[k].times.length] = {"starting_time": refinedData[j].start, "ending_time": refinedData[j].end};
								expendedExisting = true;
							}
						}
						if(!expendedExisting)	{
							$scope.eventData.eventStorage[count] = {label: refinedData[j].block, times: [{"starting_time": refinedData[j].start, "ending_time": refinedData[j].end}]};							
							count++;
						}
					}
					
					$scope.eventData.eventStorage.sort(function(a,b)	{
						var upperA = a.label.toUpperCase();
						var upperB = b.label.toUpperCase();
						if(upperA < upperB){
							return -1;
						}
						else if(upperA > upperB)	{
							return 1;
						}
						return 0;
					});
				}
     	   
				$scope.stopper.renderingFinished = true;
				if($scope.stopper.directiveFinished)	{
      				$scope.filterAccordingToSlider();	
      			}			
			});
        };
        
        
        /**
         * Renders the timeline
         */
        $scope.callback = function()	{
        	
			if($scope.stopper.firstRendering){
				document.getElementById('timelineloadspinner').style.display="none";
				document.getElementById('timelineloadmessage').style.display="none";					
				$scope = helper.datePickerSetup($scope);
				$scope.$apply(function()	{
					$scope.stopper.showPage = true;
				});
				$scope.stopper.firstRendering = false;
			}
			
			$timeout(function()	{
				$scope.$apply(function(){
					d3.select("svg").remove();
					$scope.chart = d3.timeline().stack().changerange($scope.slider.minValue*60*1000 + $scope.unixRest, $scope.slider.maxValue*60*1000 + $scope.unixRest).hover(
						function (d, i, datum) {
							$scope.$apply(function()	{
								$scope.barInfo.label = datum.label;
								$scope.barInfo.start = helper.getDateFromUnix(Math.ceil((d.starting_time-$scope.unixRest)/60000));
								$scope.barInfo.end = helper.getDateFromUnix(Math.ceil((d.ending_time-$scope.unixRest)/60000));
							});
						}
					);
					if(!$scope.stopper.setScrollListener)	{
						/**
						 * MAnipulates time slider on scrolling. One scroll tick decreases the timeframe
						 * by 5 Minutes on each side of the slider
						 */
						document.getElementById("timeline1").addEventListener('wheel',function(event){
							if(event.deltaY < 0)	{
								if($scope.slider.minValue < $scope.slider.maxValue+5)	{
									$scope.slider.maxValue = $scope.slider.maxValue - 5;
								}
								else{
									$scope.slider.maxValue = $scope.slider.minValue + 1;
								}
								if($scope.slider.minValue-5 < $scope.slider.maxValue)	{
									$scope.slider.minValue = $scope.slider.minValue + 5;
								}
								else	{
									$scope.slider.minValue = $scope.slider.maxValue - 1;
								}
							}
							else if(event.deltaY > 0)	{
								if(4 < $scope.slider.minValue){
									$scope.slider.minValue = $scope.slider.minValue - 5;
								}
								else	{
									$scope.slider.minValue = 0;
								}
								if($scope.slider.maxValue<1435)	{
									$scope.slider.maxValue = $scope.slider.maxValue + 5;
								}
								else	{
									$scope.slider.maxValue = 1439;
								}
							}
							$scope.stopper.setScrollListener = true;
			            	$scope.filterAccordingToSlider();        	
						});
					}
					$scope.r = d3.select("#timeline1").append("svg").attr("width", 1000) .datum($scope.eventData.eventCache).call($scope.chart);
				});
			}, 0);
        };
        $scope.renderTimeline();
	 }
  }
);