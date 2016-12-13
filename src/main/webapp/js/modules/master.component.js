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
				style: 'white',
				textColor: 'black'
			},
			timeline:	{
				name: 'Timeline view',
				visible: false,
				scope: {},
				style: 'white',
				textColor: 'black'
			}
		};
		
		$scope.barControl = {
			toggleColor: function(name, event)	{
				for(var key in $scope.viewControl){
					if($scope.viewControl[key].name === name){
						if($scope.viewControl[key].style === 'white'){
							$scope.viewControl[key].style = 'rgb(230, 230, 230)';		
							$scope.viewControl[key].textColor = 'rgb(150, 150, 150)';
						}
						else	{
							$scope.viewControl[key].style = 'white';		
							$scope.viewControl[key].textColor = 'black';
						}
					}
				}
			},
			
			mouseStyle:	'auto',
			
			dropdownHover: function()	{
				if($scope.barControl.mouseStyle === 'auto')	{
					$scope.barControl.mouseStyle = 'pointer';
				}
				else	{
					$scope.barControl.mouseStyle = 'auto';
				}
			}
		};
		
    } 
});