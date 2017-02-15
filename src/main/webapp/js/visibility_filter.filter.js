/**
 * A filter to look, if a provided object is has its visible attribute set to true. necessary because of AngularJS's inability to compare objects.
 */
angular.module('madcap-analysis').
	filter('visibility_filter', function() {
	"use strict";
	return function(items) {
		var returner = [];
		var counter = 0;
		for(var key in items)	{
			if(items[key].visible)	{
				// creates an array with only the elements, which have true as value for their visible attribute.
				returner[counter] = items[key].name;
				counter++;
			}
		}
		return returner;
	};
});