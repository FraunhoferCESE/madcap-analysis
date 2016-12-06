angular.module('madcap-analysis')
.service('allowed_directive_service', function(){
	  "use strict";
	  
	  var directiveCallback = function(){};
	  
	  return {
		
		  useCallback : function()	{
			  directiveCallback();
		  },
		  
		  passDirectiveCallback : function(func)	{
			  directiveCallback = func;
		  } 
		  
	  };
}
);


/**
 * This directive handles the visibility of containers. Every container can have the value 'allowed'
 * as tag, which will contain the different permissions necessary to see the container.
 * The permissions are separated by commas in the value. No comma is needed at the end.
 */
angular.module('madcap-analysis')
.directive('allowed', ['allowed_directive_service',function(allowed_directive_service){
	  "use strict";
	  
	  return{

		 /**
		 * This method gets called whenever a html ressource has the custom tag 'allowed'
		 * and determines if the container gets shown or not
		 */
        link : function(scope, element, attr) {
        	// Hiding the container so that it's not visible during the visibility-decision is beeing made
        	element.addClass('hidden');
        	// Getting the user information including his id.
        	gapi.client.oauth2.userinfo.get().execute(function(resp) {
				if (!resp.code) {
					// Determines if this id is connected to a user with the rights to see the container
		        	gapi.client.securityEndpoint.getUserPermission({"elemPer" : attr.allowed}).execute(function(resp)	{
						if(resp.returned === "true")	{
							element.removeClass('hidden');
							document.getElementById('siteloadspinner').style.display="none";
							document.getElementById('loadmessage').style.display="none";
							allowed_directive_service.useCallback();
						}
					});
				}
        	});

        }
    };
}
]);