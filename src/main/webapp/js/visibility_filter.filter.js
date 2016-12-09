angular.module('madcap-analysis').
	filter('visibility_filter', function() {
	return function(items) {
		var returner = [];
		var counter = 0;
		for(key in items)	{
			if(!items[key].visible)	{
				returner[counter] = {}
				returner[counter].name = items[key].name;
				counter++;
			}
		}
		return returner;
	};
});