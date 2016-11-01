/**
 * The component for the userMap module. It enables a Google Map where markers can be put onto.
 * A heatmap-overlay is also supported
 */
angular.
module('userMap').
  component('userMap', {
    templateUrl: 'html/user_position_map_view.template.html',
    controller: function madcapController(NgMap, $scope, $timeout, $uibModal, $rootScope, loading_overlay) {
    	"use strict"; 	
 
    	$scope.map = {};
    	$scope.isHeat = false;
    	$scope.mvcArray = new google.maps.MVCArray();
    	$scope.markers = [];
    	$scope.bounds = new google.maps.LatLngBounds();
		$scope.heatmap = new google.maps.visualization.HeatmapLayer({
		    data: $scope.mvcArray,
		    radius: 100
		});
		var time = new Date();
		$scope.unixRest = time - (time%86400000);
		$scope.unixRest = $scope.unixRest + (new Date().getTimezoneOffset()*60000);
		document.getElementById('siteloadspinner').style.display="block";
		$scope.refreshMap = false;
		
		//Requests a list of all users, which are connected to (indexed) ProbeEntries
		gapi.client.analysisEndpoint.getUsers().execute(function(resp){
			$scope.users = resp.returned;
		});		
		
		/**
		 * hides the for this view specific loading spinner and text. Provides the ng-if tag time to get shown on the DOM,
		 * so that NgMap can get the map from the DOM through getMap();
		 */
		$scope.refresh = function()	{
			$scope.refreshMap = true;
			$timeout(function()	{
				document.getElementById('maploadspinner').style.display="none";
				document.getElementById('maploadmessage').style.display="none";
				$timeout(function () {
				      $scope.$broadcast('rzSliderForceRender');
				    });
				NgMap.getMap().then(function(returnMap){
					$scope.map = returnMap;
				});
			}, 1000);
		};
		
		/**
		 * Resets the marker-array and heatmap whenever the selected user is changed
		 */
		$scope.userChange = function()	{
			$timeout(function () {
			      $scope.$broadcast('rzSliderForceRender');
			    });
			for(var i=0; i<$scope.markers.length; i++){
				$scope.markers[i].setMap(null);
			}
			$scope.markers = null;				
			$scope.heatmap.setMap(null);				
		
			$scope.mvcArray = new google.maps.MVCArray();
	    	$scope.markers = [];
			$scope.bounds = new google.maps.LatLngBounds();
			$scope.heatmap = new google.maps.visualization.HeatmapLayer({
			    data: $scope.mvcArray,
			    radius: 100
			});
			if($scope.isHeat)	{
				$scope.heatmap.setMap($scope.map);
			}
			else	{
				$scope.heatmap.setMap(null);				
			}
		};
		
		/**
		 * Shows and hides the heatmap by setting its map. Alsos shows/hides the markers whenever necessary.
		 */
		$scope.toggleHeatmap = function() {
			var newMap;
			if($scope.isHeat)	{
				$scope.isHeat = false;
				newMap = $scope.map;
				document.getElementById("heatmap_toggle").innerHTML = "show Heatmap";
			}
			else	{
				$scope.isHeat = true;
				newMap = null;
				document.getElementById("heatmap_toggle").innerHTML = "show Markermap";
			}
			if(newMap === null)	{
				$scope.heatmap.setMap($scope.map);
			}
			else	{
				$scope.heatmap.setMap(null);				
			}
			for(var i=0; i<$scope.markers.length; i++){
				$scope.markers[i].setMap(newMap);
			}
	    };
		
		/**
		 * Requests the ten most recent ProbeEntries of the user in the dropdown menue and
		 * shows them as markers on the Google Map
		 */
		$scope.showMarkers = function()	{
			var strUser = document.getElementById("chosen_user").options[document.getElementById("chosen_user").selectedIndex].text;
			var dialog = loading_overlay.createLoadOverlay("Loading entries ...", this);
			//Those are 64-bit integers. They have to be passed to the endpoint as long!
			var lowerBound = $scope.unixRest + $scope.slider.minValue*60000;
			var upperBound = $scope.unixRest + $scope.slider.maxValue*60000;
			gapi.client.analysisEndpoint.getInWindow({'user' : strUser, 'start' : lowerBound , 'end' : upperBound}).execute(function(resp) {
        	   dialog.close();
        	   if(resp.entries !== null && resp !== false)	{
        	   		var rawData = [];
        	   		for(var i=0; i<resp.entries.length; i++)	{
        	   			rawData[i] = resp.entries[i];
        	   		}
        	   		showOnMap(rawData);
        	   	}
        	});  
		};
		
		/**
		 * Shows markers on the map with the data from the ProbeEntries
		 * @param entries the ProbeEntries
		 */
		function showOnMap(entries)	{
			var markerCount = entries.length;
			var oldMarkersLength = $scope.markers.length;
			for(var i=$scope.markers.length; i<(oldMarkersLength + entries.length); i++)	{
				
				var location = getLocationData(entries[i - oldMarkersLength].sensorData);
				var coordinates = new google.maps.LatLng(location[0], location[1]);
				$scope.mvcArray.push(coordinates);

				$scope.markers[i] = new google.maps.Marker({
					//title: "Time: " + getTimeFromUnix(entries[i - oldMarkersLength].timestamp)
					title: $scope.getTimeOfDay(Math.ceil((entries[i - oldMarkersLength].timestamp-$scope.unixRest)/60000))
				});
				$scope.markers[i].setPosition(coordinates);
				if(!$scope.isHeat)	{
					$scope.markers[i].setMap($scope.map);
				}
				
				$scope.bounds.extend($scope.markers[i].getPosition());
				
				// Zoom to the markers when all are set
				if(--markerCount === 0){
					$scope.map.fitBounds($scope.bounds);
					$scope.map.setCenter($scope.bounds.getCenter());
				}
			}
		}
		
		/**
		 * Filters location data out of a raw String. codeLat and codeLng define the words, which are 
		 * DIRECTLY BEFORE the coordinates in the raw String. Only returns one pair of coordinates
		 * @param entry The entry, from which the location data will be extracted
		 * @returns the x and y coordinates for the marker
		 */
		function getLocationData(entry)	{
			var returned = [];
			var doneLat = false;
			var doneLng = false;
			var codeLat = "\"mLatitude\":";
			var codeLng = "\"mLongitude\":";
			for(var i=0; i<entry.length && (!doneLat || !doneLng); i++)	{
				if(entry.charAt(i) === codeLat.charAt(0))	{
					var equalLat = true;
					for(var j=1; j<codeLat.length; j++)	{
						if(entry.charAt(i+j) !== codeLat.charAt(j))	{
							equalLat = false;
						}
					}
					if(equalLat)	{
						returned[0] = "";
						for(var k=(i+codeLat.length); entry.charAt(k) !== ','; k++)	{
							returned[0] = returned[0] + entry.charAt(k);
						}
						doneLat = true;
					}
				}
				
				if(entry.charAt(i) === codeLng.charAt(0))	{
					var equalLng = true;
					for(var l=1; l<codeLng.length; l++)	{
						if(entry.charAt(i+l) !== codeLng.charAt(l))	{
							equalLng = false;
						}
					}
					if(equalLng)	{
						returned[1] = "";
						for(var m=(i+codeLng.length); entry.charAt(m) !== ','; m++)	{
							returned[1] = returned[1] + entry.charAt(m);
						}
						doneLng = true;
					}
				}
			}
			return returned;
		}
		
		
	$scope.slider = {
		    minValue: 0,
		    maxValue: 1439,
		    options: {
	            floor: 0,
		    	ceil: 1439,
	            translate: function(value)	{
	            	return $scope.getTimeOfDay(value);
	            },
		    }
	};
			
		
	$scope.getTimeOfDay = function(value)	{
		var hour = 12;
        var decreaser = 0;
        var daytime = ' am';
        for(var i=value; 59<i; i = i-60)	{
           	hour++;
           	if(hour % 12 === 1)	{
           		decreaser++;
           	}
           	if(23<hour)	{
          		daytime = ' pm';
           	}
        }
      	value = i;
       	var stringValue;
       	if(value>9)	{
       		stringValue = value;
       	}
       	else	{
       		stringValue = '0'+value;
       	}
       	var timeString = '' + (hour - decreaser*12) + ':' + stringValue + daytime;
       	return timeString;
	};
		
		/**
		 * Converts unix time into a readable time format
		 * @param unix the unix time
		 * @returns a String with the time in "HH:MM:SS" format
		 */
		function unixToTime(unix){
			
			var date = new Date(unix*1000);
			var hours = date.getHours();
			var minutes = "0" + date.getMinutes();
			var seconds = "0" + date.getSeconds();
			return hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
		}
		
		setTimeout(function(){
			$scope.refresh();
		},0);
	}
});