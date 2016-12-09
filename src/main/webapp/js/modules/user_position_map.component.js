/**
 * The component for the userMap module. It enables a Google Map where markers can be put onto.
 * A heatmap-overlay is also supported. Filtering can be conducted by  time slider and date
 */
angular.
module('userMap').
  component('userMap', {
    templateUrl: 'html/user_position_map_view.template.html',
    controller: function mapController(NgMap, $scope, $timeout, loading_overlay, census_api, helper, allowed_directive_service) {
    	"use strict"; 	
 
    	$scope.noData = false;
    	$scope.cache = [];
    	$scope.bounds = new google.maps.LatLngBounds();
    	$scope.csv = {
    			createCsv: false,
    			csvProgress: 0,
    			max: 0
    	};
    	// All the data we need to show the Google Map, markers and the heatmap layer
    	$scope.mapData = {
    			map: {},
    			mvcArray: new google.maps.MVCArray(),
    			heatmapDataArray: new google.maps.MVCArray(),
    			heatmap : {},
    			isHeat: false,
    			markers: [],
    	};
    	
    	// All data regarding the usable users
    	$scope.userData = {
    			users: [],
    			chosen_user: '',
    			currentSubject: '',
    			searchSelection: '',
    			/**
    			 * Calback function for the case that a different user is chosen in the user-dropdown.
    			 * Deletes the filler value when it is still part of the user aray.
    			 */
    			userChange: function()	{
    				if($scope.userData.currentSubject === '')	{
    					for(var i=0; i<$scope.userData.users.length-1; i++)	{
    						$scope.userData.users[i] = $scope.userData.users[i+1];
    					}
    					delete $scope.userData.users.splice($scope.userData.users.length-1,1);
    				}
    				$scope.initializeRefresh('user');
    			}
    		};
    	
    	//A collection of data from census requests. Will be expanded in the future probably
    	$scope.censusData = {
    		blockData: [],
    		longitude: "",
    		latitude: ""
    	};
    	
    	$scope.mapData.heatmap = new google.maps.visualization.HeatmapLayer({
		    data: $scope.mapData.heatmapDataArray,
		    radius: 100
		});
    	
    	$scope.setDefault = function()	{
    		$scope.userData.chosen_user = $scope.userData.users[0];
    	};
		
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
		
		// Requests and sets the citySDK key
		gapi.client.securityEndpoint.getKey().execute(function(resp){
			census_api.passKey(resp.returned);
		});	
		
		//Requests a list of all users, which are connected to LocationEntries. Also inserts a filler value when no user is chosen.
		gapi.client.analysisEndpoint.getUsers().execute(function(resp){
			for(var i=0; i<resp.returned.length; i++)	{
				$scope.userData.users[i+1] = resp.returned[i]+""; 
			}
			$scope.userData.users[0] = 'Please choose a user ...';
			
			//$scope.userData.users = resp.returned; 
			
		});		
		
		
		/**
		 * Callback function for the case that the chosen date changes
		 */
		$scope.$watch('dt.value', function(newValue) { 
			if(typeof newValue !== 'undefined' && newValue !== 'Please select a date ...')	{
				$scope.initializeRefresh(newValue.getTime());
			}
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
			if($scope.userData.currentSubject !== '' && !($scope.noData))	{
				cacheMarkers();
			}
			
			if(source === 'user'){
				$scope.userData.currentSubject = document.getElementById("chosen_user").options[document.getElementById("chosen_user").selectedIndex].text;
			}
			else	{
				$scope.unixRest = source;
			}
			
			//Step 2: Restoring "factory mode"
			if($scope.userData.currentSubject !== ''){
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
					if($scope.userData.currentSubject + $scope.unixRest === $scope.cache.meta[j])	{
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
				if(($scope.userData.currentSubject + $scope.unixRest) === $scope.cache.meta[i])	{
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
					$scope.cache.meta[$scope.cache.pointer] = $scope.userData.currentSubject + $scope.unixRest;
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
			$scope.cache.meta[$scope.cache.pointer] = $scope.userData.currentSubject + $scope.unixRest;
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
			//Querying for the data
			gapi.client.analysisEndpoint.getInWindow({'user' : strUser, 'start' : $scope.unixRest , 'end' : ($scope.unixRest + 86400000)}).execute(function(resp) {
        	   dialog.close();
        	   //Checks to see if the returned object is valid and usable
        	   if(resp !== false && typeof resp.result !== 'undefined' && resp.result.length !== 0)	{	   		
        	   		$scope.noData = false;
        	   		showOnMap(resp.items);
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
			$scope.centerMap();
			$scope.filterAccordingToSlider();
		}
		
		/**
		 * Centers map location and zoom on the markers (all of them, not only the shown ones)
		 */
		$scope.centerMap = function()	{
			$scope.mapData.map.fitBounds($scope.bounds);
			$scope.mapData.map.setCenter($scope.bounds.getCenter());
		};
		
		
		/**
		 * Shows markers on the map with the data from the locations. Prepares the raw string and extractes
		 * locations out of them.
		 * @param entries: the LocationEntries
		 */
		function showOnMap(entries)	{
			for(var i=0; i<entries.length; i++)	{
				
				var location = [];
				location[0] = entries[i].latitude;
				location[1] = entries[i].longitude;
				
				var coordinates = new google.maps.LatLng(location[0], location[1]);
				$scope.mapData.mvcArray.push(coordinates);

				$scope.mapData.markers[i] = new google.maps.Marker({
					title: helper.getDateFromUnix(Math.ceil((entries[i].timestamp-$scope.unixRest)/60000))
				});
				$scope.mapData.markers[i].addListener('click', function() {
					$scope.censusData.latitude = this.getPosition().lat();
					$scope.censusData.longitude = this.getPosition().lng();
					$scope.showCensus(this.getTitle(), this.getPosition().lat(), this.getPosition().lng());
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
			$scope.filterAccordingToSlider();
			
		}
	
		/**
		 * Searches the entry String for the code word. returnes everything betwen thecode word and the next comma in line.
		 * @param code: The codewort. everything after the codewort until the next comma will be returned as result
		 * @param entry: a String that contains the required data. Format has to be csv
		 * @returns
		 */
		function refineData(code, entry)	{
			var done = false;
			var returned = 'error';
			for(var i=0; i<entry.length && !done; i++)	{
				//Checks for equality
				if(entry.charAt(i) === code.charAt(0))	{
					var equal = true;
					//marks when unequal
					for(var l=1; l<code.length; l++)	{
						if(entry.charAt(i+l) !== code.charAt(l))	{
							equal = false;
						}
					}
					if(equal)	{
						returned = "";
						for(var m=(i+code.length); entry.charAt(m) !== ','; m++)	{
							returned = returned + entry.charAt(m);
						}
						done = true;
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
			$scope.filterAccordingToSlider();
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
	            	return helper.getDateFromUnix(value);
	            },
	            onChange: function(sliderId)	{
	            	$scope.filterAccordingToSlider();        	
	            }
		    },
		};

		
		/**
		 * At rendering, all markers get shown and the heatmap is empty. This method
		 * sorts out the markers which shall not be seen and fills the heatmap.
		 * It updates automatically whenever the slider is moved, but is also called manually
		 */
		$scope.filterAccordingToSlider = function()	{
			if($scope.userData.currentSubject !== '')	{
			    /* Completly clears the heatmap. The heatmapdata is a stack, therefore injecting
				and removing at specific indexes is not possible*/
        		$scope.mapData.heatmapDataArray.clear();
        		for(var i=0; i<$scope.mapData.markers.length; i++)	{
        			var value = helper.getUnixFromDate($scope.mapData.markers[i].getTitle());
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
		};		
		
		$scope = helper.datePickerSetup($scope);
				
		/**
		 * Hides the for this view specific loading spinner and text. Provides the ng-if tag time to get shown on the DOM,
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
			allowed_directive_service.passDirectiveCallback($scope.refresh);
		},0);
		
		
		/**
		 * loads census data for a given coordinate pair. Saves the returned data in the census data cache.
		 * EXTENSION: Will update a window with longitude, latitude and time of the marker.
		 */
		$scope.showCensus = function(time, lat, lng)	{	
			census_api.sendRequest(lat, lng,
			function(resp, id)	{
				
				var count = 0;
				var persons = 0;
				var households = 0;
				var averages = [];
				for(var num in resp.data[0])	{
				
					persons = persons + parseInt(resp.data[0][num])*(count+1);
					households = households + parseInt(resp.data[0][num]);
					if(count === 6){
						if(households !== 0){
							averages[averages.length] = persons/households;
						}
						else	{
							averages[averages.length] = 0;
						}
						persons = 0;
						households = 0;
					}
					
					count++
					count = count % 7;
				}
				
				// Necessary to trigger immediate update in Angular
				$scope.$apply(function()	{
					$scope.censusData.blockData = resp;
					delete $scope.censusData.blockData.variables;
					delete $scope.censusData.blockData.data;					
					$scope.censusData.averages = {};
					$scope.censusData.averages.owner = averages[0]; 
					$scope.censusData.averages.renter = averages[1]; 
					$scope.censusData.averages.total = averages[2]; 
				});
			}, true, -1);
		};
		
		
		/**
		 * Starts a download for all map data as a csv-file. Currently, the download includes all markers of the chosen day,
		 * regardless of the fact if they are shown on the map currently. 
		 */
		$scope.downloadCSV = function()	{
	    	$scope.csv.csvProgress = 10;
			$scope.csv.createCsv = true;
    		// Prepares data to be passed to (out) census service
			$scope.userData.chosen_user = $scope.userData.users[2];
			var coords = [];
			for(var i=0; i<$scope.mapData.markers.length; i++)	{
				coords[i] = {};
				coords[i].time = helper.getUnixFromDate($scope.mapData.markers[i].getTitle());
				coords[i].lat = $scope.mapData.markers[i].getPosition().lat();
				coords[i].lng = $scope.mapData.markers[i].getPosition().lng();
			}
			var date = new Date($scope.unixRest);
			var day = "=\"" + (1+date.getMonth()) + "/" + date.getDate() + "/" + date.getFullYear()+ "\"";
			census_api.csvDownload(coords, day, $scope.userData.currentSubject, function(percent)	{
		    	
				var phase = $scope.$root.$$phase;
				if(phase === '$apply' || phase === '$digest') {
		    		$scope.csv.csvProgress = percent;
		    		if(percent >= 100){
			    		$scope.csv.createCsv = false;
			    	}
				} else {
					$scope.$apply(function()	{
			    		$scope.csv.csvProgress = percent;
			    		if(percent >= 100){
				    		$scope.csv.createCsv = false;
				    	}
			    	});
				}
			});
		};
		
		/**
		 * Exports the last 1000 locations of the user as CSV file. Formated to be openable in Excel.
		 */
		$scope.downloadLocationCSV = function()	{
			var subject = $scope.userData.currentSubject;
			gapi.client.analysisEndpoint.callForLocationCSV({"user" : subject}).execute(function(resp){
				var row = 'data:text/csv;charset=utf-8,' + ("=\"user: " + subject + "\"") + '\r\nTime","latitude","longitude","bearing"\r\n';
				for(var i=0; i<resp.items.length;i++)	{
					row = row + helper.getDateFromUnix(Math.ceil(resp.items[i].timestamp/60000)) + ',' + resp.items[i].latitude + ',' + resp.items[i].longitude + ',' + resp.items[i].bearing + '\r\n';
				}
				var encodedUri = encodeURI(row);
				var link = document.createElement("a");
				link.setAttribute("href", encodedUri);
				link.setAttribute("download", "my_data.csv");
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
			});
		};
	}
});