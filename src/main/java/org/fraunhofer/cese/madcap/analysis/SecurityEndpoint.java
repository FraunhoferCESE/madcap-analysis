package org.fraunhofer.cese.madcap.analysis;

import org.fraunhofer.cese.madcap.analysis.models.Constants;
import org.fraunhofer.cese.madcap.analysis.models.EndpointReturnObject;
import org.fraunhofer.cese.madcap.analysis.models.UserInformation;

import com.google.api.server.spi.config.Api;
import com.google.api.server.spi.config.ApiMethod;
import com.google.api.server.spi.config.ApiMethod.HttpMethod;
import com.google.api.server.spi.config.ApiNamespace;
import com.google.api.server.spi.config.Named;
import com.google.appengine.api.oauth.OAuthRequestException;
import com.google.appengine.api.users.User;
import com.google.appengine.api.users.UserService;
import com.google.appengine.api.users.UserServiceFactory;
import com.googlecode.objectify.ObjectifyService;
import static org.fraunhofer.cese.madcap.analysis.OfyService.ofy;

import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.util.LinkedList;


/**
 * This endpoint manages all security measures of the webapp. This includes:
 * - Visibility permissions
 * - Loading of confidential files (JavaScript for example)
 * - loading of user permissions & permission checks
 * - Loading of secret keys
 * @author Stefan Hintzen
 */
@Api(name = "securityEndpoint", version = "v1", namespace = @ApiNamespace(ownerDomain = "madcap.cese.fraunhofer.org", ownerName = "madcap.cese.fraunhofer.org", packagePath = "security"), clientIds = {Constants.WEB_CLIENT_ID})
public class SecurityEndpoint {
	
	
	/**
	 * Retuns a list of the paths of all confidential JavaScript-files.
	 * @return See description
	 */
	@ApiMethod(name = "getJs")
	public String[] getJsSources(User user) throws OAuthRequestException{
		isUserValid(user);
		return Constants.JS_SOURCES;
	}

	
	/**
	 * Fetches the key for citySDK
	 * @param user: OAuth user
	 * @return the citySDK key
	 * @throws OAuthRequestException
	 */
	@ApiMethod(name = "getKey")
	public EndpointReturnObject getKey(User user) throws OAuthRequestException{
		isUserValid(user);
		return new EndpointReturnObject(Constants.CITYSDK_KEY);
	}

	
	/**
	 * Returns if the given user is allowed to see the given container.
	 * @param id: The users G-Mail address
	 * @param elemPermissions: The needed permissions for this element in a csv-string
	 * @param user: OAuth parameter
	 * @return 'true' if the user is allowed to see the container, 'false' otherwise
	 * @throws OAuthRequestException Gets thrown when there is no logged in user
	 */
	@ApiMethod(name = "getUserPermission")
	public EndpointReturnObject getUserPermission(@Named("elemPer") String elemPermissions, User user) throws OAuthRequestException  {
		isUserValid(user);
		ObjectifyService.begin();
		UserInformation result = ofy().load().type(UserInformation.class).id(user.getEmail().toLowerCase()).now();
		return new EndpointReturnObject("" + permissionCheck(result, elemPermissions));
	}
	
	
	/**
	 * Checks if the logged in user is allowed to use the MADCAP web application.
	 * @param id The users G-Mail address
	 * @param user OAuth parameter
	 * @return 'true' when the user is registered, 'false' otherwise
	 * @throws OAuthRequestException Gets thrown when there is no logged in user
	 */
	@ApiMethod(name = "isRegistered")
	public EndpointReturnObject isUserRegistered(User user) throws OAuthRequestException	{
		try	{
			isUserValid(user);
		}
		catch(OAuthRequestException e)	{
			return new EndpointReturnObject("false");			

		}
		return new EndpointReturnObject("true");
	}
	
	
	/**
	 * Does the logic work of getUserPermission(). Checks if the user has all the necessary rights to see the container.
	 * @param user the user, including his permissions
	 * @param elemPermissions the permissions necessary to see the container
	 * @return 'true' if the user is allowed to see the container, 'false' otherwise
	 */
	private boolean permissionCheck(UserInformation user, String elemPermissions){
		LinkedList<String> elemPermissionList = new LinkedList<>();
		String cache = "";
		// Parses csv-string to a LinkedList<String>
		for(int i=0; i<elemPermissions.length(); i++)	{
			if(elemPermissions.charAt(i) == ',')	{
				elemPermissionList.push(cache);
				cache = "";
			}
			else if(elemPermissions.charAt(i) != ' ')	{
				cache = cache + elemPermissions.charAt(i);
			}
		}
		elemPermissionList.push(cache);
		LinkedList<String> userPermissionList = user.getPermissionList();
		boolean noMatch = true;
		/*Determines, if all values from the container's permission list are also in the user's
		permission list*/
		for(int i=0; i<elemPermissionList.size(); i++)	{
			for(int j=0; j<userPermissionList.size(); j++){
				if(elemPermissionList.get(i).equals(userPermissionList.get(j)))	{
					noMatch = false;
				}
			}
			if(noMatch){
				return false;
			}
		}
		return true;
	}
	
	
	/**
	 * Returns a URL, where the user can login into his Google Account.
	 * @param callback: A website, which gets opened once the login is done.
	 * @return the URL
	 */
	@ApiMethod(name = "login")
	public EndpointReturnObject login(@Named("para") String callback)	{
		UserService userService = UserServiceFactory.getUserService();
		String url = "ERROR";
		try {
			url = URLDecoder.decode(callback, "UTF-8");
		} catch (UnsupportedEncodingException e) {
			e.printStackTrace();
		}
		return new EndpointReturnObject(userService.createLoginURL(url));
	}
	
	
	/**
	 * Checks if a logged in OAuth user got provided and if the user is registered in the datastore entity UserInformation
	 * @param user: OAuth user
	 * @return boolean indicating if the user is valid
	 * @throws OAuthRequestException
	 */
	public static boolean isUserValid(User user) throws OAuthRequestException	{
		// Checking if there is a logged in user
		if(user == null){
			System.out.println("User: NULL");
			throw new OAuthRequestException("ERROR: User is null! Value: NULL");
		}
		System.out.println("User: " + user.getEmail());
		ObjectifyService.begin();
		// Checking if the logged in user is registered 
		UserInformation result = ofy().load().type(UserInformation.class).id(user.getEmail().toLowerCase()).now();
		System.out.println("User login result: " + result);
		if(result != null){
			return true;
		}
		throw new OAuthRequestException("ERROR: User is not registered! Value" + user.getEmail().toLowerCase());	
	}
}