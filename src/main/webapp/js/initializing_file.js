	/**
	 * gets called after the Google JavaScript libraries (not the auto-gnerated ones) have been downloaded.
	 * Loads the auto-generated JavaScript libraries for our App Engine Project as well as OAuth2. 
	 * Calls auth(), when the libraries have been loaded.
	 */
  function init() {
		"use strict";
		console.log("moin");
	  	var client_id_dev = '611425056989-e5kvj5db6mhpdhsd2c420bpj80bkbo4q.apps.googleusercontent.com';
	  	var client_id_product = '353945552589-0nsvnfceek9iclrb8amjhpn8aome60ej.apps.googleusercontent.com';
	  	var apisToLoad = 3;
		document.getElementById('loadmessage').innerHTML = "Loading APIs ...";
		
		/**
		 * callback-method for the library-loading. As soon as all libraries are loaded,
		 * auth() gets called. IMPORTANT!: The value of apisToLoad has to match the numbers of
		 * apis which get loaded
		 */
		function con()	{
			console.log(apisToLoad);
			if(--apisToLoad === 0)	{
				document.getElementById('loadmessage').innerHTML = "Checking user ...";
				gapi.auth.authorize({client_id: client_id_dev ,scope: 'https://www.googleapis.com/auth/userinfo.email', immediate: true}, auth);
			}
			console.log("here 9");
		}
		/*if(window.location.href.substring(0,8) !== "https://") {
      console.log(window.location.href.substring(0,8))
			window.location = "https://" + window.location.href.substring(7,window.location.href.length);
		}*/
		//else	{
			gapi.client.load('oauth2', 'v2', con);
			gapi.client.load('analysisEndpoint', 'v1', con, 'https://madcap-dev1.appspot.com/_ah/api');
			gapi.client.load('securityEndpoint', 'v1', con, 'https://madcap-dev1.appspot.com/_ah/api');
		//}
	}
  
  
  /**
   * Gets called when the libraries have been loaded. Checks if the user is logged in and if the user is a valid user for the app.
   * All checks are performed on the non-visible security endpoint. Starts the login process if the user is not logged in.
   * When the user is logged in, the initalization of classified JavaScript files begins.
   */
  function auth(oldResp) {
	  "use strict";
	  var propValue;
	  if(!('access_token' in oldResp))	{
  		  gapi.client.securityEndpoint.login({"para" : encodeURI(window.location.href)}).execute(function(resp){
  			  window.location = resp.returned;
  		  });
  	  }
  	  else	{
  		  gapi.auth.setToken({
  			access_token: oldResp.access_token
  		  });	  
  		  
  		  // Checks if user is logged in
  		  gapi.client.oauth2.userinfo.get().execute(function(resp) {
  			  if (!resp.code) {
  				  // Checks if the users Google ID is allowed to use the webapp
  				  gapi.client.securityEndpoint.isRegistered().execute(function(resp)	{
  					  if(resp.returned === "true"){
  						  authorizedInit();
  					  }
  					  else	{
  						  alert("Your Account is not allowed to use this app.");
  						  document.getElementById('siteloadspinner').style.display="none";
  						  document.getElementById('loadmessage').style.display="none";
  					  }
  				  });
  			  }
  			  else	{
  			  	  alert("Error while checking user. Please load the site again.");
				  document.getElementById('siteloadspinner').style.display="none";
				  document.getElementById('loadmessage').style.display="none";
  		  	 }
  		  });
  	  }
  }

  
  /**
   * When this method is called, the user is logged in and allowed to use the app. Therefore,
   * he is allowed to see the html and javascript files. To hide those files from not-registered users,
   * they get loaded dynamically now so that they are only shown in the browser debugger and
   * inspector to allowed users.
   */
  function authorizedInit()	{
	"use strict";
	document.getElementById('loadmessage').innerHTML = "Loading JavaScript files ...";
	
	var js;
  	var jsLoaded;
  	// Gets a list of JavaScript files to load
  	gapi.client.securityEndpoint.getJs().execute(function(resp){
  		js = resp.items;
  		jsLoaded = new Array(js.length);
  		for(var i=0; i<js.length; i++)	{
  			getJsElm(i);
  		}
  		
  		/**
  		 * This method loads the javascript files from the server.
  		 * This way, somebody without the permission can't see them in the debugger
  		 * @param indexSource: The index which decides, which javaScript-file is loaded
  		 * during this call of the method.
  		 */
  		function getJsElm(indexSource)	{
  			
	    	    var jsElm = document.createElement("script");
	    	    
	    	    jsElm.onload = function()	{
	    	    	jsLoaded[jsElm.src] = true;
	    	    	checkLoadStatus();
	    	    };
	    	    
	    	    jsElm.type = "application/javascript";
	    	    jsElm.src = js[indexSource];
	    	    
	    	    js[indexSource] = jsElm.src;
	    	    jsLoaded[jsElm.src] = false;
	    	    
	    	    document.getElementsByTagName('head')[0].appendChild(jsElm);
  		}
  		
  		/**
  		 * This method is called whenever a JavaScript-file finished loading into the webapp.
  		 * When all JavaScript-files have been loaded, the AngularJS part of the webapp gets
  		 * started.
  		 */
  		function checkLoadStatus()	{
  			var allLoaded = true;
  			for(var i=0; i<jsLoaded.length; i++)	{
  				if(!jsLoaded[js[i]]){
  					allLoaded = false;
  				}
  			}
  			if(allLoaded){
  				// Starts the AngularJS part of the webapp
  				angular.bootstrap(document, ['madcap-analysis']);
  			}
  		}
  	});  
  }