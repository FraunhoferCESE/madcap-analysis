angular.
module('timeline').
  component('timeline', {
    templateUrl: 'html/timeline_view.template.html',
    controller: function TimelineController($scope, $timeout, helper, allowed_directive_service, loading_overlay) {
    	
    	"use strict"; 	
    	    	
    	// Various flags to synchronize the multiple callbacks during initialization
    	$scope.stopper = {
    	    showPage: false,
    		directiveFinished: false,
    		renderingfinished: false,
    		firstRendering: true,
    		setScrollListener: false,
    		isApplicationShow: true,
    		isActivityShow: false
    	};
    	
    	/* Information about the bars shown right besides the timeline. Shows the information of the bar
    	the mouse last hovered over*/
    	$scope.barInfo = {
    		label: "No activity chosen",
    		start: "No activity chosen",
    		end: "No activity chosen",
    		probability: 'No probability to show'
    	};
    	
    	// All relevant data about the user
    	//TODO replace filler currentSubject with actual functionality on load
    	$scope.userData = {
    		users: [],
    		chosen_user: '',
    		currentSubject: '',
    		/**
    	   	 * Handles the change of the chosen user. Updates the user and renders the timeline anew
    	   	 */
    	    userChange: function()	{
        		if($scope.userData.currentSubject === '')	{
    				for(var i=0; i<$scope.userData.users.length-1; i++)	{
    					$scope.userData.users[i] = $scope.userData.users[i+1];
    				}
    				delete $scope.userData.users.splice($scope.userData.users.length-1,1);
   				}
    			$scope.userData.currentSubject = document.getElementById("chosen_user").options[document.getElementById("chosen_user").selectedIndex].text;
    			$scope.renderTimeline();
    	    }
    	};
    	
    	// Storage for the event data. eventStorage contains all loaded data, eventCache only the currently shown
    	$scope.eventData = {
    		eventStorage: [],
    		eventCache: [],
    		source: 'Activity in Foreground',
    		sources: ['Activity in Foreground','Kind of Movement'],
    		sourceChange: function()	{
    			$scope.eventData.source = document.getElementById("chosen_source").options[document.getElementById("chosen_source").selectedIndex].text;
    			if($scope.eventData.source === 'Activity in Foreground')	{
    				$scope.stopper.isApplicationShow = true;
    				$scope.stopper.isActivityShow = false; 
    			}
    			else if($scope.eventData.source === 'Kind of Movement')	{
    				$scope.stopper.isApplicationShow = false;
    				$scope.stopper.isActivityShow = true; 
    			}
				$scope.renderTimeline();
    		},
    		probability: []
    	};
    	
    	gapi.client.analysisEndpoint.getUsers().execute(function(resp){
			for(var i=0; i<resp.returned.length; i++)	{
				$scope.userData.users[i+1] = resp.returned[i]+""; 
			}
			$scope.userData.users[0] = 'Please choose a user ...';	
			$scope.$apply(function(){
				$scope.userData.chosen_user = $scope.userData.users[0];	
			});
		});	
		
    	// Listener for the datepicker
    	$scope.$watch('dt.value', function(newValue) { 
			if(typeof newValue !== 'undefined' && newValue !== 'Please select a date ...')	{
				$scope.unixRest = newValue - (newValue%86400000) + (newValue.getTimezoneOffset()*60000);
				$scope.renderTimeline();
			}
	    });
    	
    	// passes the callback to the permission check directive
    	allowed_directive_service.passDirectiveCallback(function()	{
      			
    		document.getElementById('timelineloadspinner').style.display="block";
			document.getElementById('timelineloadmessage').style.display="block";		
		
			$scope.stopper.directiveFinished = true;
			if($scope.stopper.renderingFinished)	{
            	$scope.filterAccordingToSlider($scope.eventData.source);	
      			}
		});
    	
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
			    	$scope.filterAccordingToSlider($scope.eventData.source);        	
			    }
			},
		};
				
		var time = new Date();
		$scope.unixRest = time - (time%86400000) + (new Date().getTimezoneOffset()*60000);
        
		
		/**
		 * Renders the timeline. Loads the events and filters them by bundling multiple timstamps
		 *  for the same event into one timeframe. Breaks down the bars when there are different probabilities
		 *  or ON/OFF events inside them
		 */
		$scope.renderTimeline = function()	{
			$scope.eventData.eventStorage = [];
			$scope.eventData.eventCache = [];
			var src = $scope.eventData.source;

			if($scope.userData.currentSubject !== '')	{
				
				if(!($scope.stopper.firstRendering))	{
					var dialog = loading_overlay.createLoadOverlay("Loading data ...", this, 'old_timeline_content');
				}
				
				//Loads the data to display in the timeline
				gapi.client.analysisEndpoint.getActivityData({"user" : $scope.userData.currentSubject, "start" : $scope.unixRest, "end" : ($scope.unixRest + 86400000), "source" : src, "include_first" : true}).execute(function(resp)	{
					if(resp !== null && resp !== false && (typeof resp.returnedFBEE !== 'undefined' || typeof resp.returnedAE !== 'undefined'))	{

						// Fills the rawData array with data from the corresponding member of resp
						var rawData = [];
						if(src === 'Activity in Foreground')	{
							for(var i=0; i<resp.returnedFBEE.length; i++){
								rawData[i] = {};
     			   				rawData[i].time = resp.returnedFBEE[i].timestamp;
     			   				rawData[i].label = resp.result.returnedFBEE[i].packageName;
							}
							$scope.eventData.probability = ['no Data'];
						}
						else if(src === 'Kind of Movement')	{
							for(var i=0; i<resp.returnedAE.length; i++){
								rawData[i] = {};
								rawData[i].time = resp.result.returnedAE[i].timestamp;
								delete resp.returnedAE[i].id;
								delete resp.returnedAE[i].userID;
								delete resp.returnedAE[i].timestamp;
								delete resp.returnedAE[i].tilting;
								delete resp.returnedAE[i].onFoot;
							
								// Gets the event with the highest probability only
								var max = 'no max';
								var maxNum = 0;
								for(var name in resp.returnedAE[i]){
									var floatCache = parseFloat(resp.returnedAE[i][name]);
									if(maxNum <= floatCache)	{
										max = name;
										maxNum = floatCache;
									}
								}
     		   					rawData[i].label = max;
     		   					// Sets the probability for that event. Probabilities will NOT be refined.
     		   					if(typeof $scope.eventData.probability[max] === 'undefined')	{
     		   						$scope.eventData.probability[max] = [];
     		   					}
     		   					$scope.eventData.probability[max][rawData[i].time] = maxNum*100;     			   			
							}
						}
						/*Gets the ON/OFF events in the intervall we got data for. Start is not the beginning of the day,
						but the timestamp of the last event of the previous day to be able to deliver data for the interval before
						the first activity event off the chosen day.*/
						helper.provideOnOffTime($scope.userData.currentSubject, parseInt(rawData[0].time), parseInt($scope.unixRest + 86400000), true, function(providedTime)	{
							if(providedTime !== false)	{
								
								//Creates an array of timestamps defining the ON->OFF->ON->OFF->... rythm of the timeframe the data resides in
								var state = 'START';
								var onOffTimes = [{}];	
								for(var i=0; i<providedTime.length; i++){
									if(state !== providedTime[i].state){
										state = providedTime[i].state;
										onOffTimes.push(providedTime[i]);
									}
								}
								//Add ON tag at first index when necessary
								if(onOffTimes[1].state === 'ON'){
									onOffTimes.shift();
									onOffTimes[0].timestamp = parseInt(rawData[0].time)-1;
								}
								else	{
									onOffTimes[0] = {
										state: 'ON',
										timestamp: parseInt(rawData[0].time)-1
									} 
								}
								
								// Adds ON/OFF tag at the end of the day to create an interval between last ON tag and end of the day.
								onOffTimes.push({
									state: toggleOnOff(onOffTimes[onOffTimes.length-1].state),
									timestamp: $scope.unixRest + 86400000
								});
								
								function toggleOnOff(i)	{
									if(i === 'ON'){
										return 'OFF';
									}
									else if(i=== 'OFF')	{
										return 'ON';
									}
								}
								
								//Refines the data
								var refinedData = helper.refineData(rawData, onOffTimes, 'label');
								var startLength = refinedData.length; 
								
								$scope.eventData.probability['No Data Collected'] = [];
	
								//Expands the last bar so that the expanded parts can get cutted top
								var cuttedLastBarAt = -1;
								refinedData[refinedData.length-1].end = Math.min($scope.unixRest + 86400000-1, new Date());
								for(var k=0; k<onOffTimes.length; k++)	{
									if(onOffTimes[k].state === 'OFF' && refinedData[refinedData.length-1] < onOffTimes[k].timestamp && onOffTimes[k].timestamp < $scope.unixRest + 86400000)	{
										cuttedLastBarAr = k;
										refinedData[refinedData.length-1].end = onOffTimes[k].timestamp; 
										$scope.eventData.probability['No Data Collected'][onOffTimes[k].timestamp] = 100;
									}
								}
	
								for(var i=0; i<startLength; i++){

									// Removes data if it lies completely outside of the days timeframe
									if(refinedData[i].end < $scope.unixRest)	{
										refinedData.shift();
										if(0<refinedData.length)	{
											i--;
											startLength--;
										}
										else	{
											// Creates filler if all data has been removed
											createFiller();
										}
									}
									else if(refinedData[i].start < $scope.unixRest)	{
										if(src === 'Kind of Movement')	{
											$scope.eventData.probability[refinedData[i].label][$scope.unixRest+1] = $scope.eventData.probability[refinedData[i].label][parseInt(refinedData[i].start)];
											refinedData[i].opaque = $scope.eventData.probability[refinedData[i].label][$scope.unixRest+1];
										}
										refinedData[i].start = $scope.unixRest+1;
									}
									else	{
										//Collects the timestamps where the probability changes in the bar. While doing that, also sets the opacity of each bar
										var enteredFor = false;
										var cuttedAt = [];
										var hasProbability = false;
										for(var k=0; typeof $scope.eventData.probability[refinedData[i].label] !== 'undefined' && k<Object.keys($scope.eventData.probability[refinedData[i].label]).length; k++){
											hasProbability = true
											var time = parseInt(Object.keys($scope.eventData.probability[refinedData[i].label])[k]);
											if(time === refinedData[i].start)	{
												refinedData[i].opaque = $scope.eventData.probability[refinedData[i].label][time];
											}
											if(refinedData[i].start < time && time < refinedData[i].end)	{
												enteredFor = true;
												cuttedAt.push(time);
											}
										}
										
										var indexWhereEndIs = i;
										
										// Cuts the bar and pushes the new "part-bars" seperately onto the refinedData array. Adds probablitity for new bars too
										if(enteredFor){
											cuttedAt.push(refinedData[i].end);
											for(var k=0; k<cuttedAt.length;k++)	{
												if(k<cuttedAt.length-1)	{
													refinedData.push({
														label: refinedData[i].label,
														start: cuttedAt[k],
														end: cuttedAt[k+1],
														opaque: $scope.eventData.probability[refinedData[i].label][cuttedAt[k]]
													});
													$scope.eventData.probability[refinedData[i].label][cuttedAt[k]] = $scope.eventData.probability[refinedData[i].label][cuttedAt[k]];
												}
											}
											indexWhereEndIs = refinedData.length-1;
											refinedData[i].end = cuttedAt[0];
											
										}
										// Sets the opacity when there is no probability fetched
										if(!hasProbability)	{
											refinedData[i].opaque = 100;
										}
										if(i < startLength-1 && refinedData[indexWhereEndIs].end !== refinedData[i+1].start){
											refinedData.push({
												label: 'No Data Collected',
												start: refinedData[indexWhereEndIs].end,
												end: refinedData[i+1].start,
												opaque: 100
											});
											$scope.eventData.probability['No Data Collected'][refinedData[indexWhereEndIs].end] = 100;
										}
									}
								}
																
								// Adds "no data" bar when first data event is after the beginning of the day
								if(0<refinedData.length)	{								
									if(refinedData[0].start > $scope.unixRest+1){
										refinedData.push({
											label: 'No Data Collected',
											start: $scope.unixRest + 1,
											end: refinedData[0].start,
											opaque: 100
										});
										$scope.eventData.probability['No Data Collected'][$scope.unixRest+1] = 100;
									}
									//Adds last 'No Data' bar after cutting so that it doesn't gets cutted
									if(cuttedLastBarAt !== -1)	{
										refinedData.push({
											label: 'No Data Collected',
											start: onOffTimes[cutedLastBarAt].timestamp,
											end: $scope.unixRest + 86400000-1,
											opaque: 100
										});
									}
								}
															
								// Creates the data for the timeline
								for(var j=0; j<refinedData.length; j++)	{
									var expanded = false;
									var start = refinedData[j].start;
									var colorCode = 1;
									for(var k=0; k<$scope.eventData.eventStorage.length; k++)	{
										colorCode = 1;
										if(refinedData[j].label === $scope.eventData.eventStorage[k].label)	{
											if(refinedData[j].label === 'No Data Collected')	{
												colorCode = 2;
											}
											$scope.eventData.eventStorage[k].times.push({"starting_time": start, "ending_time": refinedData[j].end, "color_code": colorCode, "opaque": refinedData[j].opaque});
											expanded = true;
										}
									}
									if(!expanded)	{
										if(refinedData[j].label === 'No Data Collected')	{
											colorCode = 2;
										}
										$scope.eventData.eventStorage.push({label: refinedData[j].label, times: [{"starting_time": start, "ending_time": refinedData[j].end, "color_code": colorCode, "opaque": refinedData[j].opaque}]});	
									}
								}
							}
							else	{
								createFiller();
							}
							afterDataLoad();	
						});
					}
					else	{
						createFiller();
						afterDataLoad();	
					}
				});
			}
			else	{
				createFiller();
				afterDataLoad();
			}
		
			/**
			 * Creates a filler bar to be shown when data is not available or insufficient
			 */
			function createFiller()	{
				$scope.eventData.eventStorage.push({label: 'No Data Collected', times: []});	
				$scope.eventData.probability['No Data Collected'] = [];
				$scope.eventData.eventStorage[0].times.push({"starting_time": $scope.unixRest+1, "ending_time": $scope.unixRest + 86400000-1, "color_code": 2, "opaque": 100});	
				$scope.eventData.probability['No Data Collected'][$scope.unixRest] = 100;
			}
		
			/**
			 * Starts filtering and closes dialog if one had been opened before
			 */
			function afterDataLoad()	{
				$scope.stopper.renderingFinished = true;
				if($scope.stopper.directiveFinished)	{
					$scope.filterAccordingToSlider(src);	
				}
				if(!($scope.stopper.firstRendering) && typeof dialog !== 'undefined')	{
					dialog.remove();
				}
			}
		};
        
		/**
		 * Filters the barts according to the slider. This contains two main functionalities:
		 * 1. add bars to the cache which are in the sliders range in full
		 * 2. add cutted bars to the cache which are only partially in the sliders range
		 * Filtering has do be done twodimensional (Many events in storage (D1), many times in events(D2)).
		 */
		$scope.filterAccordingToSlider = function(src)	{	
			
			$scope.eventData.eventCache = [];
			var sliderStart = $scope.unixRest + $scope.slider.minValue*60000;
			var sliderEnd = $scope.unixRest + $scope.slider.maxValue*60000;
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
					else if(sliderStart <= timeframe.starting_time && timeframe.ending_time > sliderEnd)	{
						$scope.eventData.eventCache[i].times[j-skippedTimes] = {};
						$scope.eventData.eventCache[i].times[j-skippedTimes].starting_time = $scope.eventData.eventStorage[i].times[j].starting_time;
						$scope.eventData.eventCache[i].times[j-skippedTimes].ending_time = sliderEnd;
						$scope.eventData.eventCache[i].times[j-skippedTimes].color_code = $scope.eventData.eventStorage[i].times[j].color_code;
						$scope.eventData.eventCache[i].times[j-skippedTimes].opaque = $scope.eventData.eventStorage[i].times[j].opaque;
					}
					// Bars start is outside the range. Cut start
					else if(sliderStart > timeframe.starting_time && timeframe.ending_time <= sliderEnd)	{
						$scope.eventData.eventCache[i].times[j-skippedTimes] = {};
						$scope.eventData.eventCache[i].times[j-skippedTimes].starting_time = sliderStart;						  
						$scope.eventData.eventCache[i].times[j-skippedTimes].ending_time = $scope.eventData.eventStorage[i].times[j].ending_time;
						$scope.eventData.eventCache[i].times[j-skippedTimes].color_code = $scope.eventData.eventStorage[i].times[j].color_code;
						$scope.eventData.eventCache[i].times[j-skippedTimes].opaque = $scope.eventData.eventStorage[i].times[j].opaque;
					}
					// Bars start and end are outside the range. Cut on both ends
					else if(sliderStart > timeframe.starting_time && timeframe.ending_time > sliderEnd)	{
						$scope.eventData.eventCache[i].times[j-skippedTimes] = {};
						$scope.eventData.eventCache[i].times[j-skippedTimes].starting_time = sliderStart;						  
						$scope.eventData.eventCache[i].times[j-skippedTimes].ending_time = sliderEnd;						  
						$scope.eventData.eventCache[i].times[j-skippedTimes].color_code = $scope.eventData.eventStorage[i].times[j].color_code;
						$scope.eventData.eventCache[i].times[j-skippedTimes].opaque = $scope.eventData.eventStorage[i].times[j].opaque;
					}
					// Bars is in range. Copy from storage to cache
					else if(sliderStart <= timeframe.starting_time && timeframe.ending_time <= sliderEnd)	{
						$scope.eventData.eventCache[i].times[j-skippedTimes] = {};
						$scope.eventData.eventCache[i].times[j-skippedTimes].starting_time = $scope.eventData.eventStorage[i].times[j].starting_time;
						$scope.eventData.eventCache[i].times[j-skippedTimes].ending_time = $scope.eventData.eventStorage[i].times[j].ending_time;
						$scope.eventData.eventCache[i].times[j-skippedTimes].color_code = $scope.eventData.eventStorage[i].times[j].color_code;			  				  	
						$scope.eventData.eventCache[i].times[j-skippedTimes].opaque = $scope.eventData.eventStorage[i].times[j].opaque;
						
					}
				}
			}
			$scope.callback(src);
		};	
	
        
        /**
         * Renders the timeline
         */
        $scope.callback = function(src)	{
        	
        	var callbackMethod;
        	if(src === 'Activity in Foreground')	{
        		callbackMethod = function (d, i, datum) {
					$scope.$apply(function()	{
						$scope.barInfo.label = datum.label;
						$scope.barInfo.start = helper.getDateFromUnix(d.starting_time);
						$scope.barInfo.end = helper.getDateFromUnix(d.ending_time);
						$scope.barInfo.probability = 0;
					});
				};
        	}
        	else if(src === 'Kind of Movement')	{
        		callbackMethod = function (d, i, datum) {
					$scope.$apply(function()	{
						
						var rightTime = -1;
						var difference = -1;
						/* Bars start change when the range of the timeline changes. Therefore, the nearest, prior probability is chosen for the bar
						if none matches the bars start timestamp */
						for(var estimation in $scope.eventData.probability[datum.label]){
							if(estimation <= d.starting_time && ((difference !== -1 && d.starting_time - estimation < difference) || difference === -1))	{
								difference = d.starting_time - estimation;
								rightTime = estimation;
							}
						}
						$scope.barInfo.label = '';
						$scope.barInfo.start = helper.getDateFromUnix(d.starting_time+'');
						$scope.barInfo.end = helper.getDateFromUnix(d.ending_time+'');
						$scope.barInfo.probability = $scope.eventData.probability[datum.label][rightTime+''] + '%';
					});
				};
        	}
        	
			if($scope.stopper.firstRendering){
				document.getElementById('timelineloadspinner').style.display="none";
				document.getElementById('timelineloadmessage').style.display="none";					
				$scope.stopper.firstRendering = false;
				$scope.$apply(function()	{
					$scope.stopper.showPage = true;
				});
			}
			
			$timeout(function()	{
				$scope.$apply(function(){
					
					function componentToHex(c) {
					    var hex = c.toString(16);
					    return hex.length == 1 ? "0" + hex : hex;
					}

					function rgbToHex(r, g, b) {
					    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
					}
					
					d3.select("svg").remove();
					var arrayNum = [];
					var arrayColors = [];
					var arrayOpaque = [];
					for(var i=1; i<101; i++)	{
						arrayOpaque[i] = i/100;
					}
					arrayNum[1] = 1;
					arrayColors[1] = rgbToHex(0,0,255);
					arrayNum[2] = 2;
					arrayColors[2] = rgbToHex(150,150,150);
					var colorScale = d3.scale.ordinal().range(arrayColors).domain(arrayNum);
					$scope.chart = d3.timeline().stack().opaque(arrayOpaque).colors(colorScale).colorProperty('color_code').changerange($scope.slider.minValue*60*1000 + $scope.unixRest, $scope.slider.maxValue*60*1000 + $scope.unixRest).hover(callbackMethod).mouseout(
						function(d,i,datum)	{
							$scope.$apply(function()	{
								
								$scope.barInfo = {
									label: "No bar chosen",
									start: "No bar chosen",
									end: "No bar chosen",
									probability:'No probability to show'
								};
							});
						}
					);
					if(!$scope.stopper.setScrollListener)	{
						/**
						 * Manipulates time slider on scrolling. One scroll tick decreases the timeframe
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
			            	$scope.filterAccordingToSlider($scope.eventData.source);        	
						});
					}
					$scope.r = d3.select("#timeline1").append("svg").attr("width", 1000) .datum($scope.eventData.eventCache).call($scope.chart);
				});
			}, 0);
        };
		$scope = helper.datePickerSetup($scope);
    }
  }
);