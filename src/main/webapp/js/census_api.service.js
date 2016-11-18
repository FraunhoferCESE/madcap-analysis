/**
 * This service provides all functionalities which handle census data. This includesdata fetching as well as
 * preparing of census data, for example for export.
 */
angular.module('madcap-analysis')
.factory('census_api', function(time_parse){
	  "use strict";
	  	  
	  var key = 'no key';
	  var censusModule = 0;
	  
	  return	{
	  	
		  /**
		   * Gets the census data, refines it and offers it as download. Census data gets either loaded from
		   * the census bureau or the cache when data with the same coordinates has been loaded before.
		   * @param array: The coordinate array
		   * @param day: The date the data belongs to
		   * @param updater: A method which gets called continuosly throughout the download process.
		   * 				Can be used to update a progress bar for example
		   */
		csvDownload : function(array, day, updater)	{
			var calls = array.length;
			var progressUpdate = updater;
			var data = [];
			var arrayRef = array;
			var dayRef = day;
			var self = this;
			var updateValue = 0;
			var oldUpdateValue = 0;
			
			progressUpdate(0);

			/* For every coordinate pair, try to load it from the cache. If that fails, load it from the census.
			When loaded from the census, the data gets saved into the cache.*/
			for(var i=0; i<array.length; i++)	{
				data[i] = {};
				data[i].time = array[i].time;
				gapi.client.analysisEndpoint.getAtLocation({"lat" : array[i].lat, "lng" : array[i].lng, "ticket" : i}).execute(function(resp){
					if(resp.result.returned[0] === 'no entry')	{
						self.sendRequest(arrayRef[resp.returned[1]].lat, arrayRef[resp.returned[1]].lng, function(resp, id)	{
							data[id].block = resp.features[0].properties.BLOCK; 
							gapi.client.analysisEndpoint.writeInCache({"lat" : arrayRef[id].lat, "lng" : arrayRef[id].lng, "block" : data[id].block}).execute();
							
							if(--calls === 0){
								refineData();
							}
							updateDuringFetch();
						}, false, resp.returned[1]);
					}
					else	{
						data[resp.returned[1]].block = resp.returned[0]; 
						if(--calls === 0){
							refineData();
						}
						updateDuringFetch();
					}
				});
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
			
			/**
			 * Takes all the data for each block and bundles it into one data set. 
			 * For example:
			 * 1:30pm, Block 2020
			 * 2:30pm, Block 2020
			 * 2:50pm, Block 2020
			 * Becomes: 1:30pm-2:50pm, Block 2020 
			 * 
			 * 1:30pm, Block 2020
			 * 2:30pm, Block 2020
			 * 2:50pm, Block 2099
			 * 2:54pm, Block 2099
			 * 4:00pm, Block 2099
			 * 4:50pm, Block 2020
			 * 8:50pm, Block 2020
			 * Becomes: 1:30pm-2:50pm, Block 2020
			 * 			2:50pm-4:00pm, Block 2099
			 * 			4:50pm-8:50pm, Block 2020 
			 */
			function refineData()	{
				var refinedData = [];
				var locationCounter = 0;
				for(var i=0; i<data.length; i++){
					if(refinedData.length !== 0 && refinedData[locationCounter].block === data[i].block)	{
						if(refinedData[locationCounter].start > data[i].time)	{
							refinedData[locationCounter].start = data[i].time;
						}
						else if (refinedData[locationCounter].end < data[i].time)	{
							refinedData[locationCounter].end = data[i].time;							
						}
					}
					else	{
						if(refinedData.length !== 0)	{
							locationCounter++;
						}
						refinedData[locationCounter] = {};
						refinedData[locationCounter].block = data[i].block;
						refinedData[locationCounter].start = data[i].time;
						refinedData[locationCounter].end = data[i].time;
					}
				}
				createCsv(refinedData);
			}
			
			function createCsv(data)	{
				var row = 'data:text/csv;charset=utf-8,' + dayRef + '\r\nStart time","End time","Block"\r\n';
				for(var i=0; i<data.length;i++)	{
					row = row + time_parse.getDateFromTime(data[i].start) + ',' + time_parse.getDateFromTime(data[i].end) + ',' + data[i].block + '\r\n';
				}
				var encodedUri = encodeURI(row);
				var link = document.createElement("a");
				link.setAttribute("href", encodedUri);
				link.setAttribute("download", "my_data.csv");
				
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
                     "level": "blocks",
                 };

        	if(!callAPI)	{
        		censusModule.geoRequest(request, function(resp)	{
        			callback(resp, id);
        		}); 
        	}
        	else	{
        		censusModule.apiRequest(request, callback);
        	}
        }
    };
}
);