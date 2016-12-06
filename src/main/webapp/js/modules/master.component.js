/**
 * The master component. It will dynamically compute the shown views and controlling units 
 * according to the users choices. More master components can be created through nesting.
 */
angular.
module('master').
  component('master', {
    templateUrl: 'html/master_view.template.html',
    controller: function masterController() {
    	"use strict"; 	
		document.getElementById('siteloadspinner').style.display="block";		
    } 
});