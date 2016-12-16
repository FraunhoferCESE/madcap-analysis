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
    		probability: []
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
				$scope.unixRest = newValue.getTime();
				$scope.renderTimeline();
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
			$scope.eventData.eventStorage = [];
			$scope.eventData.eventCache = [];
			
			if(!($scope.stopper.firstRendering))	{
				var dialog = loading_overlay.createLoadOverlay("Loading data ...", this);
			}
			
			helper.provideOnOffTime($scope.userData.currentSubject, $scope.unixRest, $scope.unixRest + 86400000);
			var src = $scope.eventData.source;
			gapi.client.analysisEndpoint.getActivityData({"user" : $scope.userData.currentSubject, "start" : $scope.unixRest, "end" : ($scope.unixRest + 86400000), "source" : src}).execute(function(resp)	{
				if(resp !== null && resp !== false && (typeof resp.returnedFBEE !== 'undefined' || typeof resp.returnedAE !== 'undefined'))	{
					var rawData = [];
					if(src === 'Activity in Foreground')	{
						for(var i=0; i<resp.returnedFBEE.length; i++){
							rawData[i] = {};
     			   			rawData[i].time = resp.returnedFBEE[i].timestamp;
     			   			rawData[i].block = resp.result.returnedFBEE[i].packageName;
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
							
							var max = 'no max';
							var maxNum = 0;
							for(var name in resp.returnedAE[i]){
								var floatCache = parseFloat(resp.returnedAE[i][name]);
								if(maxNum <= floatCache)	{
									max = name;
									maxNum = floatCache;
								}
							}
     			   			rawData[i].block = max;
     			   			if(typeof $scope.eventData.probability[max] === 'undefined')	{
         			   			$scope.eventData.probability[max] = {};
         			   			$scope.eventData.probability[max].time = [];
         			   			$scope.eventData.probability[max].probability = [];
     			   			}
     			   			$scope.eventData.probability[max].time.push(rawData[i].time);     			   			
     			   			$scope.eventData.probability[max].probability.push(maxNum*100);     			   			
						}
					}
					var refinedData = helper.refineData(rawData);
					var newJ = 0;
					var foundIndex = false;
					var providedTime = helper.getTime();
					var startLength = refinedData.length; 
					for(var i=0; i<startLength; i++){
						refinedData[i].color_code = -2;
						if(i < startLength-1)	{
							for(var j=newJ; j<providedTime.length && providedTime[j].timestamp < refinedData[i+1].start; j++)	{
								if(refinedData[i].end < providedTime[j].timestamp && providedTime[j].state === 'OFF')	{
									if(typeof $scope.eventData.eventStorage[0] === 'undefined')	{
										$scope.eventData.eventStorage.push({label: 'No Data Collected', times: []});	
										$scope.eventData.probability['No Data Collected'] = {};
										$scope.eventData.probability['No Data Collected'].time = [];
										$scope.eventData.probability['No Data Collected'].probability = [];
									}
									refinedData[i].end = providedTime[j].timestamp;
									$scope.eventData.eventStorage[0].times.push({"starting_time": refinedData[i].end, "ending_time": refinedData[i+1].start, "color_code": 101});	
									$scope.eventData.probability['No Data Collected'].time.push(refinedData[i].end);
									$scope.eventData.probability['No Data Collected'].probability.push(100);
									foundIndex = true;
									newJ = j;
								}
							}
							if(!foundIndex)	{
								refinedData[i].end = refinedData[i+1].start;
							}
						}
						else	{	
							for(var j=newJ; j<providedTime.length; j++)	{
								if(refinedData[i].end < providedTime[j].timestamp && providedTime[j].state === 'OFF')	{
									if(typeof $scope.eventData.eventStorage[0] === 'undefined')	{
										$scope.eventData.eventStorage.push({label: 'No Data Collected', times: []});	
										$scope.eventData.probability['No Data Collected'] = {};
										$scope.eventData.probability['No Data Collected'].time = [];
										$scope.eventData.probability['No Data Collected'].probability = [];
									}
									refinedData[i].end = providedTime[j].timestamp;
									$scope.eventData.eventStorage[0].times.push({"starting_time": refinedData[i].end, "ending_time": $scope.unixRest + 86400000, "color_code": 101});	
									$scope.eventData.probability['No Data Collected'].time.push(refinedData[i].end);
									$scope.eventData.probability['No Data Collected'].probability.push(100);
									foundIndex = true;
								}
							}
							if(!foundIndex)	{
								refinedData[i].end = $scope.unixRest + 86400000;
							}
						}
						
						foundIndex = false;
						
						var thisProbs = $scope.eventData.probability[refinedData[i].block];
						var enteredFor = false;
						for(var k=0; typeof thisProbs !== 'undefined' && k<thisProbs.time.length; k++){
							enteredFor = true;
							var time = thisProbs.time[k];
							if(time === refinedData[i].start)	{
								refinedData[i].color_code = thisProbs.probability[k];
							}
							else if(refinedData[i].start < time && time < refinedData[i].end)	{
								refinedData.push({
									block: refinedData[i].block,
									start: time,
									end: refinedData[i].end,
									color_code: thisProbs.probability[k]
								});
								refinedData[i].end = time;
							}
							else	{
								for(var l=startLength; l<refinedData.length; l++)	{
									if(refinedData[l].start < time && time < refinedData[l].end)	{
										refinedData.push({
											block: refinedData[l].block,
											start: time,
											end: refinedData[l].end,
											color_code: thisProbs.probability[k]
										});
										refinedData[l].end = time;
									}	
								}
							}
						}
						if(!enteredFor)	{
							refinedData[i].color_code = 50
						}
					}
					
					// Creates the data for the timeline
					for(var j=0; j<refinedData.length; j++)	{
						var expanded = false;
						for(var k=0; k<$scope.eventData.eventStorage.length; k++)	{
							if(refinedData[j].block === $scope.eventData.eventStorage[k].label)	{
								$scope.eventData.eventStorage[k].times.push({"starting_time": refinedData[j].start, "ending_time": refinedData[j].end, "color_code": refinedData[j].color_code});
								expanded = true;
							}
						}
						if(!expanded)	{
							$scope.eventData.eventStorage.push({label: refinedData[j].block, times: [{"starting_time": refinedData[j].start, "ending_time": refinedData[j].end, "color_code": refinedData[j].color_code}]});	
						}
					}
				}
				
				$scope.stopper.renderingFinished = true;
				if($scope.stopper.directiveFinished)	{
      				$scope.filterAccordingToSlider(src);	
      			}
				if(!($scope.stopper.firstRendering))	{
					dialog.close();
				}
			});
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
			  			  else if(sliderStart < timeframe.starting_time && timeframe.ending_time > sliderEnd)	{
			  				$scope.eventData.eventCache[i].times[j-skippedTimes] = {};
			  				  $scope.eventData.eventCache[i].times[j-skippedTimes].starting_time = $scope.eventData.eventStorage[i].times[j].starting_time;
			  				  $scope.eventData.eventCache[i].times[j-skippedTimes].ending_time = sliderEnd;
			  				  $scope.eventData.eventCache[i].times[j-skippedTimes].color_code = $scope.eventData.eventStorage[i].times[j].color_code;
			  			  }
			  			  // Bars start is outside the range. Cut start
			  			  else if(sliderStart > timeframe.starting_time && timeframe.ending_time < sliderEnd)	{
			  				  $scope.eventData.eventCache[i].times[j-skippedTimes] = {};
			  				  $scope.eventData.eventCache[i].times[j-skippedTimes].ending_time = $scope.eventData.eventStorage[i].times[j].ending_time;
			  				  $scope.eventData.eventCache[i].times[j-skippedTimes].color_code = $scope.eventData.eventStorage[i].times[j].color_code;
			  				  $scope.eventData.eventCache[i].times[j-skippedTimes].starting_time = sliderStart;						  
			  			  }
			  			  // Bars start and end are outside the range. Cut on both ends
			  			  else if(sliderStart > timeframe.starting_time && timeframe.ending_time > sliderEnd)	{
				  			  $scope.eventData.eventCache[i].times[j-skippedTimes] = {};
			  				  $scope.eventData.eventCache[i].times[j-skippedTimes].starting_time = sliderStart;						  
			  				  $scope.eventData.eventCache[i].times[j-skippedTimes].color_code = $scope.eventData.eventStorage[i].times[j].color_code;
			  				  $scope.eventData.eventCache[i].times[j-skippedTimes].ending_time = sliderEnd;						  
			  			  }
			  			  // Bars is in range. Copy from storage to cache
			  			  else if(sliderStart < timeframe.starting_time && timeframe.ending_time < sliderEnd)	{
			  				$scope.eventData.eventCache[i].times[j-skippedTimes] = {};
			  				$scope.eventData.eventCache[i].times[j-skippedTimes].ending_time = $scope.eventData.eventStorage[i].times[j].ending_time;
			  				$scope.eventData.eventCache[i].times[j-skippedTimes].starting_time = $scope.eventData.eventStorage[i].times[j].starting_time;
			  				$scope.eventData.eventCache[i].times[j-skippedTimes].color_code = $scope.eventData.eventStorage[i].times[j].color_code;			  				  			  			  }
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
					});
				};
        	}
        	else	{
        		callbackMethod = function (d, i, datum) {
					$scope.$apply(function()	{
						$scope.barInfo.probability = [];
						for(var i=0; i<$scope.eventData.probability[datum.label].time.length; i++)	{
							if($scope.eventData.probability[datum.label].time[i] === d.starting_time+'')	{
								$scope.barInfo.probability[0] = {};
								$scope.barInfo.probability[0].time = helper.getDateFromUnix($scope.eventData.probability[datum.label].time[i]);
								$scope.barInfo.probability[0].prop = $scope.eventData.probability[datum.label].probability[i];
							}
						};
					});
				}
        	}
        	
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
					for(var i=1; i<101; i++)	{
						arrayNum[i] = i;
						arrayColors[i] = rgbToHex(Math.floor(255-(255/100*i)),Math.floor(255-(255/100*i)),180);
					}
					arrayNum[101] = 101;
					arrayColors[101] = rgbToHex(150,150,150);
					var colorScale = d3.scale.ordinal().range(arrayColors).domain(arrayNum);
					$scope.chart = d3.timeline().stack().colors(colorScale).colorProperty('color_code').changerange($scope.slider.minValue*60*1000 + $scope.unixRest, $scope.slider.maxValue*60*1000 + $scope.unixRest).hover(callbackMethod);
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