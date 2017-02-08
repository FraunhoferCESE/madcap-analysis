/**
 * This service provides all functionalities which handle census data. This includes data fetching as well as
 * preparing of census data, for example for export.
 */
angular.module('madcap-analysis')
.factory('census_api', function(helper){
	  "use strict";
	  	  
	  var key = 'no key';
	  var censusModule = 0;
	  var exportId = 0;
	  
	  return	{
	  	
		cancelDownload : function()	{
			exportId++;
		},
		
		  /**
		   * Gets the census data, refines it and offers it as download. Census data gets either loaded from
		   * the census bureau or the cache when data with the same coordinates has been loaded before.
		   * @param array: The coordinate array
		   * @param day: The date the data belongs to
		   * @param updater: A method which gets called continuosly throughout the download process.
		   * 				Can be used to update a progress bar for example
		   */
		csvDownload : function(array, day, user, updater)	{
			var myId = exportId;
			var calls = array.length;
			var progressUpdate = updater;
			var data = [];
			var userRef = user;
			var dayRef = day; 
			var self = this;
			var updateValue = 0;
			var oldUpdateValue = 0;
			var threshold = 0;
			var progress = 0;
			var stepSize = 100;
			
			progressUpdate(0);
			sendBatchRequest(progress, stepSize);
			
			/* For every coordinate pair, try to load it from the cache. If that fails, load it from the census.
			When loaded from the census, the data gets saved into the cache.*/
			function sendBatchRequest(start, size)	{
				progress = start;
				if(start + size <array.length)	{
					threshold = start + size;
				}
				else	{
					threshold = array.length;
				}
				for(var i=progress; i<threshold; i++)	{
					data[i] = {};
					data[i].time = array[i].time;
					requestLookup(i);
				}
			}

			function requestLookup(passedI)	{
				self.sendRequest(array[passedI].lat, array[passedI].lng, function(resp, id)	{
					if(myId !== exportId){
						return;
					}
					if(typeof resp.data === 'undefined')	{
						requestLookup(id);
					}
					else	{
						progress++;		
						var count = 0;
						var persons = 0;
						var households = 0;
						var averages = [];
						
						for(var num in resp.data[0])	{
							if(num !== 'NAME')	{
							
								persons = persons + parseInt(resp.data[0][num])*(count+1);
								households = households + parseInt(resp.data[0][num]);
							
								count++;
								
								if(count === 7){
									if(households !== 0)	{
										averages[averages.length] = Number((persons/households).toFixed(1));
									}
									else	{
										averages[averages.length] = 0;
									}
									persons = 0;
									households = 0;
									count = 0;
								}
							}
						}
						data[id].block = resp.block; 
						data[id].avOwner = averages[0]; 
						data[id].avRenter = averages[1];
						data[id].avTotal = averages[2]; 
					
						if(--calls === 0){
							createCsv(helper.refineDataOld(data));
						}
						updateDuringFetch();
					}
					
					if(progress===threshold){
						if(myId === exportId)	{
							sendBatchRequest(progress, stepSize);
						}
						else	{
							progressUpdate(-1);
						}
					}
				}, true, passedI);					
			}
			
			/**
			 * Calls the update method when the progress grew by one percent
			 */
			function updateDuringFetch()	{
				updateValue = updateValue + (100/array.length);
				if(Math.ceil(oldUpdateValue) < Math.ceil(updateValue))	{
					oldUpdateValue = updateValue;
					progressUpdate(Math.ceil(updateValue));
				}
			}
			
			
			
			function createCsv(data)	{
				var row = 'data:text/csv;charset=utf-8,"Day","User","Start time","End time","Block","Average household size (owner)","Average household size (renter)","Average household size (total)"\r\n';
				for(var i=0; i<data.length;i++)	{
					if(i !== 0 && i !== data.length-1){
						row = row + dayRef + ',"' + userRef + '",' + helper.getDateFromUnix(data[i].start) + ',' + helper.getDateFromUnix(data[i].end) + ',' + data[i].block + ',' + data[i].avOwner + ',' + data[i].avRenter + ',' + data[i].avTotal + '\r\n';
					}
					else if(i === 0){
						row = row + dayRef + ',"' + userRef + '",' + '00:00:00' + ',' + helper.getDateFromUnix(data[i].end) + ',' + data[i].block + ',' + data[i].avOwner + ',' + data[i].avRenter + ',' + data[i].avTotal + '\r\n';
					}
					else	{
						row = row + dayRef + ',"' + userRef + '",' + helper.getDateFromUnix(data[i].start) + ',' + '23:59:59' + ',' + data[i].block + ',' + data[i].avOwner + ',' + data[i].avRenter + ',' + data[i].avTotal + '\r\n';
					}
				}
				var encodedUri = encodeURI(row);
				var link = document.createElement("a");
				link.setAttribute("href", encodedUri);
				link.setAttribute("download", 'location_blocks_' + userRef + '_' + dayRef.substring(2,4) + '_' + dayRef.substring(5,7) + '_' + dayRef.substring(8,12) + '.csv');
				
				document.body.appendChild(link); // Required for FF
				link.click();
				document.body.removeChild(link); // Required for FF
			}
		},  
		
		/**
		 * Passes the key for citySDK to the service after it got retrieved from the datastore.
		 */
		passKey : function(passedKey)	{
			key = passedKey;
		},
	  
		/**
		 * Creates an dialog with a loading spinner and custom message.
		 * @return the dialog, so that it can be closed in the controller
		 */
        sendRequest : function(lat, lng, callback, callAPI, id) {
        	if(typeof censusModule !== 'object')	{
    	        censusModule = new CensusModule(key);
    		}
        	 var request = {
                     "lat": lat,
                     "lng": lng,
                     "level": "block",
                     "variables": [
                        "H0160011",
                        "H0160012",
                        "H0160013",
                        "H0160014",
                        "H0160015",
                        "H0160016",
                        "H0160017",
                        
                        "H0160003",
                        "H0160004",
                        "H0160005",
                        "H0160006",
                        "H0160007",
                        "H0160008",
                        "H0160009",
                        
                        "H0130002",
                        "H0130003",
                        "H0130004",
                        "H0130005",
                        "H0130006",
                        "H0130007",
                        "H0130008",
                     ],
                     "api": "sf1",
                     "year": "2010"
                 };

        	if(!callAPI)	{
        		censusModule.geoRequest(request, function(resp)	{
        			callback(resp, id);
        		}); 
        	}
        	else	{
        		censusModule.apiRequest(request, function(resp)	{
        			callback(resp, id);
        		});
        	}
        }
    };
}
);