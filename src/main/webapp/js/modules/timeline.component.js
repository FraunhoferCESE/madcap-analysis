angular.
module('timeline').
  component('timeline', {
    templateUrl: 'html/timeline_view.template.html',
    controller: function SensorDataPresentationController($scope, $timeout, helper, allowed_directive_service) {
    	
    	"use strict"; 	
    			
		$scope.control = {showPage: false};

    	$scope.limiter = 2;
    	
    	$scope.userData = {
    			users: [],
    			chosen_user: '',
    			currentSubject: '101106521377446542291'
    		};
    	
    	$scope.$watch('dt.value', function(newValue) { 
			if(typeof newValue !== 'undefined' && newValue !== 'Please select a date ...')	{
				$scope.unixRest = newValue.getTime();
			}
	    });
    	
    	allowed_directive_service.passDirectiveCallback(function()	{
      			
    		document.getElementById('timelineloadspinner').style.display="block";
			document.getElementById('timelineloadmessage').style.display="block";		
		
			if(--$scope.limiter === 0)	{
            	$scope.filterAccordingToSlider();	
      			}
		});
    	
    	gapi.client.analysisEndpoint.getUsers().execute(function(resp){
			for(var i=0; i<resp.returned.length; i++)	{
				$scope.userData.users[i+1] = resp.returned[i]+""; 
			}
			$scope.userData.users[0] = 'Please choose a user ...';
						
		});
    	
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
			            	return helper.getDateFromTime(value);
			            },
			            onChange: function(sliderId)	{
			            	$scope.filterAccordingToSlider();        	
			            }
				    },
				};
		
		//TODO wird bei initialisierung tausendfach abgerufen
		  $scope.filterAccordingToSlider = function()	{	
				 for(var i=0; i<$scope.testData.length; i++){
				    for(var j=0; j<$scope.testData[i].times.length; j++){
					  var timeframe = $scope.testData[i].times[j];
					  var sliderStart = $scope.unixRest + $scope.slider.minValue*60*1000;
					  var sliderEnd = $scope.unixRest + $scope.slider.maxValue*60*1000;
					  
					  if(sliderEnd < timeframe.start_time || sliderStart > timeframe.ending_time)	{
						  for(var k=j; k<$scope.testData[i].times.length-1; k++)	{
							  $scope.testData[i].times[k] = $scope.testData[i].times[k+1];
						  }
						  delete $scope.testData[i].times[$scope.testData[i].times[k].length-1]; 
						  
						  if($scope.testData[i].times === null){
							  for(var l=i; l<$scope.testData.length-1; l++)	{
								  $scope.testData[l] = $scope.testData[l+1];
							  }  
							  delete $scope.testData[$scope.testData.length-1]; 
						  }
					  }
					  else if(sliderEnd < timeframe.start_time && sliderEnd > timeframe.ending_time)	{
						  timeframe.ending_time = sliderEnd;
					  }
					  else if(sliderStart > timeframe.start_time && sliderEnd < timeframe.ending_time)	{
						  timeframe.start_time = sliderStart;						  
					  }
					  else if(sliderStart > timeframe.start_time && sliderEnd > timeframe.ending_time)	{
						  timeframe.start_time = sliderStart;						  
						  timeframe.ending_time = sliderEnd;						  
					  	}
				    }
				  }
				$scope.callback();
		  };
		
    	var time = new Date();
		$scope.unixRest = time - (time%86400000) + (new Date().getTimezoneOffset()*60000);
        $scope.testData = [];
		$scope.testData[0] = {label: "No Data", times: [{"starting_time": $scope.unixRest, "ending_time": ($scope.unixRest + 86400000)}]};

		$scope.renderTimeline = function()	{
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
					for(var j=0; j<refinedData.length; j++)	{
						var expendedExisting = false;
						for(var k=0; k<$scope.testData.length; k++)	{
							if(refinedData[j].block === $scope.testData[k].label)	{
								$scope.testData[k].times[$scope.testData[k].times.length] = {"starting_time": refinedData[j].start, "ending_time": refinedData[j].end};
								expendedExisting = true;
							}
						}
						if(!expendedExisting)	{
							$scope.testData[count] = {label: refinedData[j].block, times: [{"starting_time": refinedData[j].start, "ending_time": refinedData[j].end}]};							
							count++;
						}
					}
				}
     	   
				if(--$scope.limiter <= 0)	{
	            	$scope.sliderOverload++;
      				$scope.filterAccordingToSlider();	
      			}			
			});
        };
        
        $scope.callback = function()	{
        	
			if($scope.limiter === 0){
				document.getElementById('timelineloadspinner').style.display="none";
				document.getElementById('timelineloadmessage').style.display="none";					
				$scope = helper.datePickerSetup($scope);
				$scope.$apply(function()	{
					$scope.control.showPage = true;
				});
			}
			
			$timeout(function()	{
				$scope.$apply(function(){
					d3.select("svg").remove();
					$scope.chart = d3.timeline().stack().changerange($scope.slider.minValue*60*1000 + $scope.unixRest, $scope.slider.maxValue*60*1000 + $scope.unixRest).width(1000);
					$scope.r = d3.select("#timeline1").append("svg").attr("width", 1000) .datum($scope.testData).call($scope.chart);
				});
			}, 0);
        };
        $scope.renderTimeline();
	 }
  }
  );
