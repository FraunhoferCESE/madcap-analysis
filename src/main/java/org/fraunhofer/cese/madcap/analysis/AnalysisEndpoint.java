package org.fraunhofer.cese.madcap.analysis;

import java.util.ArrayList;
import java.util.List;

import org.fraunhofer.cese.madcap.analysis.models.ActivityEntry;
import org.fraunhofer.cese.madcap.analysis.models.Constants;
import org.fraunhofer.cese.madcap.analysis.models.DataCollectionEntry;
import org.fraunhofer.cese.madcap.analysis.models.EndpointArrayReturnObject;
import org.fraunhofer.cese.madcap.analysis.models.EndpointReturnObject;
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
import com.googlecode.objectify.Key;
import com.googlecode.objectify.ObjectifyService;

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
		//ObjectifyService.begin();
		List<DataCollectionEntry> resultDCE = ofy().load().type(DataCollectionEntry.class).filter("userID =",id).filter("timestamp >=",startTime).filter("timestamp <=",endTime).order("timestamp").list();
		List<ReverseHeartBeatEntry> resultRHBE = ofy().load().type(ReverseHeartBeatEntry.class).filter("userID =",id).filter("timestamp >",startTime).filter("timestamp <",endTime).order("timestamp").list();
		
		List<DataCollectionEntry> returner = new ArrayList<DataCollectionEntry>();
		resultDCE.add(0,new DataCollectionEntry("ON", startTime-1));
		resultRHBE.add(0,new ReverseHeartBeatEntry("DEATHEND", startTime-2));
		resultDCE.add(resultDCE.size(),new DataCollectionEntry("OFF", endTime-1));
		resultRHBE.add(resultRHBE.size(),new ReverseHeartBeatEntry("DEATHSTART", endTime-2));
		
		boolean onFlagRHBE = false;
		boolean onFlagDCE = false;
		int countResultRHBE = 0;
		int countResultDCE = 0;
	
		for(int i=0; i<(resultDCE.size() + resultRHBE.size()); i++){
			long rhbeTimestamp = 0;
			String rhbeState = "";
			long dceTimestamp = 0;
			String dceState = "";
		
			if(countResultRHBE < resultRHBE.size())	{
				rhbeTimestamp = resultRHBE.get(countResultRHBE).getTimestamp();
				rhbeState = resultRHBE.get(countResultRHBE).getKind();
			}
			if(countResultDCE < resultDCE.size())	{
				dceTimestamp = resultDCE.get(countResultDCE).getTimestamp();
				dceState = resultDCE.get(countResultDCE).getState();
			}	
			if(countResultDCE < resultDCE.size() && (dceTimestamp < rhbeTimestamp || countResultRHBE >= resultRHBE.size()))	{
				if(dceState.equals("ON")){
					onFlagDCE = true;
					if(onFlagDCE && onFlagRHBE)	{
						returner.add(new DataCollectionEntry("ON INTENT", dceTimestamp));
					}
				}
				else if(dceState.equals("OFF"))	{
					if(returner.get(returner.size()-1).getState().equals("OFF CRASH"))	{
						DataCollectionEntry cache = returner.remove(returner.size()-1);
						cache.setState("OFF INTENT");
						returner.add(cache);
					}
					else	{
						returner.add(new DataCollectionEntry("OFF INTENT", dceTimestamp));
					}
					onFlagDCE = false;
				}
				countResultDCE++;
			}
			else	{
				if(rhbeState.equals("DEATHEND")){
					onFlagRHBE = true;
					if(onFlagDCE && onFlagRHBE){
						if(returner.get(returner.size()-1).getState().equals("OFF INTENT"))	{
							returner.add(new DataCollectionEntry("ON INTENT", rhbeTimestamp));
						}
						else	{
							returner.add(new DataCollectionEntry("ON CRASH", rhbeTimestamp));
						}
					}
				}
				else if(rhbeState.equals("DEATHSTART"))	{
					returner.add(new DataCollectionEntry("OFF CRASH", rhbeTimestamp));
					onFlagRHBE = false;
				}
				countResultRHBE++;
			}
			
			if(returner.size() >= 2 && returner.get(returner.size()-1).getState().substring(0,3).equals(returner.get(returner.size()-2).getState().substring(0,3)))	{
				returner.remove(returner.size()-1);
			}

		}
		return returner.toArray(new DataCollectionEntry[returner.size()]);
	}
}