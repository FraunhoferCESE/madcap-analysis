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
			unitAlreadyLoaded: false,
			childScope: {},
			generalRenderTrigger: false
		};
		
		$scope.viewControl = {				
			usermap:	{
				name: 'Map view',
				visible: false,
				alreadyloaded: false,
				scope: {},
				style: 'rgb(230, 230, 230)',
				textColor: 'rgb(150, 150, 150)'
			},
			timeline:	{
				name: 'Timeline view',
				visible: false,
				alreadyLoaded: false,
				scope: {},
				style: 'rgb(230, 230, 230)',
				textColor: 'rgb(150, 150, 150)'
			}
		};
		$scope.$watchGroup(['viewControl.timeline.visible','viewControl.usermap.visible'], function()	{
			var usermapVisible = $scope.viewControl.usermap.visible;
			var timelineVisible = $scope.viewControl.timeline.visible;
			
			$scope.controlControl.unitVisible = ($scope.viewControl.usermap.visible || $scope.viewControl.timeline.visible);
			
			if($scope.controlControl.unitVisible)	{
				$scope.controlControl.childScope.control.sliderVisible = (usermapVisible || timelineVisible);
				$scope.controlControl.childScope.control.userpickerVisible = (usermapVisible || timelineVisible);
				$scope.controlControl.childScope.control.datepickerVisible = (usermapVisible || timelineVisible);
				$scope.controlControl.childScope.control.timelineDatapickerVisible = timelineVisible;
				$scope.controlControl.childScope.control.csvTimelineButtonsVisible = timelineVisible;
				$scope.controlControl.childScope.control.mapButtonsVisible = usermapVisible;
				$scope.controlControl.childScope.control.csvMapButtonsVisible = usermapVisible;
				$scope.rerenderSlider();
			}
		});		

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
							$scope.viewControl[key].alreadyLoaded = true;
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