/**
 * The master component. It is the parent of all other modules of v2. It computes which views get shown or not and contains all the
 * view information. It serves as connection between the visualization views and the control unit. New modules can also use this module as connection.
 * 
 */
angular.module('master').
  component('master', {
    templateUrl: 'html/master_view.template.html',
    controller: function masterController($scope) {
    	"use strict"; 	
		document.getElementById('siteloadspinner').style.display="block";	
		
		//Information about the control elements. Currently only the control unit.
		$scope.controlControl = {
			unitVisible: false,
			unitAlreadyLoaded: false,
			//Contains the scopes of all children, not only the control unit.
			childScope: {},
			generalRenderTrigger: false
		};
		
		//Information about all the views as well as their entries in the top navigation bar
		$scope.viewControl = {				
			usermap:	{
				name: 'Map view',
				visible: false,
				alreadyloaded: false,
				scope: {},
				// The background color of the view's entry in the navbar dropdown
				style: 'rgb(230, 230, 230)',
				textColor: 'rgb(150, 150, 150)',
				//Gets called, when the collapse attribute around this module finished expanding
				finishedExpand: function()	{
					$scope.viewControl.usermap.expanded = true;
				},
				//Gets called, when the collapse attribute around this module finished collapsing
				finishedCollapse: function()	{
					$scope.viewControl.usermap.expanded = false;					
				},
				expanded: false
			},
			timeline:	{
				name: 'Timeline view',
				visible: false,
				alreadyLoaded: false,
				scope: {},
				// The background color of the view's entry in the navbar dropdown
				style: 'rgb(230, 230, 230)',
				textColor: 'rgb(150, 150, 150)',
				//Gets called, when the collapse attribute around this module finished expanding
				finishedExpand: function()	{
					$scope.viewControl.timeline.expanded = true;
				},
				//Gets called, when the collapse attribute around this module finished collapsing
				finishedCollapse: function()	{
					$scope.viewControl.timeline.expanded = false;
				},
				expanded: false
			},
			userinfo:	{
				name: 'User information view',
				visible: false,
				alreadyLoaded: false,
				scope: {},
				// The background color of the view's entry in the navbar dropdown
				style: 'rgb(230, 230, 230)',
				textColor: 'rgb(150, 150, 150)',
				//Gets called, when the collapse attribute around this module finished expanding
				finishedExpand: function()	{
					$scope.viewControl.userinfo.expanded = true;
				},
				//Gets called, when the collapse attribute around this module finished collapsing
				finishedCollapse: function()	{
					$scope.viewControl.userinfo.expanded = false;
				},
				expanded: false
			}
		};
		
		/**
		 * Calculates the visibility of all child modules (include children's child modules too)
		 */
		$scope.$watchGroup(['viewControl.timeline.visible','viewControl.usermap.visible','viewControl.userinfo.visible'], function()	{
			var usermapVisible = $scope.viewControl.usermap.visible;
			var timelineVisible = $scope.viewControl.timeline.visible;
			var userinfoVisible = $scope.viewControl.userinfo.visible;
			
			$scope.controlControl.unitVisible = ($scope.viewControl.usermap.visible || $scope.viewControl.timeline.visible || $scope.viewControl.userinfo.visible);
			
			if($scope.controlControl.unitVisible)	{
				
				var clearfixUsermapUserinfo = document.getElementById("clearfixComboUsermapUserinfo");
    			var clearfixUsermapTimelineUserinfo = document.getElementById("clearfixComboUsermapTimelineUserinfo");
    			var clearfixUsermapTimeline = document.getElementById("clearfixComboUsermapTimeline");
    			var clearfixTimelineUserinfo = document.getElementById("clearfixComboTimelineUserinfo");
    			var clearfixUsermap = document.getElementById("clearfixComboUsermap");
    			
    			clearfixUsermapTimelineUserinfo.setAttribute("class","");
    			clearfixUsermapUserinfo.setAttribute("class","");
    			clearfixUsermapTimeline.setAttribute("class","");
    			clearfixTimelineUserinfo.setAttribute("class","");
    			clearfixUsermap.setAttribute("class","");
    			
    			if(usermapVisible && timelineVisible && userinfoVisible){
    				clearfixUsermapTimelineUserinfo.setAttribute("class","clearfix visible-xs-block visible-sm-block visible-md-block visible-lg-block visible-xl-block");	
    			}
    			else if(usermapVisible && userinfoVisible)	{
    				clearfixUsermapUserinfo.setAttribute("class","clearfix visible-xs-block visible-sm-block visible-md-block visible-lg-block visible-xl-block");	
    			}
    			else if(usermapVisible && timelineVisible)	{
    				clearfixUsermapTimeline.setAttribute("class","clearfix visible-xs-block visible-sm-block visible-md-block visible-lg-block visible-xl-block");	
    			}
    			else if(timelineVisible && userinfoVisible)	{
    				clearfixTimelineUserinfo.setAttribute("class","clearfix visible-xs-block visible-sm-block visible-md-block visible-lg-block visible-xl-block");	
    			}
    			else if(usermapVisible)	{
    				clearfixUsermap.setAttribute("class","clearfix visible-xs-block visible-sm-block visible-md-block visible-lg-block visible-xl-block");	
    			}
    			
				$scope.controlControl.childScope.control.constellationUsermapTimelineUserinfo = (usermapVisible && timelineVisible && userinfoVisible);
				$scope.controlControl.childScope.control.constellationUsermapUserinfo = (usermapVisible && !timelineVisible && userinfoVisible);
				$scope.controlControl.childScope.control.sliderVisible = (usermapVisible || timelineVisible);
				$scope.controlControl.childScope.control.userpickerVisible = (usermapVisible || timelineVisible || $scope.viewControl.userinfo.visible);
				$scope.controlControl.childScope.control.datepickerVisible = (usermapVisible || timelineVisible || $scope.viewControl.userinfo.visible);
				$scope.controlControl.childScope.control.timelineDatapickerVisible = timelineVisible;
				$scope.controlControl.childScope.control.csvTimelineButtonsVisible = timelineVisible;
				$scope.controlControl.childScope.control.mapButtonsVisible = usermapVisible;
				$scope.controlControl.childScope.control.csvMapButtonsVisible = usermapVisible;
				$scope.controlControl.childScope.control.mapOriginCheckboxesVisible = usermapVisible;
				$scope.controlControl.childScope.control.csvUserInformationButtonsVisible = userinfoVisible;
			}
		});		
		
		/**
		 * Controls the color setting in the navigation bar. Opened modules will have a white background, while closed modules will have a grey background
		 */
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
			// Changes the mouse style from the deffault style to the pointer style (that one that looks like a hand) when hovering over an entry in the navbar's dropdown.
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