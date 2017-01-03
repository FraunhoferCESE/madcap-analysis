angular.module('madcap-analysis').
	filter('visibility_filter', function() {
	return function(items) {
		var returner = [];
		var counter = 0;
		for(var key in items)	{
			if(items[key].visible)	{
				returner[counter] = items[key].name;
				counter++;
			}
		}
		return returner;
	};
});