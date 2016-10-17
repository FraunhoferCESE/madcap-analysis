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

import java.util.LinkedList;

/**
 * This endpoint manages all security measures of the webapp. This includes:
 * - Visibility permissions
 * - Loading of confidential files (JavaScript for example)
 * - loading of user permissions
 * @author SHintzen
 *
 */
@Api(name = "securityEndpoint", version = "v1", namespace = @ApiNamespace(ownerDomain = "madcap.cese.fraunhofer.org", ownerName = "madcap.cese.fraunhofer.org", packagePath = "security"))
public class SecurityEndpoint {
	
	public final String STARTPAGE = "/#!/login"; 
	
	/**
	 * Retuns a list of the paths of all confidential JavaScript-files
	 * @return See description
	 */
	@ApiMethod(name = "getJs")
	public String[] getJsSources() {
		return Constants.JS_SOURCES;
	}
	
	/**
	 * Returns if the given user is allowed to see the given container.
	 * @param id The users Google id
	 * @param elemPermissions The needed permissions for this element in a csv-string
	 * @param user OAuth parameter
	 * @return 'true' if the user is allowed to see the container, 'false' otherwise
	 * @throws OAuthRequestException Gets thrown when there is no logged in user
	 */
	@ApiMethod(name = "getUserPermission")
	public EndpointReturnObject getUserPermission(@Named("userId") String id, @Named("elemPer") String elemPermissions, User user) throws OAuthRequestException  {
		ObjectifyService.begin();
		UserInformation result = ofy().load().type(UserInformation.class).id(id).now();
		return new EndpointReturnObject("" + permissionCheck(result, elemPermissions));
	}
	
	/**
	 * Checks if the logged in user is allowed to use the webapp.
	 * @param id The users Google id
	 * @param user OAuth parameter
	 * @return 'true' when the user is registered in the Constraints class, 'false' otherwise
	 * @throws OAuthRequestException Gets thrown when there is no logged in user
	 */
	@ApiMethod(name = "isRegistered")
	public EndpointReturnObject isUserRegistered(@Named("userId") String id, User user) throws OAuthRequestException	{
		for(int i=0; i<Constants.REGISTERED_USERS.length; i++){
			if(id.equals(Constants.REGISTERED_USERS[i]))	{
				return new EndpointReturnObject("true");
			}
		}
		return new EndpointReturnObject("false");
	}
	
	/**
	 * Does the logic work of getUserPermission. Checks if the user has all the necessary 
	 * rights to see the container.
	 * @param user the user, including his permissions
	 * @param elemPermissions the permissions necessary to see the container
	 * @return 'true' if the user is allowed to see the container, 'false' otherwise
	 */
	private boolean permissionCheck(UserInformation user, String elemPermissions){
		LinkedList<String> elemPermissionList = new LinkedList<>();
		String cache = "";
		// Parses csv-string to LinkedList<String>
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
	
	@ApiMethod(name = "login", httpMethod = HttpMethod.POST)
	public EndpointReturnObject login()	{
		UserService userService = UserServiceFactory.getUserService();
		return new EndpointReturnObject(userService.createLoginURL(STARTPAGE));
	}
}
