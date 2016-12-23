/**
 * This service provides time parsing for our webapp. Possible conversions:
 *   UNIX time in milliseconds -> HH:MM (am/pm)
 *   HH:MM (am/pm) -> UNIX time in milliseconds 
 */
angular.module('madcap-analysis')
.factory('helper', function(){
	"use strict";
	
	
	return	{
	
		/**
	 	*  The same as getDateFromTime, but the other way around
	 	* @param value: the time in unix
	 	* @returns the time as String
	 	*/		
		getDateFromUnix : function(value)	{
			var date = new Date();
			date.setTime(value);
			var timeSet = [date.getHours(), date.getMinutes(), date.getSeconds()];
			for(var i=0; i<timeSet.length; i++){
				if((timeSet[i]+'').length === 1)	{
					timeSet[i] = '0' + timeSet[i];
				}
			}
			return timeSet[0] + ':' + timeSet[1] + ':' + timeSet[2];
		},
	
		/**
		 * converts a String with the format HH:MM(am/pm) to unixtime in milliseconds
		 * @param title: the time as string
		 * @return the time in unix
		 */
		getUnixFromDate : function(title, unixRest)	{
			var date = new Date();
			date.setUTCHours(title.substring(0,2),title.substring(3,5),title.substring(6,8));
			date.setUTCDate(1);
			date.setUTCMonth(0);
			date.setUTCFullYear(1970);
			var time = date.getTime();
			return time + unixRest;
		},
		
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
		refineData : function(thisData, onOffTimes, grouper)	{
			
			var refinedData = [];
			var locationCounter = 0;
			var onIntervalAt = -1;
			var start = 'NO_ON_OFF_DATA';
			for(var i=0; i<thisData.length; i++){				
				var lastOnInterval = onIntervalAt;
				thisData[i].time = parseInt(thisData[i].time);
				for(var j=0; onOffTimes !== null && j<onOffTimes.length-1 && onIntervalAt === lastOnInterval; j++)	{
					onOffTimes[j].timestamp = parseInt(onOffTimes[j].timestamp);
					onOffTimes[j+1].timestamp = parseInt(onOffTimes[j+1].timestamp);
					if(onOffTimes[j].state === 'ON' && onOffTimes[j].timestamp < thisData[i].time && thisData[i].time < onOffTimes[j+1].timestamp)	{
						onIntervalAt = j;
						start = onOffTimes[0].state;
					}
				}
				
				if((onIntervalAt === lastOnInterval || lastOnInterval === -1) && refinedData.length !== 0 && refinedData[locationCounter][grouper] === thisData[i][grouper])	{	
					if(refinedData[locationCounter].start > thisData[i].time)	{
						refinedData[locationCounter].start = thisData[i].time;
					}
					else if (refinedData[locationCounter].end < thisData[i].time)	{
						refinedData[locationCounter].end = thisData[i].time;							
					}
				}
				else if(onIntervalAt !== -1)	{
					if(typeof refinedData[locationCounter] !== 'undefined')	{
						refinedData[locationCounter].end = Math.min(thisData[i].time, onOffTimes[lastOnInterval+1].timestamp);
					}
					if(refinedData.length !== 0)	{
						locationCounter++;
					}
					refinedData[locationCounter] = {};
					for(var property in thisData[i])	{
						refinedData[locationCounter][property] = thisData[i][property];
					}
					refinedData[locationCounter].start = thisData[i].time;
					refinedData[locationCounter].end = thisData[i].time;					
				}
			}
			
			
			return refinedData;
		},
						
		provideOnOffTime : function(user, start, end, callback)	{
			if(user !== '')	{
				gapi.client.analysisEndpoint.getOnOffTime({"user" : user, "start" : start, "end" : end}).execute(function(resp)	{
					var providedTime = {};
					if(resp !== null && resp !== false && typeof resp.items !== 'undefined')	{
						providedTime = resp.items;
					}
					else	{
						providedTime = false;
					}
					callback(providedTime);
				});
			}
			else	{
				providedTime = [{
				    	timestamp: start,
				    	state: 'ON'
				    },
					{
				    	timestamp: end,
				    	state: 'ON'
					}];
				callback(providedTime);
			}
		},
		
		datePickerSetup : function(scope)	{
			
			//-------------------------Stuff for the Datepicker------------------------------------
			scope.today = function() {
			    scope.dt = new Date();
			};
			scope.clear = function() {
			    scope.dt = null;
			};

			scope.inlineOptions = {
			    customClass: getDayClass,
			    minDate: new Date(2016, 1, 1),
			    showWeeks: true
			};
			scope.dateOptions = {
			    formatYear: 'yy',
			    maxDate: new Date(),
			    minDate: new Date(2016, 1, 1),
			    startingDay: 1
			};
			  
			scope.toggleMax = function() {
			    scope.inlineOptions.maxDate = scope.inlineOptions.maxDate ? null : new Date();
			    scope.dateOptions.maxDate = scope.inlineOptions.maxDate;
			};

			scope.setDate = function(year, month, day) {
			    scope.dt = new Date(year, month, day);
			};

			scope.open = function() {
			    scope.popup.opened = true;
			};
			scope.popup = {
			    opened: false
			};
		
			function getDayClass(data) {
			    var date = data.date;
			    var mode = data.mode;
			    if (mode === 'day') {
			        var dayToCheck = new Date(date).setHours(0,0,0,0);

			        for (var i = 0; i < scope.events.length; i++) {
			        	var currentDay = new Date(scope.events[i].date).setHours(0,0,0,0);

			        	if (dayToCheck === currentDay) {
			        		return scope.events[i].status;
			        	}
			        }
			    }
			    return '';
			}
			
			scope.today();
			scope.toggleMax();
			scope.format = 'MM/dd/yyyy';
			scope.altInputFormats = ['M!/d!/yyyy'];
			scope.dt.value = scope.dt;
			
			var tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);
			var afterTomorrow = new Date();
			afterTomorrow.setDate(tomorrow.getDate() + 1);
			scope.events = [
			    {
			      date: tomorrow,
			      status: 'full'
			    },
			    {
			      date: afterTomorrow,
			      status: 'partially'
			    }
			  ];
			return scope;
			//----------------End for the stuff of the Datepicker--------------------------------------	
		}
	};
});