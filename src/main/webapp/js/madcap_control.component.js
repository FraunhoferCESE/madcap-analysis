/**
 * The component for the madcapControl module. It will feature the ability to controll a
 * user's MADCAP smartphone app, for example by sending push notifications to it.
 * This component is a stub right now and will be implemented at a later time.
 */
angular.
module('madcapControl').
  component('madcapControl', {
    templateUrl: 'html/madcap_control_view.template.html',
    controller: function madcapController() {
    	"use strict"; 	
		document.getElementById('siteloadspinner').style.display="block";		
    } 
});