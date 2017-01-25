package org.fraunhofer.cese.madcap.analysis;

import java.util.List;

import org.fraunhofer.cese.madcap.analysis.models.ActivityEntry;
import org.fraunhofer.cese.madcap.analysis.models.BlockCache;
import org.fraunhofer.cese.madcap.analysis.models.Constants;
import org.fraunhofer.cese.madcap.analysis.models.DataCollectionEntry;
import org.fraunhofer.cese.madcap.analysis.models.EndpointArrayReturnObject;
import org.fraunhofer.cese.madcap.analysis.models.ForegroundBackgroundEventEntry;
import org.fraunhofer.cese.madcap.analysis.models.LocationEntry;
import org.fraunhofer.cese.madcap.analysis.models.ReverseHeartBeatEntry;
import org.fraunhofer.cese.madcap.analysis.models.TimelineReturnContainer;

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
	@ApiMethod(name = "getInWindow", httpMethod = ApiMethod.HttpMethod.GET)
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
	public TimelineReturnContainer getActivityData(@Named("user") String id, @Named("start") long startTime, @Named("end") long endTime, @Named("source") String source, @Named("include_first") boolean shallFirst, User user) throws OAuthRequestException{
		SecurityEndpoint.isUserValid(user);
		ObjectifyService.begin();
		if(source.equals("Activity in Foreground")){
			List<ForegroundBackgroundEventEntry> activities = ofy().load().type(ForegroundBackgroundEventEntry.class).filter("userID =",id).filter("timestamp >=",startTime).filter("timestamp <=",endTime).order("timestamp").list();
			if(shallFirst)	{
				ForegroundBackgroundEventEntry firstActivity = ofy().load().type(ForegroundBackgroundEventEntry.class).filter("userID =",id).filter("timestamp <",startTime).order("-timestamp").first().now();				
				if(firstActivity != null){
					activities.add(0, firstActivity);
				}
			}
			return new TimelineReturnContainer(activities.toArray(new ForegroundBackgroundEventEntry[activities.size()]));
		}
		else if(source.equals("Kind of Movement")){
			List<ActivityEntry> activities = ofy().load().type(ActivityEntry.class).filter("userID =",id).filter("timestamp >=",startTime).filter("timestamp <=",endTime).order("timestamp").list();
			if(!activities.isEmpty() && shallFirst)	{
				ActivityEntry firstActivity = ofy().load().type(ActivityEntry.class).filter("userID =",id).filter("timestamp <",startTime).order("-timestamp").first().now();				
				if(firstActivity != null){
					activities.add(0, firstActivity);
				}
			}
			return new TimelineReturnContainer(activities.toArray(new ActivityEntry[activities.size()]));
		}
		else	{
			return new TimelineReturnContainer();			
		}
	}
	
	/**
	 * Gets the last LocationEntries for a specified user. Current amount is 1000.
	 * @param id: The user identified by his id
	 * @param user: OAuth user
	 * @return the last LocationEntries for the user
	 * @throws OAuthRequestException
	 */
	@ApiMethod(name = "callForLocationCSV", httpMethod = ApiMethod.HttpMethod.GET)
	public LocationEntry[] locationCSV(@Named("user") String id, @Named("start") long startTime, @Named("end") long endTime, User user) throws OAuthRequestException{
		SecurityEndpoint.isUserValid(user);
		ObjectifyService.begin();
		List<LocationEntry> activities = ofy().load().type(LocationEntry.class).filter("userID =",id).filter("timestamp >=",startTime).filter("timestamp <=",endTime).order("-timestamp").list();
		return activities.toArray(new LocationEntry[activities.size()]);
	}
	
	
	@ApiMethod(name = "getOnOffTime", httpMethod = ApiMethod.HttpMethod.GET)
	public DataCollectionEntry[] getOnOffTime(@Named("user") String id, @Named("start") long startTime, @Named("end") long endTime, User user) throws OAuthRequestException{
		SecurityEndpoint.isUserValid(user);
		ObjectifyService.begin();
		List<DataCollectionEntry> result = ofy().load().type(DataCollectionEntry.class).filter("userID =",id).filter("timestamp >=",startTime).filter("timestamp <=",endTime).order("timestamp").list();
		return result.toArray(new DataCollectionEntry[result.size()]);
	}
}