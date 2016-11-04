/**
 * The component for the userMap module. It enables a Google Map where markers can be put onto.
 * A heatmap-overlay is also supported
 */
angular.
module('userMap').
  component('userMap', {
    templateUrl: 'html/user_position_map_view.template.html',
    controller: function madcapController(NgMap, $scope, $timeout, loading_overlay) {
    	"use strict"; 	
 
    	$scope.currentSubject = '';
    	$scope.noData = false;
    	$scope.cache = [];
    	$scope.bounds = new google.maps.LatLngBounds();
    	
    	$scope.mapData = {
    			map: {},
    			mvcArray: new google.maps.MVCArray(),
    			heatmapDataArray: new google.maps.MVCArray(),
    			heatmap : {},
    			isHeat: false,
    			markers: []		
    	};
    	$scope.mapData.heatmap = new google.maps.visualization.HeatmapLayer({
		    data: $scope.mapData.heatmapDataArray,
		    radius: 100
		});
		
    	// Creates a cache of dynamic size (5 currently)
    	var cacheSize = 5;
    	for(var i=0; i<cacheSize; i++)	{
    		$scope.cache[i] = [];
    	}
    	$scope.cache.meta = [];
   		$scope.cache.mvc = [];
   		$scope.cache.pointer = 0;
   		for(var j=0; i<cacheSize; i++)	{
   			$scope.meta[j] = '';
   		}
    	
		var time = new Date();
		$scope.unixRest = time - (time%86400000) + (new Date().getTimezoneOffset()*60000);
		
		// Updates to "Load Google Maps"-Spinner
		document.getElementById('siteloadspinner').style.display="block";
		$scope.refreshMap = false;
		
		//Requests a list of all users, which are connected to (indexed) ProbeEntries
		gapi.client.analysisEndpoint.getUsers().execute(function(resp){
			$scope.users = resp.returned;
		});		
		
		/**
		 * Calback function for the case that a different user is chosen in the user-dropdown
		 */
		$scope.userChange = function()	{
			$scope.initializeRefresh('user');
		};
		/**
		 * Callback function for the case that the chosen date changes
		 */
		$scope.$watch('dt.value', function(newValue) { 
			$scope.initializeRefresh(newValue.getTime());
	    });
		/**
		 * This method is called whenever a new set of data needs to get shown on the map.
		 * Currently, that's the case when a new user is chosen or when the date in the datepicker changes.
		 * 
		 * It consists of 3 parts:
		 * 
		 * 1. It caches the currently shown data in the cache-Array. The key is the userId plus the unixRest,
		 * which defines the day. This part of the method is only triggered when a user is logged in and data has been actually loaded
		 * or been retrieved from the cache.
		 * 
		 * 2. It resets the map components. You can think of it like changing the map back into
		 * "factory mode". After this step, the map and all components it needs are exactly as they where
		 * when this window got initialized first.
		 * 
		 * 3. Loading the new data. When the key for the needed data is in the cache, the data gets loaded from the cache.
		 * Only when it's not in the cache, the webapp will send a query to the App Engine.
		 * 
		 * @param source: A string, which indicates either the source of the call or gives important data to the function
		 */
		$scope.initializeRefresh = function(source)	{
			
			//Step 1: Caching data
			if($scope.currentSubject !== '' && !($scope.noData))	{
				cacheMarkers();
			}
			
			if(source === 'user'){
				$scope.currentSubject = document.getElementById("chosen_user").options[document.getElementById("chosen_user").selectedIndex].text;
			}
			else	{
				$scope.unixRest = source;
			}
			
			//Step 2: Restoring "factory mode"
			if($scope.currentSubject !== ''){
				for(var i=0; i<$scope.mapData.markers.length; i++){
					$scope.mapData.markers[i].setMap(null);
				}
				$scope.mapData.markers = null;				
				$scope.mapData.heatmap.setMap(null);				
				$scope.mapData.mvcArray = new google.maps.MVCArray();
				$scope.mapData.heatmapDataArray = new google.maps.MVCArray();
	    		$scope.mapData.markers = [];
				$scope.bounds = new google.maps.LatLngBounds();
				$scope.mapData.heatmap = new google.maps.visualization.HeatmapLayer({
			    	data: $scope.mapData.heatmapDataArray,
			    	radius: 100
				});
				
				// Determines if the heatmap gets shown or not
				if($scope.mapData.isHeat)	{
					$scope.mapData.heatmap.setMap($scope.mapData.map);
				}
				else	{
					$scope.mapData.heatmap.setMap(null);				
				}
			
				var isCached = false;
				var cachedAt = -1;
				
				// Checks if the key is in the cache
				for(var j=0; !isCached && j< $scope.cache.length; j++){
					cachedAt++;
					if($scope.currentSubject + $scope.unixRest === $scope.cache.meta[j])	{
						isCached = true;
					}
				}
				if(!isCached)	{
					// Load data anew
					$scope.showMarkers();
				}
				else	{
					// Load data from cache at the give index
					loadFromCache(cachedAt);
				}
			}
		};
		
		/**
		 * This method caches the markers and their relevant data, before they get replaced with new ones in the map.
		 * The cache always contains the last shown markers. If already cached dataset shall get cached,
		 * it will get deleted from it's old position in the cache and moved to the top of the cache.
		 * */
		function cacheMarkers()	{
			var isCached = false;
			var cachedAt = -1;
			
			// determines if these markers is already cached
			for(var i=0; !isCached && i< $scope.cache.length; i++){
				cachedAt++;
				if(($scope.currentSubject + $scope.unixRest) === $scope.cache.meta[i])	{
					isCached = true;
				}
			}
			
			//Caching of the data
			if(isCached){
				if($scope.cache.pointer<cachedAt){
					for(var j=cachedAt; $scope.cache.pointer < j; j--){
						$scope.cache[j] = $scope.cache[j-1];
						$scope.cache.meta[j] = $scope.cache.meta[j-1];
						$scope.cache.mvc[j] = $scope.cache.mvc[j-1];
					}
					$scope.cache[$scope.cache.pointer] = $scope.mapData.markers;
					$scope.cache.meta[$scope.cache.pointer] = $scope.currentSubject + $scope.unixRest;
					$scope.cache.mvc[$scope.cache.pointer] = $scope.mapData.mvcArray;
				}
				else if($scope.cache.pointer>cachedAt)	{
					for(var m=cachedAt+$scope.cache.length; $scope.cache.pointer < m; m--){
						var k = m % $scope.cache.length;
						var l = (m-1) % $scope.cache.length;						
						$scope.cache[k] = $scope.cache[l];
						$scope.cache.meta[k] = $scope.cache.meta[l];
						$scope.cache.mvc[k] = $scope.cache.mvc[l];
					}
				}
			}
			$scope.cache[$scope.cache.pointer] = $scope.mapData.markers;
			$scope.cache.meta[$scope.cache.pointer] = $scope.currentSubject + $scope.unixRest;
			$scope.cache.mvc[$scope.cache.pointer] = $scope.mapData.mvcArray;
			// Increasing and reseting of the cachepointer when it gets bigger than the cache itself
			$scope.cache.pointer = (++($scope.cache.pointer)) % $scope.cache.length;
		}
		
		
		/**
		 * Queries all locations for the chosen user on the chosen day. The locations will be rerturned in one raw String,
		 * which will have to get refined.
		 */
		$scope.showMarkers = function()	{
			var strUser = document.getElementById("chosen_user").options[document.getElementById("chosen_user").selectedIndex].text;
			var dialog = loading_overlay.createLoadOverlay("Loading entries ...", this);
			//Those are 64-bit integers. They have to be passed to the endpoint as long!
			var upperBound = $scope.unixRest + $scope.slider.maxValue*60000;
			//Querying for the data
			gapi.client.analysisEndpoint.getInWindow({'user' : strUser, 'start' : $scope.unixRest , 'end' : (upperBound + 86400000)}).execute(function(resp) {
        	   dialog.close();
        	   //Checks to see if the returned object is valid and usable
        	   if(resp.entries !== null && resp !== false && resp.hasOwnProperty('entries'))	{
        	   		var rawData = [];
        	   		for(var i=0; i<resp.entries.length; i++)	{
        	   			rawData[i] = resp.entries[i];
        	   		}
        	   		$scope.noData = false;
        	   		showOnMap(rawData);
        	   	}
        	   else	{
        		   $scope.noData = true;
        	   }
        	});  
		};
		
		/**
		 * Copies the data from the cache onto the map.
		 * @param index: The index where the markers reside in the cache
		 */
		function loadFromCache(index)	{
			$scope.mapData.markers = $scope.cache[index];
			$scope.mapData.mvcArray = $scope.cache.mvc[index];
			for(var i=0; i<$scope.mapData.markers.length; i++){
				$scope.mapData.markers[i].setMap($scope.mapData.map);
				if($scope.mapData.isHeat){
					$scope.mapData.markers[i].setVisible(false);
				}
				// Extends the bounds, so that in the end all markers will be visible on the map at once
				$scope.bounds.extend($scope.mapData.markers[i].getPosition());
			}
			$scope.mapData.map.fitBounds($scope.bounds);
			$scope.mapData.map.setCenter($scope.bounds.getCenter());
			filterAccordingToSlider();
		}
		
		
		/**
		 * Shows markers on the map with the data from the locations. Prepares the raw string and extractes
		 * locations out of them.
		 * @param entries: the ProbeEntries
		 */
		function showOnMap(entries)	{
			var oldMarkersLength = $scope.mapData.markers.length;
			for(var i=oldMarkersLength; i<(oldMarkersLength + entries.length); i++)	{
				
				var location = getLocationData(entries[i - oldMarkersLength].sensorData);
				var coordinates = new google.maps.LatLng(location[0], location[1]);
				$scope.mapData.mvcArray.push(coordinates);

				$scope.mapData.markers[i] = new google.maps.Marker({
					title: $scope.getTimeOfDay(Math.ceil((entries[i - oldMarkersLength].timestamp-$scope.unixRest)/60000))
				});
				$scope.mapData.markers[i].setPosition(coordinates);
				$scope.mapData.markers[i].setMap($scope.mapData.map);
				if($scope.mapData.isHeat)	{
					$scope.mapData.markers[i].setVisible(false);
				}	
				$scope.bounds.extend($scope.mapData.markers[i].getPosition());
			}
			$scope.mapData.map.fitBounds($scope.bounds);
			$scope.mapData.map.setCenter($scope.bounds.getCenter());
			filterAccordingToSlider();
			
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
		
		
		/**
		 * Shows and hides the heatmap by setting its map. Also shows/hides the markers whenever necessary.
		 */
		$scope.toggleHeatmap = function() {
			var newMap;
			if($scope.mapData.isHeat)	{
				$scope.mapData.isHeat = false;
				newMap = $scope.mapData.map;
				document.getElementById("heatmap_toggle").innerHTML = "show Heatmap";
			}
			else	{
				$scope.mapData.isHeat = true;
				newMap = null;
				document.getElementById("heatmap_toggle").innerHTML = "show Markermap";
			}
			if(newMap === null)	{
				$scope.mapData.heatmap.setMap($scope.mapData.map);
			}
			else	{
				$scope.mapData.heatmap.setMap(null);				
			}
			for(var i=0; i<$scope.mapData.markers.length; i++){
				if(newMap !== null)	{
					$scope.mapData.markers[i].setVisible(true);
				}
				else	{
					$scope.mapData.markers[i].setVisible(false);
				}
			}
			filterAccordingToSlider();
	    };
	    
	    
		/**
		 * Setup and options of the slider
		 */
		$scope.slider = {
		    minValue: 0,
		    maxValue: 1439,
		    options: {
	            floor: 0,
		    	ceil: 1439,
		    	disabled: false,
	            translate: function(value)	{
	            	return $scope.getTimeOfDay(value);
	            },
	            onChange: function(sliderId)	{
	            	filterAccordingToSlider();        	
	            }
		    },
		};

		
		/**
		 * At rendering, all markers get shown and the heatmap is empty. This method
		 * sorts out the markers which shall not be seen and fills the heatmap.
		 * It updates automatically whenever the slider is moved, but is also called manually
		 */
		function filterAccordingToSlider()	{
			if($scope.currentSubject !== '')	{
			    /* Completly clears the heatmap. The heatmapdata is a stack, therefore injecting
				and removing at specific indexes is not possible*/
        		$scope.mapData.heatmapDataArray.clear();
        		for(var i=0; i<$scope.mapData.markers.length; i++)	{
        			var value = getTimeFromDate($scope.mapData.markers[i].getTitle());
        			if(value < $scope.slider.minValue || $scope.slider.maxValue < value){
        				// Only change if the marker is visible while it shall not be
        				if($scope.mapData.markers[i].getVisible())	{
        					$scope.mapData.markers[i].setVisible(false);
        				}
        			}
        			else	{
        				// Only change if the marker is not visible while it shall be
        				if(!($scope.mapData.markers[i].getVisible()) && !($scope.mapData.isHeat))	{
        					$scope.mapData.markers[i].setVisible(true);
        				}
        				// Adds the location to the heatmap
    					$scope.mapData.heatmapDataArray.push($scope.mapData.mvcArray.getAt(i));
        			}
        		}
        	}
		}
		
		
		/**
		 * converts a String with the format HH:MM(am/pm) to unixtime in milliseconds
		 * @param value: the time as string
		 * @return the time in unix
		 */
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
		 *  The same as getTimeOfDay, but the other way around
		 * @param title: the time in unix
		 * @returns the time as String
		 */
		function getTimeFromDate(title)	{
			var hourShifter = 0;
			
			if(title.substring(2,3) === ':')	{
				hourShifter = 1;
			}
			var hour = parseInt(title.substring(0,1+hourShifter));
			var minute = parseInt(title.substring(2+hourShifter,4+hourShifter));
			var dayTime = title.substring(5+hourShifter,7+hourShifter);
			if(dayTime === 'am' && hour !== 12){
				return hour*60+minute;
			}
			else if(dayTime === 'am'){
				return minute;
			}
			else if(dayTime === 'pm' && hour !== 12){
				return hour*60+minute+720;
			}
			else	{
				return minute+720;				
			}
		}
		
		
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
					$scope.mapData.map = returnMap;
				});
			}, 1000);
		};
		
		
		setTimeout(function(){
			$scope.refresh();
		},0);
		
		
	}
});