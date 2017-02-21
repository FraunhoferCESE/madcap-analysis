/**
 * This module defines the map shown in the master view of v2. It shows a Google
 * Map and a information window for census data. Data can be queried by day and
 * user. Filtering is enabled. Block data (including census data for each block)
 * can be exported as Excel-friendly CSV-file. Data can be displayed either as
 * heatmap or makers. Caching is enabled too. Data can be filtered by it"s origin.
 * Data of different origin gets shown with different marker colors.
 * 
 * IMPORTANT!: This module is intended to be used only together with the master
 * module and the control_unit_v2 module. It will NOT work on it's own! For an
 * independently running but smaller version of the map view use the user-map
 * module in the user_position_map component file.
 */
angular
.module('mapV2')
.component('mapV2',{
	templateUrl : 'html/map_v2_view.template.html',
	controller : function MapController(NgMap, $scope, $timeout, loading_overlay, census_api, helper, allowed_directive_service) {
		
		"use strict";
		var f=0;
		// Creates loading overlay for initial loading
		$scope.dialog = loading_overlay.createLoadOverlay('Loading the map ...', this, 'map_content');
		$scope.fromStart = true;
		
		// Access to the controlling variables of the control unit component
		$scope.controlScope = $scope.$parent.controlControl.childScope;
		
		$scope.noData = false;
		
		/*Count the running processes. The last running process is the one which gets shown on the view> Since all
		 * requests take the same time, this implements a last-in-last-out startegy for the sowing of the data*/
		$scope.processTickets = {};
		
		// All the data we need to show the Google Map, markers and the heatmap layer. Also contains map-related setup data
		$scope.mapData = {
			map : 'no map',
			mvcArray : new google.maps.MVCArray(),
			heatmapDataArray : new google.maps.MVCArray(),
			heatmap : {},
			isHeat : false,
			refreshMap : false,
			markers : [],
			center : new google.maps.LatLng(38.97, -76.92),	
			markerCircle : null,
			lastClickedMarker: null,
			bounds: new google.maps.LatLngBounds()
		};
		
		// Necessary methods and variables to control the initial loading and general setup of the module
		$scope.initializePack = {
			rekick : false,
			stopper : 2,
			xsSize : false,
			/**
			 * This method gets called as soon as the Google map loads (through ng-init). Adapts the module's
			 * layout to the window size and restarts the loading if the map wasn't ready when the markers where supposed to be set
			 */
			initializeMap : function() {
				//Sets well size for loaded view. Removes well size used while loading
				document.getElementById("mapWell").style.height = "";
				var mapRow = document.getElementById("mapRow");
				mapRow.style.height = document.getElementById("mapInformationContainer").offsetHeight + 120 + 'px';
				$scope.dialog.remove();
				$(window).on('resize',$scope.moveElementsOnResize);
				NgMap.getMap({id : "map"}).then(function(returnMap) {
					$scope.mapData.map = returnMap;
					if ($scope.initializePack.rekick) {
						$scope.initializePack.rekick = false;
						$scope.initializeRefresh();
					}
				});
			},
			/**
			 * Only lets the map load when previous setup as well as allowed_directive have finished their work
			 */
			initializeCallback : function() {
				if (--($scope.initializePack.stopper) === 0) {
					$scope.$apply(function()	{
						$scope.mapData.refreshMap = true;
					});
				}
			}
		};
						
		/**
		 * Adapts the well size when a layout change through bootstrap is triggered
		 */
		$scope.moveElementsOnResize = function() {
			if ($scope.$parent.viewControl.usermap.visible && $scope.initializePack.xsSize && 768 <= $(window).width()) {
				$scope.initializePack.xsSize = false;
				document.getElementById("mapWell").style.height = "";
			} else if ($scope.$parent.viewControl.usermap.visible && !($scope.initializePack.xsSize) && 768 > $(window).width()) {
				$scope.initializePack.xsSize = true;
				document.getElementById("mapWell").style.height = document.getElementById("mapWrap").offsetHeight + document.getElementById("mapInformationContainer").offsetHeight + 120 + 'px';
			}
		};

		// A collection of data from census requests. Will probably expanded in the future probably
		$scope.censusData = {
			blockData : {
				state : "No data requested",
				county : "No data requested",
				tract : "No data requested",
				blockGroup : "No data requested",
				block : "No data requested",
				place_name : "No data requested"
			},
			longitude : "No data requested",
			latitude : "No data requested",
			origin : "No data requested",
			accuracy : "No data requested",
			averages : {
				owner : "No data requested",
				renter : "No data requested",
				total : "No data requested"
			}
		};
		
		$scope.mapData.heatmap = new google.maps.visualization.HeatmapLayer({
			data : $scope.mapData.heatmapDataArray,
			radius : 100
		});
						
		// The data cache. content contains the saved content, meta holds the identifier. Size can be set to any number
		$scope.cache = {
			content : {
				mvc : [],
				marker : []
			},
			meta : [],
			pointer : 0,
			size : 5
		};

		// Listener for the datepicker
		$scope.$watch('controlScope.dateData.unixRest', function(newValue) {
			if ($scope.$parent.viewControl.usermap.visible && typeof newValue !== 'undefined' && newValue !== 'Please select a date ...') {
				$scope.initializeRefresh();
			}
		});
		
		// Listener for the userpicker
		$scope.$watch('controlScope.userData.currentSubject',function(newValue) {
			if ($scope.$parent.viewControl.usermap.visible) {
				$scope.initializeRefresh();
			}
		});
						
		// Listener for the csv location download button
		$scope.$watch('controlScope.control.locationCsvTrigger',function(newValue) {
			if ($scope.controlScope.control.locationCsvTrigger) {
				$scope.downloadLocationCSV();
				$scope.controlScope.control.locationCsvTrigger = false;
			}
		});

		// Listener for the block csv download button
		$scope.$watch('controlScope.control.blockCsvTrigger',function(newValue) {
			if ($scope.controlScope.control.blockCsvTrigger) {
				$scope.downloadBlockCSV();
				$scope.controlScope.control.blockCsvTrigger = false;
			}
		});
						
		//Listener for the variable that determines if the view gets shown or not
		$scope.$parent.$watch('viewControl.usermap.extended',function(newValue) {
			if ($scope.$parent.viewControl.usermap.extended) {
				$scope.fromStart = true;
				$scope.initializeRefresh();
			}
		});
		
		//Listener for the variable that determines if the view gets shown or not
		$scope.$watch('controlScope.mapControlData.censusRequest',function(newValue) {
			if ($scope.mapData.lastClickedMarker !== null && $scope.controlScope.mapControlData.censusRequest) {
				var marker = $scope.mapData.lastClickedMarker;
				$scope.showCensus(marker.getTitle(),marker.getPosition().lat(),marker.getPosition().lng());
				$scope.controlScope.mapControlData.censusRequest = false;
			}
			else if($scope.mapData.lastClickedMarker === null)	{
				$scope.controlScope.mapControlData.censusRequest = false;
			}
		});

		// Requests and sets the citySDK key
		gapi.client.securityEndpoint.getKey().execute(function(resp) {
			census_api.passKey(resp.returned);
		});

		/**
		 * This method is called whenever a new set of data
		 * needs to get shown on the map. Currently, that's the
		 * case when a new user is chosen or when the date in
		 * the datepicker changes.
		 * 
		 * It consists out of 3 parts:
		 * 						  
		 * 1. It caches the currently shown data in the
		 * mapData object. The key is the userId plus the unixRest,
		 * which defines the day. This part of the method is
		 * only triggered when a user is logged in and data has
		 * been actually loaded or been retrieved from the
		 * cache.
		 * 
		 * 2. It resets the map components. You can think of it
		 * like changing the map back into "factory mode". After
		 * this step, the map and all components it needs 
		 * (except for the cache) are exactly as they where 
		 * when this window got initialized first.
		 * 
		 * 3. Loading the new data. When the key for the needed
		 * data is in the cache, the data gets loaded from the
		 * cache. Only when it's not in the cache, the webapp
		 * will send a query to the App Engine to load the data.
		 * 
		 * This method implements a ticketing system to control, 
		 * which data gets shown when multiplemload at the same time.
		 * Hereby, data gets loaded into an mock object. The mock will
		 * only get assigned to the actual $scope at the very end of the
		 * method and only, when the process is the one with the latest
		 * start time. All other will end without changing the map.
		 */
		$scope.initializeRefresh = function() {
			
			var time = new Date().getTime();
			var user = $scope.controlScope.userData.currentSubject;
			var date = $scope.controlScope.dateData.unixRest;
			$scope.processTickets[user+date+""] = time+'';
			
			$scope.mapData.lastClickedMarker = null;
			
			if ($scope.mapData.refreshMap) {
				$scope.moveElementsOnResize();
			}
			if ($scope.dialog[0].parentElement === null) {
				$scope.dialog = loading_overlay.createLoadOverlay("Loading entries ...", this,'map_content');
			}

			// Step 1: Caching Data
							
			//In correlation to the source of the event change, the identifier for the cache entry gets built			
			var cacheUser = $scope.controlScope.userData.currentSubject;
			var cacheDate = $scope.controlScope.dateData.unixRest;
			var cacheSource = $scope.controlScope.sourceData.timelineSource;
			
			if ($scope.controlScope.eventTrigger === 'user') {
				cacheUser = $scope.controlScope.userData.lastSubject;
			} else if ($scope.controlScope.eventTrigger === 'date') {
				cacheDate = $scope.controlScope.dateData.lastUnixRest;
			} else if ($scope.controlScope.eventTrigger === 'timelineSource') {
				cacheSource = $scope.controlScope.sourceData.lastTimelineSource;
			}
			
			//Caches the data if there is data to cache
			if (cacheUser !== '' && !($scope.noData)) {
				$scope.cache = helper.cacheData($scope.cache, {
					marker : $scope.mapData.markers,
					mvc : $scope.mapData.mvcArray
				}, cacheUser + cacheDate);
			}
							
			// If there is no map, a flag is set to restart the loading when the map is ready
			if ($scope.mapData.map === 'no map') {
				$scope.initializePack.rekick = true;
				return;
			}
			// Step 2: Restoring "factory mode"
			else if ($scope.controlScope.userData.currentSubject !== '') {
				for (var i = 0; i < $scope.mapData.markers.length; i++) {
					$scope.mapData.markers[i].setMap(null);
					$scope.mapData.markers[i].circle.setMap(null);
				}
				$scope.mapData.markers = null;
				$scope.mapData.heatmap.setMap(null);
				$scope.mapData.mvcArray = new google.maps.MVCArray();
				$scope.mapData.heatmapDataArray = new google.maps.MVCArray();
				$scope.mapData.markers = [];
				$scope.mapData.bounds = new google.maps.LatLngBounds();
				$scope.mapData.heatmap = new google.maps.visualization.HeatmapLayer({
					data : $scope.mapData.heatmapDataArray,
					radius : 100
				});

				// Determines if the heatmap gets shown or not
				if ($scope.controlScope.mapControlData.isHeat) {
					$scope.mapData.heatmap.setMap($scope.mapData.map);
				} else {
					$scope.mapData.heatmap.setMap(null);
				}
				
				var cachedAt = -1;
				// Checks if the key is in the cache
				for (var j = 0; cachedAt === -1 && j < $scope.cache.size; j++) {
					if (user + date === $scope.cache.meta[j]) {
						cachedAt = j;
					}
				}
				
				// Step 3: Load new data. The method to do so depends on the fact if the data is cached or not.
				if (cachedAt === -1) {
					// Load data anew
					$scope.showMarkers(user, date);
				} else {
					// Load data from cache at the give index
					showFromCache(cachedAt, user, date);
				}
			} else {
				// Decrease the process ticket and remove load overlay if no user is chosen yet
				$scope.processTickets = [];
				if ($scope.dialog[0].parentElement !== null) {
					$scope.dialog.remove();
				}
			}
		};

		/**
		 * Queries all locations for the chosen user on the chosen day. The locations will be returned in one raw String, which will have to get refined.
		 * @param user: the chosen user
		 * @param date: the chosen date
		 */
		$scope.showMarkers = function(user, date) {
			gapi.client.analysisEndpoint.getInWindow({'user' : user, 'start' : date,'end' : (date + 86400000)}).execute(function(resp) {
				// Checks to see if the returned object is valid and usable
				if (resp !== false && typeof resp.items !== 'undefined' && resp.items.length !== 0) {
					$scope.noData = false;
					var entries = resp.items;
					
					//reates the mock
					var mock = {
						mvcArray: new google.maps.MVCArray(),
						markers: [],
						bounds: new google.maps.LatLngBounds()
					};
					
					//Fills the mock with the loaded values.
					for (var i = 0; typeof entries !== 'undefined' && i < entries.length; i++) {
						var location = [];
						location[0] = entries[i].latitude;
						location[1] = entries[i].longitude;
						
						var coordinates = new google.maps.LatLng(location[0],location[1]);
						mock.mvcArray.push(coordinates);
						
						mock.markers[i] = new google.maps.Marker({
							title : helper.getDateFromUnix(entries[i].timestamp)
						});
						mock.markers[i].addListener('click',function() {
							var self = this;
							$scope.$apply(function()	{
								$scope.censusData.origin = self.origin;
								$scope.censusData.accuracy = self.accuracy;
								$scope.censusData.latitude = self.getPosition().lat();
								$scope.censusData.longitude = self.getPosition().lng();
								$scope.mapData.lastClickedMarker = self;
							});
							
							if(this.circle.getMap() === null)	{
								this.circle.setMap($scope.mapData.map);
							}
							else	{
								this.circle.setMap(null);	
							}
						});
							
						mock.markers[i].setPosition(coordinates);
						mock.markers[i].setMap($scope.mapData.map);
						mock.markers[i].setVisible(false);
							
						mock.markers[i].bearing = entries[i].bearing;
						mock.markers[i].accuracy = entries[i].accuracy;
						mock.markers[i].origin = entries[i].origin;
						mock.markers[i].extras = entries[i].extras;
						
						// Sets the origin and changes the markers color, depending on teh origin
						if(mock.markers[i].origin === 'network')	{
							mock.markers[i].origin = entries[i].extras;
						}
						if(mock.markers[i].origin === 'cell')	{
							mock.markers[i].origin = mock.markers[i].origin + ' tower';
						}
						if(mock.markers[i].origin === 'wifi')	{
							mock.markers[i].setIcon('https://maps.google.com/mapfiles/ms/icons/blue-dot.png');
						}
						else if(mock.markers[i].origin === 'cell tower')	{
							mock.markers[i].setIcon('https://maps.google.com/mapfiles/ms/icons/green-dot.png');									
						}
						else if(mock.markers[i].origin === 'gps')	{
							mock.markers[i].setIcon('https://maps.google.com/mapfiles/ms/icons/red-dot.png');
						}
							
						mock.markers[i].circle = new google.maps.Circle({
				            strokeColor: '#FF0000',
				            strokeOpacity: 0.8,
				            strokeWeight: 2,
				            map: null,
				            fillColor: '#FF0000',
				            fillOpacity: 0.35,
				            center: mock.markers[i].getPosition(),
				            radius: mock.markers[i].accuracy
				          });
							
						mock.bounds.extend(mock.markers[i].getPosition());
					}
						
					var maxTicket = 0;
					var keys = Object.keys($scope.processTickets);
					for(var k=0; k<keys.length; k++)	{
						if(maxTicket < parseInt($scope.processTickets[keys[k]]))	{
							maxTicket = parseInt($scope.processTickets[keys[k]]);
						}
					}
					
					//Only sets the mock as actual data when the ticket of this request is the latest one
					if(maxTicket === parseInt($scope.processTickets[user + date]))	{	
						$scope.mapData.markers = mock.markers;
						$scope.mapData.bounds = mock.bounds;
						$scope.mapData.mvcArray = mock.mvcArray;
						if (typeof entries !== 'undefined') {
							$scope.centerMap();
						}
						$scope.processTickets = {};
						$scope.filterAccordingToSlider();
					}
				}
				else {
					// Closes load overlay and sets no data flag if response is empty
					$scope.noData = true;
					if ($scope.dialog[0].parentElement !== null) {
						$scope.dialog.remove();
					}
				}
			});
		};

		/**
		 * Copies the data from the cache onto the map.
		 * 
		 * @param index:
		 *            The index where the markers reside in the
		 *            cache
		 */
		function showFromCache(index, user, date) {
			
			var mock = {
					mvcArray: new google.maps.MVCArray(),
					markers: [],
					bounds: new google.maps.LatLngBounds()
				};
			
			mock.markers = $scope.cache.content.marker[index];
			mock.mvcArray = $scope.cache.content.mvc[index];
			
			// Connects markers with map and hides them if heatmap shall be shown
			for (var i = 0; i <mock.markers.length; i++) {
				mock.markers[i].setMap($scope.mapData.map);
				if ($scope.controlScope.mapControlData.isHeat) {
					mock.markers[i].setVisible(false);
				}
				// Extends the bounds, so that in the end all markers will be visible on the map at once
				mock.bounds.extend(mock.markers[i].getPosition());
			}
			
			var maxTicket = 0;
			var keys = Object.keys($scope.processTickets);
			for(var k=0; k<keys.length; k++)	{
				if(maxTicket < parseInt($scope.processTickets[keys[k]]))	{
					maxTicket = parseInt($scope.processTickets[keys[k]]);
				}
			}
			
			//Only sets the mock as actual data when the ticket of this request is the latest one
			if(maxTicket === parseInt($scope.processTickets[user + date]))	{
				$scope.mapData.markers = mock.markers;
				$scope.mapData.bounds = mock.bounds;
				$scope.mapData.mvcArray = mock.mvcArray;
				if (typeof entries !== 'undefined') {
					$scope.centerMap();
				}
				$scope.processTickets = {};
				$scope.filterAccordingToSlider();
			} 
		}
		
		// Listener for the center Map button
		$scope.$watch('controlScope.mapControlData.centerMapOrder',function() {
			if ($scope.controlScope.mapControlData.centerMapOrder) {
				$scope.centerMap();
				$scope.controlScope.mapControlData.centerMapOrder = false;
			}
		});
		
		//Listener for the slider
		$scope.$watchGroup(['controlScope.slider.minValue','controlScope.slider.maxValue'], function(value) {
			$scope.filterAccordingToSlider();
		});
		
		//Listener for checkboxes
		$scope.$watchGroup(['controlScope.mapControlData.wifiAsOriginChecked','controlScope.mapControlData.cellAsOriginChecked','controlScope.mapControlData.gpsAsOriginChecked'], function(value) {
			$scope.filterAccordingToSlider();
		});
		
		/**
		 * Centers map location and zoom on the markers (all of
		 * them, not only the shown ones)
		 */
		$scope.centerMap = function() {
			$scope.mapData.map.fitBounds($scope.mapData.bounds);
			$scope.mapData.map.setCenter($scope.mapData.bounds.getCenter());
		};

		/**
		 * Searches the entry String for the code word. returnes
		 * everything between the code word and the next comma in
		 * line.
		 * 
		 * @param code:
		 *            The codewort. everything after the
		 *            codewort until the next comma will be
		 *            returned as result
		 * @param entry:
		 *            a String that contains the required data.
		 *            Format has to be csv
		 * @returns
		 */
		function refineData(code, entry) {
			var done = false;
			var returned = 'error';
			for (var i = 0; i < entry.length && !done; i++) {
				// Checks for equality
				if (entry.charAt(i) === code.charAt(0)) {
					var equal = true;
					// marks when unequal
					for (var l = 1; l < code.length; l++) {
						if (entry.charAt(i + l) !== code.charAt(l)) {
							equal = false;
						}
					}
					if (equal) {
						returned = "";
						for (var m = (i + code.length); entry.charAt(m) !== '",="'; m++) {
							returned = returned + entry.charAt(m);
						}
						done = true;
					}
				}
			}
			return returned;
		}

		/**
		 * Shows and hides the heatmap by setting its map. Also
		 * shows/hides the markers whenever necessary.
		 */
		$scope.$watch('controlScope.mapControlData.isHeat',function() {
			var newMap;
			if (!$scope.controlScope.mapControlData.isHeat) {
				newMap = $scope.mapData.map;
				document.getElementById("heatmap_button").innerHTML = "show Heatmap";
			} else {
				newMap = null;
				document.getElementById("heatmap_button").innerHTML = "show Markermap";
			}
			if (newMap === null) {
				$scope.mapData.heatmap.setMap($scope.mapData.map);
			} else {
				$scope.mapData.heatmap.setMap(null);
			}
			for(var i = 0; i < $scope.mapData.markers.length; i++) {
				if (newMap !== null) {
					$scope.mapData.markers[i].setVisible(true);
				} else {
					$scope.mapData.markers[i].setVisible(false);
				}
			}
			$scope.filterAccordingToSlider();
		});
		
		/**
		 * At rendering, all markers get shown and the heatmap
		 * is empty. This method sorts out the markers which
		 * shall not be seen and fills the heatmap. It updates
		 * automatically whenever the slider is moved, but is
		 * also called manually sometimes by methods.
		 */
		$scope.filterAccordingToSlider = function() {

			if (Object.keys($scope.processTickets).length === 0 && $scope.controlScope.userData.currentSubject !== '') {
				/*
				 * Completly clears the heatmap. The heatmapdata
				 * is a stack, therefore injecting and removing
				 * at specific indexes is not possible
				 */
				$scope.mapData.heatmapDataArray.clear();
				for (var i = 0; i < $scope.mapData.markers.length; i++) {
					var value = Math.floor((helper.getUnixFromDate($scope.mapData.markers[i].getTitle(),$scope.controlScope.dateData.unixRest) - $scope.controlScope.dateData.unixRest) / 60000);
					
					var originCheck = false;
					if($scope.mapData.markers[i].origin === 'gps')	{
						originCheck = $scope.controlScope.mapControlData.gpsAsOriginChecked;
					}
					else if($scope.mapData.markers[i].origin === 'wifi')	{
						originCheck = $scope.controlScope.mapControlData.wifiAsOriginChecked;
					}
					else if($scope.mapData.markers[i].origin === 'cell tower')	{
						originCheck = $scope.controlScope.mapControlData.cellAsOriginChecked;
					}
					
					if (value <= $scope.controlScope.slider.maxValue && $scope.controlScope.slider.minValue <= value && originCheck) {
						// Only change if the marker is not
						// visible while it shall be
						if (!($scope.mapData.markers[i].getVisible()) && !($scope.controlScope.mapControlData.isHeat)) {
							$scope.mapData.markers[i].setVisible(true);
						}
						// Adds the location to the heatmap
						$scope.mapData.heatmapDataArray.push($scope.mapData.mvcArray.getAt(i));
					} else {
						// Only change if the marker is visible
						// while it shall not be
						if ($scope.mapData.markers[i].getVisible()) {
							$scope.mapData.markers[i].setVisible(false);
							$scope.mapData.markers[i].circle.setMap(null);
						}
					}
				}
			}
			if ($scope.dialog[0].parentElement !== null && $scope.mapData.refreshMap) {
				$scope.dialog.remove();
			}
		};
				
		//Passes the callback method to the allowed_directive
		setTimeout(function() {
			allowed_directive_service.passDirectiveCallback($scope.initializePack.initializeCallback);
		}, 0);
		
		/**
		 * Loads census data for a given coordinate pair. Saves
		 * the returned data in the census data cache.
		 */
		$scope.showCensus = function(time, lat, lng) {
			$scope.dialog = loading_overlay.createLoadOverlay("Loading census data ...", this,"map_content");
			census_api.sendRequest(lat,lng,function(resp, id) {
				var count = 0;
				var persons = 0;
				var households = 0;
				var averages = [];
				if (typeof resp.data !== 'undefined') {
					
					// Calculate the averages from the fetched data.
					for ( var num in resp.data[0]) {
						persons = persons + parseInt(resp.data[0][num]) * (count + 1);
						households = households + parseInt(resp.data[0][num]);
						if (count === 6) {
							if (households !== 0) {
								averages[averages.length] = Number((persons / households).toFixed(1));
							} else {
								averages[averages.length] = 0;
							}
							persons = 0;
							households = 0;
						}
						
						count++;
						count = count % 7;
					}
					
					$scope.censusData.blockData = resp;
					delete $scope.censusData.blockData.variables;
					delete $scope.censusData.blockData.data;
					for ( var index in $scope.censusData.blockData) {
						if ($scope.censusData.blockData[index] === null) {
							$scope.censusData.blockData[index] = "No information in census response";
						}
					}
				} else {
					$scope.censusData.blockData = {};
					$scope.censusData.blockData.state = "No response from census";
					$scope.censusData.blockData.county = "No response from census";
					$scope.censusData.blockData.tract = "No response from census";
					$scope.censusData.blockData.blockGroup = "No response from census";
					$scope.censusData.blockData.block = "No response from census";
					$scope.censusData.blockData.place_name = "No response from census";
					for (var i = 0; i < 3; i++) {
						averages[i] = "No response from census";
					}
				}
				
				$scope.$apply(function() {
					$scope.censusData.averages = {};
					$scope.censusData.averages.owner = averages[0];
					$scope.censusData.averages.renter = averages[1];
					$scope.censusData.averages.total = averages[2];
					$scope.dialog.remove();
				});
			}, true, -1);
		};
		
		/**
		 * Starts a download for all map data as a csv-file.
		 * Currently, the download includes all markers of the
		 * chosen day, regardless of the fact if they are shown
		 * on the map currently.
		 */
		$scope.downloadBlockCSV = function() {
			var csvData = $scope.$parent.$parent.controlControl.childScope.csvParameter;
			csvData.csvProgressMap = 10;
			if (csvData.createCsvMap === false) {
				csvData.createCsvMap = true;
			} else {
				csvData.createCsvMap = false;
				csvData.csvProgressMap = 0;
				csvData.maxMap = 0;
				census_api.cancelDownload();
				return;
			}
			// Prepares data to be passed to (out) census service
			$scope.controlScope.userData.chosen_user = $scope.controlScope.userData.users[2];
			var coords = [];
			for (var i = 0; i < $scope.mapData.markers.length; i++) {
				coords[i] = {};
				coords[i].time = helper.getUnixFromDate($scope.mapData.markers[i].getTitle(),$scope.controlScope.dateData.unixRest);
				coords[i].lat = $scope.mapData.markers[i].getPosition().lat();
				coords[i].lng = $scope.mapData.markers[i].getPosition().lng();
			}
			var date = new Date($scope.controlScope.dateData.unixRest);
			var day = date.getDate();
			var month = 1 + date.getMonth();
			if (day < 10) {
				day = '0' + day;
			}
			if (month < 10) {
				month = '0' + month;
			}
			var dayString = "=\"" + month + "/" + day + "/" + date.getFullYear() + "\"";
			census_api.csvDownload(coords,dayString,$scope.controlScope.userData.currentSubject,function(percent) {
				
				//Hides progress bar if export is done
				var phase = $scope.$root.$$phase;
				if (phase === '$apply' || phase === '$digest') {
					if (percent >= 100 || percent === -1) {
						csvData.createCsvMap = false;
						csvData.csvProgressMap = 0;
					}
					else	{
						csvData.csvProgressMap = percent;
					}
				} else {
					$scope.$apply(function() {
						csvData.csvProgressMap = percent;
						if (percent >= 100 || percent === -1) {
							csvData.createCsvMap = false;
							csvData.csvProgressMap = 0;
						}
						else	{
							csvData.csvProgressMap = percent;
						}
					});
				}
			});
		};
		
		/**
		 * Exports the last 1000 locations of the user as CSV
		 * file. Formated to be openable in Excel.
		 */
		$scope.downloadLocationCSV = function() {
			var subject = $scope.controlScope.userData.currentSubject;
			var date = new Date($scope.controlScope.dateData.unixRest);
			var day = date.getDate();
			var month = 1 + date.getMonth();
			if (day < 10) {
				day = '0' + day;
			}
			if (month < 10) {
				month = '0' + month;
			}
			var row = 'data:text/csv;charset=utf-8,' + '"User","Time","latitude","longitude","bearing","origin","accuracy","extras"\r\n';
			for (var i = $scope.mapData.markers.length - 1; 0 <= i; i--) {
				row = row + '="' + subject + '",="' + $scope.mapData.markers[i].getTitle() + '",="' + $scope.mapData.markers[i].getPosition().lat() + '",="' + $scope.mapData.markers[i].getPosition().lng() + '",="' + $scope.mapData.markers[i].bearing + '",="' + $scope.mapData.markers[i].origin + '",="' + $scope.mapData.markers[i].accuracy +  '",="' + $scope.mapData.markers[i].extras + '"\r\n';
			}
			var encodedUri = encodeURI(row);
			var link = document.createElement("a");
			link.setAttribute("href",encodedUri);
			link.setAttribute("download","location_export_" + subject + "_" + month + "_" + day + "_" + date.getFullYear() + ".csv");
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		};
		
		$scope.initializePack.initializeCallback();
	}
});