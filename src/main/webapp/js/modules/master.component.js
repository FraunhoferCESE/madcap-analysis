/**
 * The master component. It will dynamically compute the shown views and controlling units 
 * according to the users choices. More master components can be created through nesting.
 */
angular.
module('master').
  component('master', {
    templateUrl: 'html/master_view.template.html',
    controller: function masterController($scope) {
    	"use strict"; 	
		document.getElementById('siteloadspinner').style.display="block";	
		
		$scope.controlControl = {
			mapButtons:	{
				visible: false
			},
			dateAndSlider: {
				visible: false
			},
		};
		
		$scope.viewControl = {		
						
			usermap:	{
				name: 'Map view',
				visible: false,
				scope: {},
				style: 'white'
			},
			timeline:	{
				name: 'Timeline view',
				visible: false,
				scope: {},
				style: 'white'
			}
		};
		
		$scope.setColor = function(name)	{
			$scope.viewControl[name].style = 'grey';
		};
		
		$scope.toggleColor = function(name)	{
			$scope.viewControl[name].style = 'grey';
		};
    } 
});