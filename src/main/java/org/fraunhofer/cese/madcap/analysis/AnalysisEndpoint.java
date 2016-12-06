package org.fraunhofer.cese.madcap.analysis;

import java.util.List;

import org.fraunhofer.cese.madcap.analysis.models.BlockCache;
import org.fraunhofer.cese.madcap.analysis.models.Constants;
import org.fraunhofer.cese.madcap.analysis.models.EndpointArrayReturnObject;
import org.fraunhofer.cese.madcap.analysis.models.ForegroundBackgroundEventEntry;
import org.fraunhofer.cese.madcap.analysis.models.LocationEntry;

import com.google.api.server.spi.config.Api;
import com.google.api.server.spi.config.ApiMethod;
import com.google.api.server.spi.config.ApiNamespace;
import com.google.api.server.spi.config.Named;
import com.google.appengine.api.oauth.OAuthRequestException;
import com.google.appengine.api.users.User;
import com.googlecode.objectify.ObjectifyService;
import com.googlecode.objectify.VoidWork;

import static org.fraunhofer.cese.madcap.analysis.OfyService.ofy;
 

/**
 * This class responds when a client tries query data from the Cloud storage.
 */
@Api(name = "analysisEndpoint", 
	version = "v1", 
	namespace = @ApiNamespace(ownerDomain = "madcap.cese.fraunhofer.org", ownerName = "madcap.cese.fraunhofer.org", packagePath = "analysis"),
	clientIds = Constants.WEB_CLIENT_ID)
public class AnalysisEndpoint {

	
	/**
	 * Returns locations in a specified timeframe for a specified user. Time is required in UNIX milliseconds.
	 * @param id: userId
	 * @param startTime: start of the time frame
	 * @param endTime: end of the time frame
	 * @param user: OAuth user
	 * @return all locations for that user in that time frame
	 * @throws OAuthRequestException
	 */
	@ApiMethod(name = "getInWindow", httpMethod = ApiMethod.HttpMethod.POST)
	public LocationEntry[] getInWindow(@Named("user") String id, @Named("start") long startTime, @Named("end") long endTime, User user) throws OAuthRequestException{
		SecurityEndpoint.isUserValid(user);
		ObjectifyService.begin();
		List<LocationEntry> result = ofy().load().type(LocationEntry.class).filter("userID =",id).filter("timestamp >=",startTime).filter("timestamp <=",endTime).order("timestamp").list();
		return result.toArray(new LocationEntry[result.size()]);
	}

	
	/**
	 * Checks in a transaction if the object is already in the cache to prevent race condition 
	 * and writes it into the cache if it is not already in there.
	 * @param lat: latitude
	 * @param lng: longitude
	 * @param block: The block
	 * @param user: OAuth user
	 * @throws OAuthRequestException
	 */
	@ApiMethod(name = "writeInCache", httpMethod = ApiMethod.HttpMethod.POST)
	public void writeInCache(@Named("lat") final String lat, @Named("lng") final String lng, @Named("block") final String block, User user) throws OAuthRequestException{
		SecurityEndpoint.isUserValid(user);
		ObjectifyService.begin();
		ofy().transact(new VoidWork() {
		    public void vrun() {
		    	float floatLat = Float.parseFloat(lat);
		    	float floatLng = Float.parseFloat(lng);
		    	BlockCache saver = new BlockCache();
				saver.latitude = floatLat;
				saver.longitude = floatLng;
				saver.block = block;
				saver.createCompositeId(); 
				ofy().transactionless().load().entity(saver).now();
		    }
		});		
	}
	
	
	/**
	 * Gets all the locations in the cache at specific longitudes and latitudes.
	 * @param lat: latitude
	 * @param lng: longitude
	 * @param ticket: A id to identify the caller of this method in the callback
	 * @param user; OAuth user
	 * @return the ticket and the result of the query
	 * @throws OAuthRequestException
	 */
	@ApiMethod(name = "getAtLocation", httpMethod = ApiMethod.HttpMethod.POST)
	public EndpointArrayReturnObject getAtLocation(@Named("lat") String lat, @Named("lng") String lng, @Named("ticket") int ticket, User user) throws OAuthRequestException{
		SecurityEndpoint.isUserValid(user);
		ObjectifyService.begin();
		
		BlockCache result = ofy().load().type(BlockCache.class).id(""+Float.parseFloat(lat)+Float.parseFloat(lng)).now();
		
		String[] returned = {"no entry", ticket+""};
		if(result != null)	{
			returned[0] = result.block;
		}
		return new EndpointArrayReturnObject(returned);
	}
	
	
	/**
	 * Gets all users which have uploaded LocationEntries.
	 * @param user: OAuth user
	 * @return the list of users
	 * @throws OAuthRequestExceptionz
	 */
	@ApiMethod(name = "getUsers", httpMethod = ApiMethod.HttpMethod.GET)
	public EndpointArrayReturnObject getUsers(User user) throws OAuthRequestException{
		SecurityEndpoint.isUserValid(user);
		ObjectifyService.begin();
		 List<LocationEntry> result = ofy().load().type(LocationEntry.class).project("userID").distinct(true).list();
		 String[] users = new String[result.size()];
		 for(int i=0; i<result.size(); i++){
			users[i] = result.get(i).getUserID();
		 }
		 return new EndpointArrayReturnObject(users);
	}
	
	
	/**
	 * Gets all users which have uploaded LocationEntries.
	 * @param user: OAuth user
	 * @return the list of users
	 * @throws OAuthRequestException
	 */
	@ApiMethod(name = "getActivityData", httpMethod = ApiMethod.HttpMethod.GET)
	public ForegroundBackgroundEventEntry[] getActivityData(@Named("user") String id, @Named("start") long startTime, @Named("end") long endTime, User user) throws OAuthRequestException{
		SecurityEndpoint.isUserValid(user);
		ObjectifyService.begin();
		List<ForegroundBackgroundEventEntry> activities = ofy().load().type(ForegroundBackgroundEventEntry.class).filter("userID =",id).filter("timestamp >=",startTime).filter("timestamp <=",endTime).order("timestamp").list();
		return activities.toArray(new ForegroundBackgroundEventEntry[activities.size()]);
	}
	
	/**
	 * Gets the last LocationEntries for a specified user. Current amount is 1000.
	 * @param id: The user identified by his id
	 * @param user: OAuth user
	 * @return the last LocationEntries for the user
	 * @throws OAuthRequestException
	 */
	@ApiMethod(name = "callForLocationCSV", httpMethod = ApiMethod.HttpMethod.GET)
	public LocationEntry[] locationCSV(@Named("user") String id, User user) throws OAuthRequestException{
		SecurityEndpoint.isUserValid(user);
		ObjectifyService.begin();
		List<LocationEntry> activities = ofy().load().type(LocationEntry.class).filter("userID =",id).order("-timestamp").limit(1000).list();
		return activities.toArray(new LocationEntry[activities.size()]);
	}
}