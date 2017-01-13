angular.
module('mapV2').
  component('mapV2', {
    templateUrl: 'html/map_v2_view.template.html',
    controller: function MapController(NgMap, $scope, $timeout, loading_overlay, census_api, helper, allowed_directive_service) {
    	
    	"use strict";
    	$scope.dialog = loading_overlay.createLoadOverlay('Loading the map ...', this, 'map_content');
    	
    	$scope.controlScope = $scope.$parent.controlControl.childScope;

    	$scope.noData = false;
    	$scope.bounds = new google.maps.LatLngBounds();
    	$scope.rekick = false;
    	$scope.processTickets = 0;
    	
    	// All the data we need to show the Google Map, markers and the heatmap layer
    	$scope.mapData = {
    			map: 'no map',
    			mvcArray: new google.maps.MVCArray(),
    			heatmapDataArray: new google.maps.MVCArray(),
    			heatmap : {},
    			isHeat: false,
    			markers: [],
    			center: new google.maps.LatLng(38.97, -76.92)
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
		
    	$scope.cache =	{
    		content: {
    			mvc: [],
    			marker: []
    		},
    		meta: [],
    		pointer: 0,
    		size: 5
    	};
    	
    	// Listener for the datepicker
    	$scope.$watch('controlScope.dateData.unixRest', function(newValue) { 
			if($scope.$parent.viewControl.usermap.visible && typeof newValue !== 'undefined' && newValue !== 'Please select a date ...')	{
				$scope.initializeRefresh();
			}
	    });
    	
    	// Listener for the userpicker
    	$scope.$watch('controlScope.userData.currentSubject', function(newValue) { 
			if($scope.$parent.viewControl.usermap.visible)	{
				$scope.initializeRefresh();
			}
		});
		
    	$scope.$watch('controlScope.control.locationCsvTrigger', function(newValue) { 
			if($scope.controlScope.control.locationCsvTrigger)	{
				$scope.controlScope.control.locationCsvTrigger
				$scope.downloadLocationCSV();
			}
	    });
    	
    	// Listener for the timeline csv download button
    	$scope.$parent.$watch('viewControl.usermap.visible', function(newValue) { 
			if($scope.$parent.viewControl.usermap.visible)	{
				$scope.initializeRefresh();
			}
	    });
		
    	$scope.$watch('controlScope.control.blockCsvTrigger', function(newValue) { 
			if($scope.controlScope.control.blockCsvTrigger)	{
				$scope.controlScope.control.blockCsvTrigger
				$scope.downloadBlockCSV();
			}
	    });
    	
		// Requests and sets the citySDK key
		gapi.client.securityEndpoint.getKey().execute(function(resp){
			census_api.passKey(resp.returned);
		});	
		

		/**
		 * This method is called whenever a new set of data needs to get shown on the map.
		 * Currently, that's the case when a new user is chosen or when the date in the datepicker changes.
		 * 
		 * It consists of 4 parts:
		 * 
		 * 0. Create load-hash
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
		$scope.initializeRefresh = function()	{
			
			//Step 0: Count processes
			$scope.processTickets++;
			
			if($scope.dialog[0].parentElement === null)	{
				$scope.dialog = loading_overlay.createLoadOverlay("Loading entries ...", this, 'map_content');
			}

			//Step 1: Caching data
			if($scope.controlScope.userData.lastSubject !== '' && !($scope.noData))	{
				$scope.cache = helper.cacheData($scope.cache, {
					marker: $scope.mapData.markers,
					mvc: $scope.mapData.mvcArray
				}, $scope.controlScope.userData.lastSubject + $scope.controlScope.dateData.unixRest);
			}
			
			if($scope.mapData.map === 'no map')	{
				$scope.rekick = true;
				$scope.processTickets--;
				return;
			}
			//Step 2: Restoring "factory mode"
			else if($scope.controlScope.userData.currentSubject !== ''){
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
				if($scope.controlScope.mapControlData.isHeat)	{
					$scope.mapData.heatmap.setMap($scope.mapData.map);
				}
				else	{
					$scope.mapData.heatmap.setMap(null);				
				}
			
				var cachedAt = -1;
				// Checks if the key is in the cache
				for(var j=0; cachedAt === -1 && j< $scope.cache.size; j++){
					if($scope.controlScope.userData.currentSubject + $scope.controlScope.dateData.unixRest === $scope.cache.meta[j])	{
						cachedAt = j;
					}
				}
				
				//Step 3: Load new data. The method to do so depends on the fact if the data is cached or not.
				if(cachedAt === -1)	{
					// Load data anew
					$scope.showMarkers();
				}
				else	{
					// Load data from cache at the give index
					showFromCache(cachedAt);
				}
			}
			else{
				$scope.processTickets--;
				if($scope.dialog[0].parentElement !== null)	{
	     		   $scope.dialog.remove();
				}
	     	}
		};
		
		
		/**
		 * Queries all locations for the chosen user on the chosen day. The locations will be rerturned in one raw String,
		 * which will have to get refined.
		 */
		$scope.showMarkers = function()	{
			var strUser = document.getElementById("chosen_user").options[document.getElementById("chosen_user").selectedIndex].text;
			//Those are 64-bit integers. They have to be passed to the endpoint as long!
			//Querying for the data
			gapi.client.analysisEndpoint.getInWindow({'user' : strUser, 'start' : $scope.controlScope.dateData.unixRest , 'end' : ($scope.controlScope.dateData.unixRest + 86400000)}).execute(function(resp) {
        	   //Checks to see if the returned object is valid and usable
    	   		$scope.processTickets--;
        	   if(resp !== false && typeof resp.items !== 'undefined' && resp.items.length !== 0)	{	   		
        	   		$scope.noData = false;
        	   		var entries = resp.items;
        	   		if($scope.processTickets === 0)	{
        	   			for(var i=0; typeof entries !== 'undefined' && i<entries.length; i++)	{
        				
	        				var location = [];
	        				location[0] = entries[i].latitude;
	        				location[1] = entries[i].longitude;
	        				
	        				var coordinates = new google.maps.LatLng(location[0], location[1]);
		        			$scope.mapData.mvcArray.push(coordinates);
		
		        			$scope.mapData.markers[i] = new google.maps.Marker({
		        				title: helper.getDateFromUnix(entries[i].timestamp)
		        			});
		        			$scope.mapData.markers[i].addListener('click', function() {
		        				$scope.censusData.latitude = this.getPosition().lat();
		        				$scope.censusData.longitude = this.getPosition().lng();
		        				$scope.showCensus(this.getTitle(), this.getPosition().lat(), this.getPosition().lng());
		        		    });
	
		        			$scope.mapData.markers[i].setPosition(coordinates);
		        			$scope.mapData.markers[i].setMap($scope.mapData.map);
		        			$scope.mapData.markers[i].setVisible(false);
		        			$scope.bounds.extend($scope.mapData.markers[i].getPosition());
	        			}
	        			
	        			if(typeof entries !== 'undefined' && $scope.processTickets === 0)	{
	        				$scope.centerMap();
	        			}
	        			
	        			$scope.filterAccordingToSlider();
        	   		}
        		}
        	   	else	{
        		   $scope.noData = true;
        		   $scope.processTickets--;
        		   if($scope.dialog[0].parentElement !== null)	{
    	     		   $scope.dialog.remove();
        		   }
        	   	}
        	});  
		};
		
		/**
		 * Copies the data from the cache onto the map.
		 * @param index: The index where the markers reside in the cache
		 */
		function showFromCache(index)	{
			$scope.mapData.markers = $scope.cache.content.marker[index];
			$scope.mapData.mvcArray = $scope.cache.content.mvc[index];
			for(var i=0; i<$scope.mapData.markers.length; i++){
				$scope.mapData.markers[i].setMap($scope.mapData.map);
				if($scope.controlScope.mapControlData.isHeat){
					$scope.mapData.markers[i].setVisible(false);
				}
				// Extends the bounds, so that in the end all markers will be visible on the map at once
				$scope.bounds.extend($scope.mapData.markers[i].getPosition());
			}
			$scope.centerMap();
			$scope.filterAccordingToSlider();
		}
		
		$scope.$watch('controlScope.mapControlData.centerMapOrder', function()	{
			if($scope.controlScope.mapControlData.centerMapOrder)	{
				$scope.centerMap();
				$scope.controlScope.mapControlData.centerMapOrder = false;
			}
		});
		
		$scope.$watchGroup(['controlScope.slider.minValue','controlScope.slider.maxValue'], function(value)	{
	    	$scope.filterAccordingToSlider();
	    });
		
		/**
		 * Centers map location and zoom on the markers (all of them, not only the shown ones)
		 */
		$scope.centerMap = function()	{
			$scope.mapData.map.fitBounds($scope.bounds);
			$scope.mapData.map.setCenter($scope.bounds.getCenter());
		};
		
		
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
		$scope.$watch('controlScope.mapControlData.isHeat', function() {
			var newMap;
			if(!$scope.controlScope.mapControlData.isHeat)	{
				newMap = $scope.mapData.map;
				document.getElementById("heatmap_toggle").innerHTML = "show Heatmap";
			}
			else	{
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
	    });
	    
	    
		/**
		 * At rendering, all markers get shown and the heatmap is empty. This method
		 * sorts out the markers which shall not be seen and fills the heatmap.
		 * It updates automatically whenever the slider is moved, but is also called manually
		 */
		$scope.filterAccordingToSlider = function()	{
			
			if($scope.processTickets === 0 && $scope.controlScope.userData.currentSubject !== '')	{
			    /* Completly clears the heatmap. The heatmapdata is a stack, therefore injecting
				and removing at specific indexes is not possible*/
        		$scope.mapData.heatmapDataArray.clear();
        		for(var i=0; i<$scope.mapData.markers.length; i++)	{
        			var value = Math.floor((helper.getUnixFromDate($scope.mapData.markers[i].getTitle(), $scope.controlScope.dateData.unixRest)-$scope.controlScope.dateData.unixRest)/60000);
        			if(value <= $scope.controlScope.slider.maxValue || $scope.controlScope.slider.minValue <= value){
        				// Only change if the marker is not visible while it shall be
        				if(!($scope.mapData.markers[i].getVisible()) && !($scope.controlScope.mapControlData.isHeat))	{
        					$scope.mapData.markers[i].setVisible(true);
        				}
        				// Adds the location to the heatmap
    					$scope.mapData.heatmapDataArray.push($scope.mapData.mvcArray.getAt(i));
        			}
        			else	{
        				// Only change if the marker is visible while it shall not be
        				if($scope.mapData.markers[i].getVisible())	{
        					$scope.mapData.markers[i].setVisible(false);
        				}
        			}
        		}
        	}
			if($scope.dialog[0].parentElement !== null)	{
     		   $scope.dialog.remove();
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
				$scope.dialog.remove();
				$timeout(function () {
				      $scope.$broadcast('rzSliderForceRender');
				    });
				var thisMap = NgMap.getMap({id:"map"});
				thisMap.then(function(returnMap){
					$scope.mapData.map = returnMap;
					if($scope.rekick)	{
						$scope.rekick = false;
						$scope.initializeRefresh();
					}
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
			$scope.dialog = loading_overlay.createLoadOverlay("Loading census data ...", this, "map_content");
			census_api.sendRequest(lat, lng,
			function(resp, id)	{
				
				var count = 0;
				var persons = 0;
				var households = 0;
				var averages = [];
				if(typeof resp.data !== 'undefined')	{
				
					for(var num in resp.data[0])	{
					
						persons = persons + parseInt(resp.data[0][num])*(count+1);
						households = households + parseInt(resp.data[0][num]);
						if(count === 6){
							if(households !== 0){
								averages[averages.length] = Number((persons/households).toFixed(1));
							}
							else	{
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
					for(var index in $scope.censusData.blockData){
						if($scope.censusData.blockData[index] === null){
							$scope.censusData.blockData[index] = "No information in census response";
						}
					} 
				}
				else	{
					$scope.censusData.blockData = {};
					$scope.censusData.blockData.state = "No response from census";
					$scope.censusData.blockData.county = "No response from census";
					$scope.censusData.blockData.tract = "No response from census";
					$scope.censusData.blockData.blockGroup = "No response from census";
					$scope.censusData.blockData.block = "No response from census";
					$scope.censusData.blockData.place_name = "No response from census";
					for(var i=0; i<3; i++)	{
						averages[i] = "No response from census";
					}
				}
				
				// Necessary to trigger immediate update in Angular
				$scope.$apply(function()	{					
					$scope.censusData.averages = {};
					$scope.censusData.averages.owner = averages[0]; 
					$scope.censusData.averages.renter = averages[1]; 
					$scope.censusData.averages.total = averages[2];
					$scope.dialog.remove();
				});
			}, true, -1);
		};
		
		
		/**
		 * Starts a download for all map data as a csv-file. Currently, the download includes all markers of the chosen day,
		 * regardless of the fact if they are shown on the map currently. 
		 */
		$scope.downloadBlockCSV = function()	{
	    	var csvData = $scope.$parent.$parent.controlControl.controlScope.csvParameter;
			csvData.csvProgressMap = 10;
			if(csvData.createCsvMap === false)	{
				csvData.createCsvMap = true;
			}
			else	{
				csvData.createCsvMap = false;
    			csvData.csvProgressMap = 0;
    			csvData.maxMap = 0;
    			census_api.cancelDownload();
				return;
			}
    		// Prepares data to be passed to (out) census service
			$scope.userData.chosen_user = $scope.userData.users[2];
			var coords = [];
			for(var i=0; i<$scope.mapData.markers.length; i++)	{
				coords[i] = {};
				coords[i].time = helper.getUnixFromDate($scope.mapData.markers[i].getTitle(), $scope.controlScope.dateData.unixRest);
				coords[i].lat = $scope.mapData.markers[i].getPosition().lat();
				coords[i].lng = $scope.mapData.markers[i].getPosition().lng();
			}
			var date = new Date($scope.controlScope.dateData.unixRest);
			var day = date.getDate();
			var month = 1 + date.getMonth();
			if(day<10)	{
				day = '0' + day;
			}
			if(month<10)	{
				month = '0' + month;
			}
			var dayString = "=\"" + month + "/" + day + "/" + date.getFullYear()+ "\"";
			census_api.csvDownload(coords, dayString, $scope.controlScope.userData.currentSubject, function(percent)	{
		    	
				var phase = $scope.$root.$$phase;
				if(phase === '$apply' || phase === '$digest') {
		    		csvData.csvProgressMap = percent;
		    		if(percent >= 100){
			    		csvData.createCsvMap = false;
			    	}
				} else {
					$scope.$apply(function()	{
			    		csvData.csvProgressMap = percent;
			    		if(percent >= 100){
				    		csvData.createCsvMap = false;
				    	}
			    	});
				}
			});
		};
		
		/**
		 * Exports the last 1000 locations of the user as CSV file. Formated to be openable in Excel.
		 */
		$scope.downloadLocationCSV = function()	{
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
			gapi.client.analysisEndpoint.callForLocationCSV({"user" : subject}).execute(function(resp){
				var row = 'data:text/csv;charset=utf-8,' + '"User","Time","latitude","longitude","bearing","accuracy"\r\n';
				for(var i=resp.items.length-1; 0<=i; i--)	{
					row = row + '"' + subject + '",' + helper.getDateFromUnix(resp.items[i].timestamp) + ',' + resp.items[i].latitude + ',' + resp.items[i].longitude + ',' + resp.items[i].bearing + ',' + resp.items[i].accuracy + '\r\n';
				}
				var encodedUri = encodeURI(row);
				var link = document.createElement("a");
				link.setAttribute("href", encodedUri);
				link.setAttribute("download", "location_export_" + subject + "_" + month + "_" + day + "_" + date.getFullYear() + ".csv");
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
			});
		};
    }
  });