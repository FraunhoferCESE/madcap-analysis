/**
 * This module provides the timeline view for the master view of v2. It shows a timeline from either the ActivityEntry or ForegroundBAckgroundEventEntry probes.
 * Data will be queried by user and day and can be filtered through a slider. Main functionality is the calculation if the of the bars
 * from pure information timestamps. ON/OFF events from the DataCollectionEntry probe are included into the calculation. 
 * 
 * IMPORTANT!: This module is intended to be used only together with the master
 * module and the control_unit_v2 module. It will NOT work on it's own! For an
 * independently running but smaller version of the map view use the user-map
 * module in the user_position_map component file. */
angular.
module('timelineV2').
  component('timelineV2', {
    templateUrl: 'html/timeline_v2_view.template.html',
    controller: function TimelineController($scope, $timeout, helper, allowed_directive_service, loading_overlay) {
    	
    	"use strict"; 	
    	
		// Access to the controlling variables of the control unit component
    	$scope.controlScope = $scope.$parent.controlControl.childScope;
    	
    	$scope.processTickets = [];
    	$scope.noData = false;
    	    	
    	// Various flags to synchronize the multiple callbacks during initialization
    	$scope.stopper = {
    	    showPage: false,
    		directiveFinished: false,
    		renderingfinished: false,
    		firstRendering: true,
    		isApplicationShow: true,
    		isActivityShow: false
    	};
    	
    	// Storage for the event data. eventStorage contains all loaded data, eventCache only the currently shown
    	$scope.eventData = {
    		eventStorage: [],
    		eventCache: [],
    		probability: []
    	};
    	
		// The data cache. content contains the saved content, meta holds the identifier. Size can be set to any number
    	$scope.cache = {
    		content: {
    			storage: [],
    			probabilities: []
    		},
    		meta: [],
    		pointer: 0,
    		size: 5
    	};
    	
    	/* Information about the bars shown right besides the timeline. Shows the information of the bar
    	the mouse last hovered over*/
    	$scope.barInfo = {
    		label: "No activity chosen",
    		start: "No activity chosen",
    		end: "No activity chosen",
    		probability: 'No probability to show'
    	};

    	
    	// Listener for the datepicker
    	$scope.$watch('controlScope.dateData.unixRest', function(newValue) { 
			if($scope.$parent.viewControl.timeline.visible && typeof newValue !== 'undefined' && newValue !== 'Please select a date ...')	{
				$scope.renderTimeline();
			}
	    });
    	
    	// Listener for the userpicker
    	$scope.$watch('controlScope.userData.currentSubject', function(newValue) { 
			if($scope.$parent.viewControl.timeline.visible)	{
				$scope.renderTimeline();
			}
	    });
    	
    	// Listener for the timeline refresh button
    	$scope.$watch('controlScope.refreshOrders.refreshTimeline', function(newValue) { 
			if($scope.controlScope.refreshOrders.refreshTimeline === true)	{
				$scope.renderTimeline();
				$scope.controlScope.refreshOrders.refreshTimeline = false;
			}
	    });
    	
    	// Listener for the timeline csv download button
    	$scope.$watch('controlScope.control.timelineCsvTrigger', function(newValue) { 
			if($scope.controlScope.control.timelineCsvTrigger)	{
				$scope.controlScope.control.timelineCsvTrigger = false;
				$scope.downloadTimelineCsv();
			}
	    });
    	
    	// Listener for the timeline csv download button
    	$scope.$parent.$watch('viewControl.timeline.expanded', function(newValue) { 
			if($scope.$parent.viewControl.timeline.expanded)	{
				$scope.renderTimeline();
			}
	    });

		//Listener for the variable that determines if the view gets shown or not
    	$scope.$watch('controlScope.sourceData.timelineSource', function(value)	{
    		if($scope.$parent.viewControl.timeline.visible && value === 'Activity in Foreground')	{
				$scope.stopper.isApplicationShow = true;
				$scope.stopper.isActivityShow = false; 
			}
			else if($scope.$parent.viewControl.timeline.visible && value === 'Kind of Movement')	{
				$scope.stopper.isApplicationShow = false;
				$scope.stopper.isActivityShow = true; 
			}
			$scope.renderTimeline();
		});
    	
		//Listener for the slider
		$scope.$watchGroup(['controlScope.slider.minValue','controlScope.slider.maxValue'], function(value)	{
	    	if(!($scope.stopper.firstRendering))	{
	    		$scope.filterAccordingToSlider($scope.controlScope.sourceData.timelineSource);        	
	    	}
	    });
		
    	// passes the callback to the permission check directive
    	allowed_directive_service.passDirectiveCallback(function()	{
      			
			$scope.stopper.directiveFinished = true;
			if($scope.stopper.renderingFinished)	{
            	$scope.filterAccordingToSlider($scope.controlScope.sourceData.timelineSource);	
      		}
		});

    	
		/**
		 * Renders the timeline. Loads the events and filters them by bundling multiple timstamps
		 *  for the same event into one timeframe. Breaks down the bars when there are different probabilities
		 *  or ON/OFF events inside them
		 */
		$scope.renderTimeline = function()	{

			var time = new Date().getTime();
			var source = $scope.controlScope.sourceData.timelineSource;
			var user = $scope.controlScope.userData.currentSubject;
			var date = $scope.controlScope.dateData.unixRest;
			$scope.processTickets[source+user+date+""] = time+'';
			
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
			else if($scope.controlScope.eventTrigger === 'timelineSource')	{
				cacheSource = $scope.controlScope.sourceData.lastTimelineSource;
			}
			
			//Chaches the data if there is data to cache
			if(cacheUser !== '' && !($scope.noData) && $scope.controlScope.eventTrigger !== 'timelineRefresh')	{
				$scope.cache = helper.cacheData($scope.cache, {
					storage: $scope.eventData.eventStorage,
					probabilities: $scope.eventData.probability
				}, cacheSource + cacheDate + cacheUser);
			}
			else if($scope.controlScope.eventTrigger === 'timelineRefresh')	{
				var index = $scope.cache.meta.indexOf( cacheSource + cacheDate + cacheUser);
				delete $scope.cache.content.storage[index];
				delete $scope.cache.content.probabilities[index];
				delete $scope.cache.meta[index];
			}
			
			//Resets information
			$scope.eventData.eventStorage = [];
			$scope.eventData.eventCache = [];
			var src = $scope.controlScope.sourceData.timelineSource;

			$scope.noData = true;
			
			if(!($scope.stopper.firstRendering) && (typeof $scope.dialog === 'undefined' || $scope.dialog[0].parentElement === null))	{
				$scope.dialog = loading_overlay.createLoadOverlay("Loading data ...", this, "timeline_content");
			}
			
			if($scope.controlScope.userData.currentSubject !== '')	{
				
				var cachedAt = -1;
				
				// Checks if the key is in the cache
				for(var j=0; cachedAt === -1 && j< $scope.cache.size; j++){
					if($scope.controlScope.sourceData.timelineSource + date + $scope.controlScope.userData.currentSubject === $scope.cache.meta[j])	{
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
					
					if(maxTicket === parseInt($scope.processTickets[source + user + date]))	{
						$scope.eventData.eventStorage = $scope.cache.content.storage[cachedAt];
						$scope.eventData.probability = $scope.cache.content.probabilities[cachedAt];
						$scope.processTickets = {};
						afterDataLoad();
					}
				}
				else	{
					//Loads the data to display in the timeline
					gapi.client.analysisEndpoint.getActivityData({"user" : $scope.controlScope.userData.currentSubject, "start" : date, "end" : (date + 86400000), "source" : src, "include_first" : true}).execute(function(resp)	{
						if(resp !== null && resp !== false && (typeof resp.returnedFBEE !== 'undefined' || typeof resp.returnedAE !== 'undefined'))	{
	

							var mock = {
								probability: [],
								eventStorage: []
							};
							
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
	     		   					if(typeof mock.probability[max] === 'undefined')	{
	     		   						mock.probability[max] = [];
	     		   					}
	     		   					mock.probability[max][rawData[i].time] = maxNum*100;     			   			
								}
							}
							
							/*Gets the ON/OFF events in the interval we got data for. Start is not the beginning of the day,
							but the timestamp of the last event of the previous day to be able to deliver data for the interval before
							the first activity event off the chosen day.*/
							helper.provideOnOffTime($scope.controlScope.userData.currentSubject, parseInt(rawData[0].time), parseInt(date + 86400000), function(onOffTimes)	{
								if(onOffTimes !== false)	{
									
									//Refines the data
									var refinedData = helper.refineData(rawData, onOffTimes, 'label');
									var startLength = refinedData.length; 
										
									mock.probability['Data collection turned off'] = [];
									mock.probability['Unexpected collection interuption'] = [];
									mock.probability['No safe assumption possible'] = [];
			
									//Expands the last bar so that the expanded parts can get cutted top
									var cuttedLastBarAt = -1;
									var oldEnd = refinedData[refinedData.length-1].end;
									var endOrigin = refinedData[refinedData.length-1].origin;
									refinedData[refinedData.length-1].end = Math.min(date + 86400000-2, new Date());
									for(var k=0; k<onOffTimes.length; k++)	{
										onOffTimes[k].timestamp = parseInt(onOffTimes[k].timestamp);
										if(onOffTimes[k].state.substring(0,3) === 'OFF' && oldEnd < onOffTimes[k].timestamp && onOffTimes[k].timestamp < refinedData[refinedData.length-1].end)	{
											cuttedLastBarAt = k;
											refinedData[refinedData.length-1].end = onOffTimes[k].timestamp; 
											if(onOffTimes[k].state === 'OFF INTENT')	{
												mock.probability['Data collection turned off'][onOffTimes[k].timestamp] = 100;
											}
											else if(onOffTimes[k].state === 'OFF CRASH')
											mock.probability['Unexpected collection interuption'][onOffTimes[k].timestamp] = 100;
										}
									}
									
									//Main part
									for(var i=0; i<startLength; i++){
										
										var outOfRange = false;
										var shifter = {};
										// Removes data if it lies completely outside of the days timeframe
										if(refinedData[i].end < date)	{
											var shifter = refinedData.shift();
											outOfRange = true;
											if(0<refinedData.length)	{
												i--;
												startLength--;
											}
										}
										else if(refinedData[i].start < date)	{
											if(src === 'Kind of Movement')	{
												mock.probability[refinedData[i].label][date+1] = mock.probability[refinedData[i].label][parseInt(refinedData[i].start)];
												refinedData[i].opaque = mock.probability[refinedData[i].label][date+1];
											}
											refinedData[i].start = $scope.controlScope.dateData.unixRest+1;
										}
										if(!outOfRange)	{
											//Collects the timestamps where the probability changes in the bar. While doing that, also sets the opacity of each bar
											var enteredFor = false;
											var cuttedAt = [];
											var hasProbability = false;
											
											for(var k=0; typeof mock.probability[refinedData[i].label] !== 'undefined' && k<Object.keys(mock.probability[refinedData[i].label]).length; k++){
												hasProbability = true
												var time = parseInt(Object.keys(mock.probability[refinedData[i].label])[k]);
												if(time === refinedData[i].start)	{
													refinedData[i].opaque = mock.probability[refinedData[i].label][time];
												}
												if(refinedData[i].start < time && time < refinedData[i].end)	{
													enteredFor = true;
													cuttedAt.push(time);
												}
											}
											
											var indexWhereEndIs = i;
												
											// Cuts the bar and pushes the new "part-bars" separately onto the refinedData array. Adds probablitity for new bars too
											if(enteredFor){
												cuttedAt.push(refinedData[i].end);
												for(var k=0; k<cuttedAt.length;k++)	{
													if(k<cuttedAt.length-1)	{
														refinedData.push({
															label: refinedData[i].label,
															start: cuttedAt[k],
															end: cuttedAt[k+1],
															origin: refinedData[i].origin,
															holes: refinedData[i].holes,
															opaque: mock.probability[refinedData[i].label][cuttedAt[k]]
														});
														mock.probability[refinedData[i].label][cuttedAt[k]] = mock.probability[refinedData[i].label][cuttedAt[k]];
													}
												}
												indexWhereEndIs = refinedData.length-1;
												refinedData[i].end = cuttedAt[0];
											}
											// Sets the opacity when there is no probability fetched
											if(!hasProbability)	{
												refinedData[i].opaque = 100;
											}
											
											if((i < startLength-1 && refinedData[indexWhereEndIs].end !== refinedData[i+1].start) || i === startLength-1 && refinedData[indexWhereEndIs].end !== Math.min($scope.controlScope.dateData.unixRest + 86400000-2, new Date())){
												//Creates bars for the holes provided by the refine-method.
												var label = 'Data collection turned off';
												if(refinedData[indexWhereEndIs].origin === 'CRASH')	{
													label = 'Unexpected collection interuption';
												}
												for(var j=0; j<refinedData[indexWhereEndIs].holes.length; j++)	{	
													
													var barEnd = -1;
													if(j+1 < refinedData[indexWhereEndIs].holes.length){
														barEnd = refinedData[indexWhereEndIs].holes[j+1].start;
													}
													else if(i+1 < startLength)	{
														barEnd = refinedData[i+1].start;
													}
													else	{
														barEnd = Math.min($scope.controlScope.dateData.unixRest + 86400000-2, new Date());
													}
													refinedData.push({
														label: label,
														start: refinedData[indexWhereEndIs].holes[j].start,
														end: refinedData[indexWhereEndIs].holes[j].end,
														opaque: 100
													});
													mock.probability[label][refinedData[indexWhereEndIs].start] = 100;
													refinedData.push({
														label: "No safe assumption possible",
														start: refinedData[indexWhereEndIs].holes[j].end,
														end: barEnd,
														opaque: 100
													});
													mock.probability["No safe assumption possible"][refinedData[indexWhereEndIs].end] = 100;
												}
											}
										}
									}
										
									var topBorder = onOffTimes[onOffTimes.length-1].timestamp;
									if(0<refinedData.length)	{									
										topBorder = refinedData[0].start;
									}
										
									// Adds "no data" bar when first data event is after the beginning of the day
									if(topBorder > date+1){
										var startHoles = [];
										var startHoleStart = 0;
										var startHoleIntent = '';
										var firstOccurance = true;
										for(var m=0; m < onOffTimes.length && onOffTimes[m].timestamp <= topBorder; m++)	{
											if(onOffTimes[m].timestamp >= date+1)	{
												if(firstOccurance)	{
													refinedData.push({
														label: "No safe assumption possible",
														start: date+1,
														end: onOffTimes[m].timestamp,
														opaque: 100
													});
													mock.probability["No safe assumption possible"][date+1] = 100;
													firstOccurance = false;
												}
												
												if( startHoleStart === 0 && onOffTimes[m].state.substring(0,3) === 'OFF')	{
													startHoleStart = onOffTimes[m].timestamp;
													startHoleIntent = onOffTimes[m].state;
												}
												else if(startHoleStart !== 0 && onOffTimes[m].state.substring(0,2) === 'ON')	{
													if(startHoleIntent = "OFF CRASH")	{
														startHoleIntent = 'Unexpected collection interuption';
													}
													else if(startHoleIntent = "OFF CRASH")	{
														startHoleIntent = 'Data collection turned off';
													}	
													
													var barEnd = topBorder;
													if(m+1 < onOffTimes.length && onOffTimes[m+1].timestamp <= topBorder){
														barEnd =  onOffTimes[m+1].timestamp;
													}
													
													refinedData.push({
														label: startHoleIntent,
														start: startHoleStart,
														end: onOffTimes[m].timestamp,
														opaque: 100
													});
													mock.probability[startHoleIntent][startHoleStart] = 100;
													
													refinedData.push({
														label: "No safe assumption possible",
														start: onOffTimes[m].timestamp,
														end: barEnd,
														opaque: 100
													});
													mock.probability["No safe assumption possible"][onOffTimes[m].timestamp] = 100;
													
													startHoleStart = 0;
													startHoleIntent = '';
												}
											}
										}
										if(firstOccurance)	{
											refinedData.push({
												label: "No safe assumption possible",
												start: date+1,
												end: refinedData[0].start,
												opaque: 100
											});
											mock.probability["No safe assumption possible"][date+1] = 100;
											firstOccurance = false;
										}
									}
									

									var maxTicket = 0;
									var keys = Object.keys($scope.processTickets);
									for(var k=0; k<keys.length; k++)	{
										if(maxTicket < parseInt($scope.processTickets[keys[k]]))	{
											maxTicket = parseInt($scope.processTickets[keys[k]]);
										}
									}
									
									if(maxTicket === parseInt($scope.processTickets[source + user + date]))	{
									
										// Creates the data for the timeline
										for(var j=0; j<refinedData.length; j++)	{
											if(refinedData[j].start < refinedData[j].end){
												var expanded = false;
												var start = refinedData[j].start;
												var colorCode = 1;
												for(var k=0; k<$scope.eventData.eventStorage.length; k++)	{
													colorCode = 1;
													if(refinedData[j].label === $scope.eventData.eventStorage[k].label)	{
														if(refinedData[j].label === 'Data collection turned off')	{
															colorCode = 2;
														}
														else if(refinedData[j].label === 'Unexpected collection interuption')	{
															colorCode = 3;
														}
														else if(refinedData[j].label === 'No safe assumption possible')	{
															colorCode = 4;
														}
														
														$scope.eventData.eventStorage[k].times.push({"starting_time": start, "ending_time": refinedData[j].end, "color_code": colorCode, "opaque": refinedData[j].opaque});
														expanded = true;
													}
												}
													if(!expanded)	{
														if(refinedData[j].label === 'Data collection turned off')	{
															colorCode = 2;
														}
														else if(refinedData[j].label === 'Unexpected collection interuption')	{
															colorCode = 3;
														}
														else if(refinedData[j].label === 'No safe assumption possible')	{
															colorCode = 4;
														}
														$scope.eventData.eventStorage.push({label: refinedData[j].label, times: [{"starting_time": start, "ending_time": refinedData[j].end, "color_code": colorCode, "opaque": refinedData[j].opaque}]});	
													}
												}
											}
											$scope.eventData.probability = mock.probability;
											$scope.processTickets = {};
											$scope.noData = false;
											afterDataLoad();
										}
									}
									else	{
										createFiller();
									}
								});
							}
							else	{
								createFiller();
							}
						});
					}
				}
				else	{
					createFiller();
				}		
			/**
			 * Creates a filler bar to be shown when data is not available or insufficient
			 */
			function createFiller()	{
				var maxTicket = 0;
				var keys = Object.keys($scope.processTickets);
				for(var k=0; k<keys.length; k++)	{
					if(maxTicket < parseInt($scope.processTickets[keys[k]]))	{
						maxTicket = parseInt($scope.processTickets[keys[k]]);
					}
				}

				if(maxTicket === parseInt($scope.processTickets[source + user + date]))	{							
					$scope.eventData.eventStorage.push({label: 'Data collection turned off', times: []});	
					$scope.eventData.probability['Data collection turned off'] = [];
					$scope.eventData.probability['Unexpected collection disruption'] = [];
					$scope.eventData.eventStorage[0].times.push({"starting_time": $scope.controlScope.dateData.unixRest+1, "ending_time": $scope.controlScope.dateData.unixRest + 86400000-1, "color_code": 2, "opaque": 100});	
					$scope.eventData.probability['Data collection turned off'][$scope.controlScope.dateData.unixRest] = 100;
					$scope.processTickets = {};
					afterDataLoad();	
				}
			}
		
			/**
			 * Starts filtering and closes $scope.dialog if one had been opened before
			 */
			function afterDataLoad()	{
				$scope.stopper.renderingFinished = true;
				if($scope.stopper.directiveFinished)	{
					$scope.filterAccordingToSlider(src);	
				}
				if(!($scope.stopper.firstRendering) && typeof $scope.dialog !== 'undefined' && $scope.dialog[0].parentElement !== null)	{
					$scope.dialog.remove();
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
			var sliderStart = $scope.controlScope.dateData.unixRest + $scope.controlScope.slider.minValue*60000;
			var sliderEnd = $scope.controlScope.dateData.unixRest + $scope.controlScope.slider.maxValue*60000;
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
				$scope.stopper.firstRendering = false;
				$scope.onTimelineResize = function()	{
					var container = document.getElementById("timeline_container");
					if($scope.$parent.viewControl.timeline.visible && container.offsetWidth - parseInt(container.style.paddingLeft) - parseInt(container.style.paddingRight) !== $scope.r[0][0].offsetWidth){
						$scope.renderOnScreen();	
					}
				};
				$(window).on('resize', $scope.onTimelineResize);
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
					arrayNum[3] = 3;
					arrayColors[3] = rgbToHex(0,0,0);
					arrayNum[4] = 4;
					arrayColors[4] = rgbToHex(255,0,0);
					
					var colorScale = d3.scale.ordinal().range(arrayColors).domain(arrayNum);
					
					$scope.renderOnScreen = function()	{
						d3.select("svg").remove();
						$scope.chart = d3.timeline().stack().opaque(arrayOpaque).colors(colorScale).colorProperty('color_code').changerange($scope.controlScope.slider.minValue*60*1000 + $scope.controlScope.dateData.unixRest, $scope.controlScope.slider.maxValue*60*1000 + $scope.controlScope.dateData.unixRest).hover(callbackMethod).scroll(function(event){
							if(event.deltaY < 0)	{
								if($scope.controlScope.slider.minValue < $scope.controlScope.slider.maxValue+5)	{
									$scope.controlScope.slider.maxValue = $scope.controlScope.slider.maxValue - 5;
								}
								else{
									$scope.controlScope.slider.maxValue = $scope.controlScope.slider.minValue + 1;
							}
								if($scope.controlScope.slider.minValue-5 < $scope.controlScope.slider.maxValue)	{
									$scope.controlScope.slider.minValue = $scope.controlScope.slider.minValue + 5;
								}
								else	{
									$scope.controlScope.slider.minValue = $scope.controlScope.slider.maxValue - 1;
								}
							}
							else if(event.deltaY > 0)	{
								if(4 < $scope.controlScope.slider.minValue){
									$scope.controlScope.slider.minValue = $scope.controlScope.slider.minValue - 5;
							}
								else	{
									$scope.controlScope.slider.minValue = 0;
								}
								if($scope.controlScope.slider.maxValue<1435)	{
									$scope.controlScope.slider.maxValue = $scope.controlScope.slider.maxValue + 5;
								}
								else	{
									$scope.controlScope.slider.maxValue = 1439;
								}
							}
				           	$scope.filterAccordingToSlider($scope.controlScope.sourceData.timelineSource);        	
						}).mouseout(
							function(d,i,datum)	{
								$scope.$apply(function()	{
									$scope.barInfo = {
										label: "No activity chosen",
										start: "No activity chosen",
										end: "No activity chosen",
										probability:'No probability to show'
									};
								});
							}
						);
						/**
						 * Manipulates time slider on scrolling. One scroll tick decreases the timeframe
						 * by 5 Minutes on each side of the slider
						 */
						var container = document.getElementById("timeline_container");
						$scope.r = d3.select("#timeline1").append("svg").attr("id","timelineSVG").attr("preserveAspectRatio","none").attr("width", container.offsetWidth  - parseInt(container.style.paddingLeft) - parseInt(container.style.paddingRight)).datum($scope.eventData.eventCache).call($scope.chart);
					}
					
					$scope.renderOnScreen();	
					
				});
			}, 0);
        };
        
        $scope.downloadTimelineCsv = function()	{
        	var subject = $scope.controlScope.userData.currentSubject;
			var date = new Date($scope.controlScope.dateData.unixRest);
			var day = date.getDate();
			var month = 1 + date.getMonth();
			if(day<10)	{
				day = '0' + day;
			}
			if(month<10)	{
				month = '0' + month;
			}
			var row = 'data:text/csv;charset=utf-8,' + '"User","Start time","End time","Activity"\r\n';
			for(var i=$scope.eventData.eventStorage.length-1; 0<=i; i--)	{
				for(var j=0; j<$scope.eventData.eventStorage[i].times.length; j++)	{
					row = row + '"' + subject + '",' + $scope.eventData.eventStorage[i].times[j].starting_time + ',' + $scope.eventData.eventStorage[i].times[j].ending_time + "," + $scope.eventData.eventStorage[i].label + '\r\n';
				}
			}
			var encodedUri = encodeURI(row);
			var link = document.createElement("a");
			link.setAttribute("href", encodedUri);
			link.setAttribute("download", "timeline_export_" + subject + "_" + month + "_" + day + "_" + date.getFullYear() + ".csv");
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
        };
    }
  }
);