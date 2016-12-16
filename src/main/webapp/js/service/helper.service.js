/**
 * This service provides time parsing for our webapp. Possible conversions:
 *   UNIX time in milliseconds -> HH:MM (am/pm)
 *   HH:MM (am/pm) -> UNIX time in milliseconds 
 */
angular.module('madcap-analysis')
.factory('helper', function(){
	"use strict";
	
	var providedTime = 'no time yet';
	
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
			/*var hour = 12;
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
			return timeString;*/
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
			var time = date.getTime()
			return time + unixRest;
			/*var hourShifter = 0;
		
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
			}*/
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
		refineData : function(thisData)	{
			var refinedData = [];
			var locationCounter = 0;
			for(var i=0; i<thisData.length; i++){
				if(refinedData.length !== 0 && refinedData[locationCounter].block === thisData[i].block)	{
					if(refinedData[locationCounter].start > thisData[i].time)	{
						refinedData[locationCounter].start = thisData[i].time;
					}
					else if (refinedData[locationCounter].end < thisData[i].time)	{
						refinedData[locationCounter].end = thisData[i].time;							
					}
				}
				else	{
					if(refinedData.length !== 0)	{
						locationCounter++;
					}
					refinedData[locationCounter] = {};
					for(var prop in thisData[i])	{
						refinedData[locationCounter][prop] = thisData[i][prop];
					}
					refinedData[locationCounter].start = thisData[i].time;
					refinedData[locationCounter].end = thisData[i].time;
					
				}
			}
			return refinedData;
		},
		
		getTime : function()	{return providedTime;},
		
		provideOnOffTime : function(user, start, end)	{
			gapi.client.analysisEndpoint.getOnOffTime({"user" : user, "start" : start, "end" : end}).execute(function(resp)	{
				if(resp !== null && resp !== false && typeof resp.items !== 'undefined')	{
					providedTime = resp.items;
				}
			});
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