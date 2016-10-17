/**
 * The component for the userMap module. It will enable a Google Map where markers can be put onto.
 */
angular.
module('userMap').
  component('userMap', {
    templateUrl: 'html/user_position_map_view.template.html',
    controller: function madcapController() {
    	"use strict"; 	
		document.getElementById('siteloadspinner').style.display="block";		
    } 
});