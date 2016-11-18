/**
 * This service provides time parsing for our webapp. Possible conversions:
 *   UNIX time in milliseconds -> HH:MM (am/pm)
 *   HH:MM (am/pm) -> UNIX time in milliseconds 
 */
angular.module('madcap-analysis')
.factory('time_parse', function(){
	"use strict";
	
	return	{
	
		/**
		 * converts a String with the format HH:MM(am/pm) to unixtime in milliseconds
		 * @param value: the time as string
		 * @return the time in unix
		 */
		getDateFromTime : function(value)	{
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
		},
	
	
		/**
	 	*  The same as getDateFromTime, but the other way around
	 	* @param title: the time in unix
	 	* @returns the time as String
	 	*/
		getTimeFromDate : function(title)	{
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
	};
});