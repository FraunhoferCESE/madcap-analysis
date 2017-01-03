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
			unitVisible: false,
			mapButtonsVisible: false,
			timelineDatapickerVisible: false,
			userpickerVisible: false,
			datepickerVisible: false,
			sliderVisible: false
		};
				
		$scope.computeControlViewStructure = function()	{
			var usermapVisible = $scope.viewControl.usermap.visible;
			var timelineVisible = $scope.viewControl.usermap.visible;
			
			if(usermapVisible || timelineVisible)	{
				$scope.controlControl.unitVisible = true;
				$scope.controlControl.sliderVisible = true;
			}
			else	{
				$scope.controlControl.unitVisible = false;
				$scope.controlControl.sliderVisible = false;
			}
		};
		

		$scope.viewControl = {		
						
			usermap:	{
				name: 'Map view',
				visible: false,
				scope: {},
				style: 'rgb(230, 230, 230)',
				textColor: 'rgb(150, 150, 150)'
			},
			timeline:	{
				name: 'Timeline view',
				visible: false,
				scope: {},
				style: 'rgb(230, 230, 230)',
				textColor: 'rgb(150, 150, 150)'
			}
		};
		
		$scope.barControl = {
			toggleColor: function(name, event)	{
				for(var key in $scope.viewControl){
					if($scope.viewControl[key].name === name){
						if($scope.viewControl[key].style === 'white'){
							$scope.viewControl[key].style = 'rgb(230, 230, 230)';		
							$scope.viewControl[key].textColor = 'rgb(150, 150, 150)';
							$scope.viewControl[key].visible = false;
						}
						else	{
							$scope.viewControl[key].style = 'white';		
							$scope.viewControl[key].textColor = 'black';
							$scope.viewControl[key].visible = true;
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
		
		$scope.rerenderSlider = function()	{
    		$scope.$broadcast('rzSliderForceRender');
    	};		
    } 
});