package org.fraunhofer.cese.madcap.analysis;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.LinkedList;
import java.util.List;
import java.util.TimeZone;
import org.fraunhofer.cese.madcap.analysis.models.ActivityEntry;
import org.fraunhofer.cese.madcap.analysis.models.Constants;
import org.fraunhofer.cese.madcap.analysis.models.DataCollectionEntry;
import org.fraunhofer.cese.madcap.analysis.models.EndpointArrayReturnObject;
import org.fraunhofer.cese.madcap.analysis.models.ForegroundBackgroundEventEntry;
import org.fraunhofer.cese.madcap.analysis.models.LocationEntry;
import org.fraunhofer.cese.madcap.analysis.models.ReverseHeartBeatEntry;
import org.fraunhofer.cese.madcap.analysis.models.SystemInfoEntry;
import org.fraunhofer.cese.madcap.analysis.models.TimelineReturnContainer;
import com.google.api.server.spi.config.Api;
import com.google.api.server.spi.config.ApiMethod;
import com.google.api.server.spi.config.ApiNamespace;
import com.google.api.server.spi.config.Named;
import com.google.appengine.api.oauth.OAuthRequestException;
import com.google.appengine.api.users.User;
import com.googlecode.objectify.Work;
import com.googlecode.objectify.ObjectifyService;
import static org.fraunhofer.cese.madcap.analysis.OfyService.ofy;
 


/**
 * This class responds when a client tries query data from the Cloud storage for the purpose of presenting it. Security related loafing is done in the SecurityEndpoint.
 * All methods with a parameter of type user can only be called by users, which are logged into their Google account.
 * @author Stefan Hintzen
 */
@Api(name = "analysisEndpoint", 
	version = "v1",
	namespace = @ApiNamespace(ownerDomain = "madcap.cese.fraunhofer.org", ownerName = "madcap.cese.fraunhofer.org", packagePath = "analysis"),
	clientIds = Constants.WEB_CLIENT_ID)
public class AnalysisEndpoint {

	
	/**
	 * Returns all LocationEntry probes in a specified timeframe for a specified user. Time is required in unix milliseconds.
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
	 * Gets all users, which have uploaded LocationEntries.
	 * TODO change so the users are loaded accordingly to the opened visualizations in the maste view
	 * @param user: OAuth user
	 * @return the list of users
	 * @throws OAuthRequestExceptionz
	 */
	@ApiMethod(name = "getUsers", httpMethod = ApiMethod.HttpMethod.GET)
	public EndpointArrayReturnObject getUsers(User user) throws OAuthRequestException{
		SecurityEndpoint.isUserValid(user);
		ObjectifyService.begin();
//		 List<LocationEntry> result = ofy().load().type(LocationEntry.class).project("userID").distinct(true).list();
		
		/*
		 * Gets userID from the SystemInfoEntry table instead of LocationEntry table. 
		 * Location is a "dangerous" permission from API 23. If the user does not upload location data, he is not listed on the webapp
		 * 
		 * Modified by: PGurupasad
		 * Modified on: 30/08/2017
		 *
		 */
		List<SystemInfoEntry> result = ofy().load().type(SystemInfoEntry.class).project("userID").distinct(true).list();
		 
		String[] users = new String[result.size()];
		 //Gets the id's from the returned users.
		 for(int i=0; i<result.size(); i++){
			users[i] = result.get(i).getUserID();
		 }
		 return new EndpointArrayReturnObject(users);
	}
	
	
	/**
	 * Loads either all ForegroundBackgroundEventEntry probes or ActivityEntry probes for a user in a specified timeframe.
 	 * @param id: userId
	 * @param startTime: start of the time frame
	 * @param endTime: end of the time frame
	 * @param source: The kind of requested data. Valid values are "Activity in Foreground" for ForegroundBackgroundEventEntrry probes and "Kind of Movement" for ActivityEntry probes. 
	 *                Only one kind can be loaded at each call.
	 * @param shallFirst: Determines, if the method shall also query the very first probe entry before the start time. THis is useful to get information between a specific timestamp and the first entry of the regular query.
	 * @param user: OAuth user	 * @return the list of users
	 * @return the list of probes, ordered by timestamp.
	 * @throws OAuthRequestException
	 */
	@ApiMethod(name = "getActivityData", httpMethod = ApiMethod.HttpMethod.GET)
	public TimelineReturnContainer getActivityData(@Named("user") String id, @Named("start") long startTime, @Named("end") long endTime, @Named("source") String source, @Named("include_first") boolean shallFirst, User user) throws OAuthRequestException{
		SecurityEndpoint.isUserValid(user);
		ObjectifyService.begin();
		//Queries all ForegroundBackgroundEventEntry probes in the timeframe.
		if(source.equals("Activity in Foreground")){
			List<ForegroundBackgroundEventEntry> activities = ofy().load().type(ForegroundBackgroundEventEntry.class).filter("userID =",id).filter("eventType =",1).filter("timestamp >=",startTime).filter("timestamp <=",endTime).order("timestamp").list();
			if(shallFirst)	{
				//Queries the very first ForegroundBackgroundEventEntry probe before the timeframe.
				ForegroundBackgroundEventEntry firstActivity = ofy().load().type(ForegroundBackgroundEventEntry.class).filter("userID =",id).filter("eventType =",1).filter("timestamp <",startTime).order("-timestamp").first().now();				
				//Includes the first probe into the return-list, if the query brought a result.
				if(firstActivity != null){
					activities.add(0, firstActivity);
				}
			}
			return new TimelineReturnContainer(activities.toArray(new ForegroundBackgroundEventEntry[activities.size()]));
		}
		else if(source.equals("Kind of Movement")){
			//Queries all ActivityEntry probes in the timeframe.
			List<ActivityEntry> activities = ofy().load().type(ActivityEntry.class).filter("userID =",id).filter("timestamp >=",startTime).filter("timestamp <=",endTime).order("timestamp").list();
			if(!activities.isEmpty() && shallFirst)	{
				//Queries the very first ActivityEntry probe before the timeframe.
				ActivityEntry firstActivity = ofy().load().type(ActivityEntry.class).filter("userID =",id).filter("timestamp <",startTime).order("-timestamp").first().now();				
				//Includes the first probe into the return-list, if the query brought a result.
				if(firstActivity != null){
					activities.add(0, firstActivity);
				}
			}
			return new TimelineReturnContainer(activities.toArray(new ActivityEntry[activities.size()]));
		}
		else	{
			// Returns an empty result if the source-parameter was invalid.
			return new TimelineReturnContainer();			
		}
	}
	
	
	/**
	 * Same method as getInWindow(), but the results are ordered descending and not ascending. Useful in the location export of the map visualization
	 * @param id: The user identified by his id
	 * @param startTime: start time of the timeframe
	 * @param endTime: end time of the timeframe
	 * @param user: OAuth user
	 * @return the LocationEntry probes in the timeframe, ordered descending
	 * @throws OAuthRequestException
	 */
	@ApiMethod(name = "callForLocationCSV", httpMethod = ApiMethod.HttpMethod.GET)
	public LocationEntry[] locationCSV(@Named("user") String id, @Named("start") long startTime, @Named("end") long endTime, User user) throws OAuthRequestException{
		SecurityEndpoint.isUserValid(user);
		ObjectifyService.begin();
		List<LocationEntry> activities = ofy().load().type(LocationEntry.class).filter("userID =",id).filter("timestamp >=",startTime).filter("timestamp <=",endTime).order("-timestamp").list();
		return activities.toArray(new LocationEntry[activities.size()]);
	}
	
	
	/**
	 * A public interface to call the getOnOffTime method. The actual method has to be not public callable. Otherwise, it couldn't be used by other methods as helper method.
	 * @param id: to be passed to getOnOffTime()
	 * @param startTime: to be passed to getOnOffTime()
	 * @param endTime: to be passed to getOnOffTime()
	 * @param user: to be passed to getOnOffTime()
	 * @return result of getOnOffTime()
	 * @throws OAuthRequestException
	 */
	@ApiMethod(name = "getOnOffTime", httpMethod = ApiMethod.HttpMethod.GET)
	public DataCollectionEntry[] getOnOffTimePublic(@Named("user") String id, @Named("start") long startTime, @Named("end") long endTime, User user) throws OAuthRequestException{	
		return getOnOffTime(id, startTime, endTime, user);	
	}
		
	
	/**
	 * Calculates the on-off-chain out of the DataCollectionEntry and ReverseHeartBeatEntry probes. A on-off-chain tells about the times, where data collection was possible and valid.
	 * The valid time starts at the timestamp of an index with state ON and ends at the next index with the state OFF. The on-off-chain is used on multiple occasions
	 * on the client-side.
	 * @param id: the user
	 * @param startTime: the start time of the timefrrame
	 * @param endTime: the end time of the timeframe
	 * @param user: OAuth user
	 * @return
	 * @throws OAuthRequestException
	 */
	private DataCollectionEntry[] getOnOffTime(String id, long startTime, long endTime, User user) throws OAuthRequestException{
		SecurityEndpoint.isUserValid(user);
		ObjectifyService.begin();
		
		// All probes in the timeframe to create two seperate on-off-chains. On for the ReverseHeartBeatEntrt probes and one for the DataCollectioNEntry probes.
		List<DataCollectionEntry> resultDCE = ofy().load().type(DataCollectionEntry.class).filter("userID =",id).filter("timestamp >=",startTime).filter("timestamp <=",endTime).order("timestamp").list();
		List<ReverseHeartBeatEntry> resultRHBE = ofy().load().type(ReverseHeartBeatEntry.class).filter("userID =",id).filter("timestamp >",startTime).filter("timestamp <",endTime).order("timestamp").list();
		
		List<DataCollectionEntry> returner = new ArrayList<DataCollectionEntry>();
		
		/*Adds events at the very start and end of the chains. Otherwise, the final chain wouldn't cover the times between start time and the first entry in a chain
		and the end time and the last entry in a chain*/
		resultDCE.add(0,new DataCollectionEntry("ON", startTime-1));
		resultRHBE.add(0,new ReverseHeartBeatEntry("DEATHEND", startTime-2));
		resultDCE.add(resultDCE.size(),new DataCollectionEntry("OFF", endTime-1));
		resultRHBE.add(resultRHBE.size(),new ReverseHeartBeatEntry("DEATHSTART", endTime-2));
		
		// These flags keep track of the current state while calculationg the final chain
		boolean onFlagRHBE = false;
		boolean onFlagDCE = false;
		int countResultRHBE = 0;
		int countResultDCE = 0;
	
		//Shortcuts for the next comment: ReverseHeartBeatEntry = RHBE, DataCollectionEntry = DCE.
		/*This is the main algorithm, which merges the DCE's and the RHBE's on-off-chains int one, final chain. While calculating the chain, there are four different, possible states:
		 case 1: RBHE and DCE both signal OFF. This is the case when the data collection is turned off. Turning of of the data collection will also cause the heartbeat to stop,
		         which generates a RHBE probes.
		 case 2: RHBE signals ON, while DCE signals OFF. This case is impossible, since turning off the data collection also stops the heartbeat.
		 case 3: RHBE and DCE signal ON. In this case, data gets collected without problems.
		 case 4: RBHE signals OFF, while DCE signals ON. In this case, the data collection is turned on, but the heartbeats can't ping the web application.
		 	     This indicates an interruption of the application, for example because of a crash.
		 
		 In the final chain, the state field tells about the state, that is present from now on (ON or OFF), and the source that caused the last OFF when the state is ON
		 or the current OFF if the state is OFF.
		 The four cases have to be handled as followed (Since case 2 is impossible, it will not considered in the actions below): 
		 (1) When switching to case 1 from any case, create a entry with the state "OFF INTENT".
		 (2) When switching to case 3 from any case, create a entry with state "ON CRASH".
		 (3) When switching to case 4 from case 3, create a entry with the state "OFF CRASH". 
		     However, delete this entry when the next change is from case 4 to case 1, since then there was no crash
		     but a normal turning off of the data collection.
		 (4) When switching to case 4 from case 1, do nothing. However, change "ON CRASH" to "ON INTENT" in the next case switch,
		     if the switch is from case 4 to case 3.
		     
		This handling will create a merged, final on-off-chain, where the state is only ON, when neither the RHBE, nor the DCE report a off-time. Moreover, it
		also handles recognizes if an RHBE off event is caused by an interruption or turning off of the data collection. Moreover, it also states the source of events,
		which will be used to determine, which bars have to be created in the timeline.*/
		for(int i=0; i<(resultDCE.size() + resultRHBE.size()); i++){
			long rhbeTimestamp = 0;
			String rhbeState = "";
			long dceTimestamp = 0;
			String dceState = "";
			
			// Assigns variables with a short name for longer methods.
			if(countResultRHBE < resultRHBE.size())	{
				rhbeTimestamp = resultRHBE.get(countResultRHBE).getTimestamp();
				rhbeState = resultRHBE.get(countResultRHBE).getKind();
			}
			if(countResultDCE < resultDCE.size())	{
				dceTimestamp = resultDCE.get(countResultDCE).getTimestamp();
				dceState = resultDCE.get(countResultDCE).getState();
			}	
			
			if(countResultDCE < resultDCE.size() && (dceTimestamp < rhbeTimestamp || countResultRHBE >= resultRHBE.size()))	{
				//Enter point for action (4) 
				if(dceState.equals("ON")){
					// Action (4), sets flag for the aftermath of action (4) 
					onFlagDCE = true;
					// Theoretically impossible action, but still covered if a bug triggers it. Can theoretically be deleted without consequences.
					if(onFlagDCE && onFlagRHBE)	{
						returner.add(new DataCollectionEntry("ON INTENT", dceTimestamp));
					}
				}
				//Enter point for action (1) and the aftermath of action (3)
				else if(dceState.equals("OFF"))	{
					// the aftermath of action (3)
					if(returner.get(returner.size()-1).getState().equals("OFF CRASH"))	{
						DataCollectionEntry cache = returner.remove(returner.size()-1);
						cache.setState("OFF INTENT");
						returner.add(cache);
					}
					// action (1)
					else	{
						returner.add(new DataCollectionEntry("OFF INTENT", dceTimestamp));
					}
					onFlagDCE = false;
				}
				countResultDCE++;
			}
			else	{
				// Enter point for action (2) and the aftermath of (4)
				if(rhbeState.equals("DEATHEND")){
					onFlagRHBE = true;
					if(onFlagDCE && onFlagRHBE){
						//Aftermath of (4)
						if(returner.get(returner.size()-1).getState().equals("OFF INTENT"))	{
							returner.add(new DataCollectionEntry("ON INTENT", rhbeTimestamp));
						}
						//Action (2)
						else	{
							returner.add(new DataCollectionEntry("ON CRASH", rhbeTimestamp));
						}
					}
				}
				// Enter point of action (3)
				else if(rhbeState.equals("DEATHSTART"))	{
					returner.add(new DataCollectionEntry("OFF CRASH", rhbeTimestamp));
					onFlagRHBE = false;
				}
				countResultRHBE++;
			}
			
			/* Removes the last filler-OFF, if the last element is OFF netherless. The filler-OFF was included to close the last ON-interval in the chain, 
			when the last element is of the state ON*/
			if(returner.size() >= 2 && returner.get(returner.size()-1).getState().substring(0,3).equals(returner.get(returner.size()-2).getState().substring(0,3)))	{
				returner.remove(returner.size()-1);
			}

		}
		return returner.toArray(new DataCollectionEntry[returner.size()]);
	}
	
	
	/**
	 * Gets all relevant information about a user for the user information visualization. This includes the smartphone's manufacturer, model, API level and the version
	 * of the MADCAP Android application on the smartphone, as well as the time where collection was interrupted and the time the user collected data. The time he collected
	 * data is cut according to set boundries (currently the deadzone is from midnight to 8:00 am). This method also gives the option to query the times for the whole month,
	 * where the given date lies in.
	 * @param id: the user
	 * @param time: the date
	 * @param wantsMonth: Boolean to indicate if querying for the month shall be included
	 * @param user OAuth user
	 * @return An Array containing all information stated in the method description.
	 * @throws OAuthRequestException
	 */
	@ApiMethod(name = "getUserInformation", httpMethod = ApiMethod.HttpMethod.GET)
	public EndpointArrayReturnObject getUserInfo(@Named("user") String id, @Named("time") long time,@Named("with_month") boolean wantsMonth, User user) throws OAuthRequestException	{
		SecurityEndpoint.isUserValid(user);
		
		String[] returner = new String[11];
		returner[10] = id;
		// Gets the accountable times mentioned above
		String[] accResult = (getAccountableTime(id, time, wantsMonth)).returned;
		returner[0] = accResult[0];
		returner[1] = accResult[1];

		long times[] = getStartAndEnd(time);
		
		// Queries the ReverseHeartBeatEntry probes for the day
		// List<ReverseHeartBeatEntry> rhbe = ofy().load().type(ReverseHeartBeatEntry.class).filter("userID =",id).filter("timestamp >",times[0]).filter("timestamp <",times[1]).order("timestamp").list();

		// Replaced the call. RS 08/21/19
		List<ReverseHeartBeatEntry> rhbe = ObjectifyService.run(new Work<List<ReverseHeartBeatEntry>>() {
			@Override
			public List<ReverseHeartBeatEntry> run() {
				List<ReverseHeartBeatEntry> result = ofy().load().type(ReverseHeartBeatEntry.class).filter("userID =",id).filter("timestamp >",times[0]).filter("timestamp <",times[1]).order("timestamp").list();
				return result;
			}
		});

		if(rhbe != null && !rhbe.isEmpty() &&rhbe.get(0).getKind().equals("DEATHEND"))	{
			rhbe.add(0, new ReverseHeartBeatEntry("DEATHSTART", times[0]));
		}
		
		// Calculates the interrupted times mentioned above
		long deathTime = 0L;
		long deathStart = 0L;
		long deathCount = 0;
		for(int i=0; i<rhbe.size(); i++){
			if(rhbe.get(i).getKind().equals("DEATHSTART"))	{
				deathStart = rhbe.get(i).getTimestamp();
			}
			else if(deathStart != 0L && rhbe.get(i).getKind().equals("DEATHEND"))	{
				deathTime = deathTime + rhbe.get(i).getTimestamp() - deathStart;
				deathStart = 0L;
				deathCount++;
			}
		}
		
		returner[2] = deathTime+"";
		returner[3] = deathCount+"";
		
		if(wantsMonth){
			// Calculates the interrupted times for the whole month if required
			//List<ReverseHeartBeatEntry> rhbeMonth = ofy().load().type(ReverseHeartBeatEntry.class).filter("userID =",id).filter("timestamp >",times[2]).filter("timestamp <",times[3]).order("timestamp").list();
			
			List<ReverseHeartBeatEntry> rhbeMonth = ObjectifyService.run(new Work<List<ReverseHeartBeatEntry>>() {
				@Override
				public List<ReverseHeartBeatEntry> run() {
					List<ReverseHeartBeatEntry> result = ofy().load().type(ReverseHeartBeatEntry.class).filter("userID =",id).filter("timestamp >",times[2]).filter("timestamp <",times[3]).order("timestamp").list();
					return result;
				}
			});
			
			long deathTimeMonth = 0L;
			long deathStartMonth = 0L;
			int deathCountMonth = 0;
			for(int i=0; i<rhbeMonth.size(); i++){
				if(rhbeMonth.get(i).getKind().equals("DEATHSTART"))	{
					deathStartMonth = rhbeMonth.get(i).getTimestamp();
				}
				else if(deathStartMonth != 0L && rhbeMonth.get(i).getKind().equals("DEATHEND"))	{
					deathTimeMonth = deathTimeMonth + rhbeMonth.get(i).getTimestamp() - deathStartMonth;
					deathStartMonth = 0L;
					deathCountMonth++;
				}
			}
			
			returner[4] = deathTimeMonth+"";
			returner[5] = deathCountMonth+"";
		}
		else	{
			returner[4] = "Not requested";
			returner[5] = "Not requested";	
		}
		
		// Gets the info about the smartphone
		// SystemInfoEntry userInfo = ofy().load().type(SystemInfoEntry.class).filter("userID =",id).first().now();
		
		// Replaced the call. RS 08/21/19
		SystemInfoEntry userInfo = ObjectifyService.run(new Work<SystemInfoEntry>() {
			@Override
			public SystemInfoEntry run() {
				SystemInfoEntry userInfo = ofy().load().type(SystemInfoEntry.class).filter("userID =",id).first().now();
				return userInfo;
			}
		});

		returner[6] = userInfo.getManufacturer();
		returner[7] = userInfo.getModel();
		returner[8] = userInfo.getApiLevel()+"";
		returner[9] = userInfo.getMadcapVersion();
		
		return new EndpointArrayReturnObject(returner);
	}
	
	
	/**
	 * Calculates the start end end time of the day and month, where a given timestamp lies in. Time is provided and returned in Unix milliseconds.
	 * @param time: the timestamp
	 * @return the start and end time of the month and day
	 */
	private long[] getStartAndEnd(long time)	{
		long[] returner = new long[4];
		
		Date date = new Date(time);
		Calendar calendar = Calendar.getInstance();		
		
		//Calculates the start times of the day and month
		calendar.setTime(date);
		calendar.setTimeZone(TimeZone.getTimeZone("EST"));
		calendar.set(Calendar.HOUR_OF_DAY, 0);
		calendar.set(Calendar.MINUTE, 0);
		calendar.set(Calendar.SECOND,0);
		calendar.set(Calendar.MILLISECOND,0);
		int cache = calendar.get(Calendar.DAY_OF_MONTH);
		returner[0] = calendar.getTimeInMillis();
		calendar.set(Calendar.DAY_OF_MONTH, calendar.getActualMinimum(Calendar.DAY_OF_MONTH));
		returner[2] = calendar.getTimeInMillis();
		
		//Calculattes the end times of the day and month
		calendar.set(Calendar.HOUR_OF_DAY, 23);
		calendar.set(Calendar.MINUTE, 59);
		calendar.set(Calendar.SECOND,59);
		calendar.set(Calendar.MILLISECOND,999);
		calendar.set(Calendar.DAY_OF_MONTH, cache);
		returner[1] = calendar.getTimeInMillis();
		calendar.set(Calendar.DAY_OF_MONTH, calendar.getActualMaximum(Calendar.DAY_OF_MONTH));
		returner[3] = calendar.getTimeInMillis();
		
		return returner;
	}
	
	
	/**
	 * This method calculates the time, which counts towards the time needed for a user to get a reward. Currently, Only time between 8:00 am and midnight is accounted.
	 * Times, where the collection got interrupted are still counted in favor of the user, sicne it isn"t his fault when the MADCAP Android application crashes.
	 * Of course, only time where the data collection was turned on are counted in favor of the user. 
	 * The main purpose of this method is to query and prepare the DataCollectionEntry probes of the user. The actual calculation is done by a different method.
	 * @param id: the user
	 * @param time: the timestamp, which lies in the day, for which the accountable tome shall get calculated
	 * @param wantsMonth: A boolean, whih indicates if the acountable time shall also get calculated for the whole month, where the timestamp lies in.
	 * @return
	 */
	private EndpointArrayReturnObject getAccountableTime( String id, long time, boolean wantsMonth)	{
		ObjectifyService.begin();
		
		String[] returner = {"Not requested","Not requested"};
				
		long[] times = getStartAndEnd(time);
		
		long start = times[0];
		long end = times[1];
		long startMonth = times[2];
		long endMonth = times[3];
		
		try{
			// Sets the static boundaries for the timeframe, which shall NOT count into the accountable time.
			String lowerDeathBound = "00:00:00:000";
			String upperDeathBound = "08:00:00:000";
			List<DataCollectionEntry> result = ofy().load().type(DataCollectionEntry.class).filter("userID =",id).filter("timestamp >=",start).filter("timestamp <=",end).order("timestamp").list();	
			DataCollectionEntry first = ofy().load().type(DataCollectionEntry.class).filter("userID =",id).filter("timestamp <",start).order("-timestamp").first().now();
			
			// Gets data into an on-off-chain, which spans of the whole timeframe.
			if(first != null && result != null && !result.isEmpty())	{
				result.add(0,new DataCollectionEntry(first.getState(),first.getTimestamp()));	
				result.get(0).setTimestamp(start);
			}
			
			//Calculates the accountable time, if there are probes from which time can get calculated.
			if(first != null || (result != null && !result.isEmpty()))	{
				result.add(new DataCollectionEntry("ON", end));
				returner[0] = "" + calculateAccountableTime( new EndpointArrayReturnObject(result), start, end, lowerDeathBound, upperDeathBound);
			}
			else	{
				returner[0] = "0";
			}

			if(wantsMonth)	{
				
				// List<DataCollectionEntry> resultMonth = ofy().load().type(DataCollectionEntry.class).filter("userID =",id).filter("timestamp >=",startMonth).filter("timestamp <=",endMonth).order("timestamp").list();	
				
				// Replaced the call. RS 08/21/19
				List<DataCollectionEntry> resultMonth = ObjectifyService.run(new Work<List<DataCollectionEntry>>() {
					@Override
					public List<DataCollectionEntry> run() {
						List<DataCollectionEntry> resultMonth = ofy().load().type(DataCollectionEntry.class).filter("userID =",id).filter("timestamp >=",startMonth).filter("timestamp <=",endMonth).order("timestamp").list();	
						return resultMonth;
					}
				});
				
				// DataCollectionEntry firstOfMonth = ofy().load().type(DataCollectionEntry.class).filter("userID =",id).filter("timestamp <",startMonth).order("-timestamp").first().now();
				
				// Replaced the call. RS 08/21/19
				DataCollectionEntry firstOfMonth = ObjectifyService.run(new Work<DataCollectionEntry>() {
					@Override
					public DataCollectionEntry run() {
						DataCollectionEntry firstOfMonth = ofy().load().type(DataCollectionEntry.class).filter("userID =",id).filter("timestamp <",startMonth).order("-timestamp").first().now();
						return firstOfMonth;
					}
				});
				
				// Gets month data into an on-off-chain, which spans of the whole timeframe.
				if(firstOfMonth != null && resultMonth != null && !resultMonth.isEmpty()){
					resultMonth.add(0,new DataCollectionEntry(firstOfMonth.getState(),firstOfMonth.getTimestamp()));	
					resultMonth.get(0).setTimestamp(start);
				}

				//Calculates the accountable time for the whole month, if there are probes from which time can get calculated.
				if(firstOfMonth != null || (resultMonth != null && !resultMonth.isEmpty()))	{
					resultMonth.add(new DataCollectionEntry("ON", endMonth));
					returner[1] = "" + calculateAccountableTime(new EndpointArrayReturnObject(resultMonth), startMonth, endMonth, lowerDeathBound, upperDeathBound);
				}
				else	{
					returner[1] = "0";
				}
			}
		}
		catch(ParseException e)	{
			returner[0] = "ERROR, ParseException";
		}
		
		return new EndpointArrayReturnObject(returner);	
	}
	
	
	/**
	 * This emthod calculates the accountable time out of a timeframe and an on-off-chain. A deadzone is also cut out of the accountable time. 
	 * The boundaries of the deadzone are variable and can be provided as parameters.
	 * @param passer: the on-off-chain. Unfortunately, it has to be provided as an Object-Array, since the App Engine doesn"t allows parameters of Entities (DataCollectionEntry in this case).
	 * @param windowStart: the start of the timeframe
	 * @param windowEnd: the end of the timeframe
	 * @param lowerDeathBound: the start time of the deadzone
	 * @param upperDeathBound: the end time of the deadzone
	 * @return the calculated, accountable time
	 * @throws ParseException
	 */
	private String calculateAccountableTime(EndpointArrayReturnObject passer, long windowStart, long windowEnd, String lowerDeathBound, String upperDeathBound) throws ParseException{
		
		// Gets the on-off-chain back into it's actual type
		List<DataCollectionEntry> passedList = passer.passObject;
		int startIn = 0;
		//Counter for the index of the currently ahead deadzone
		int deadZoneCounter = 1;
		passedList.get(0).setTimestamp(windowStart);
		String label = "OFF";
		if(passedList.get(passedList.size()-1).getState().equals("OFF"))	{
			label = "ON";
		}
		passedList.add(passedList.size(), new DataCollectionEntry(label,Math.min(windowEnd,Calendar.getInstance().getTimeInMillis())));
		
		//Calculates the time in Unix milliseconds for the deadzone. By adding 86400000 milliseconds, the deadzone can be shifted onto the next day.
		Calendar startReference = Calendar.getInstance();
		startReference.setTime(new Date(windowStart));
		startReference.setTimeZone(TimeZone.getTimeZone("EST"));

		Calendar deadzoneLB = Calendar.getInstance();
		deadzoneLB.setTime((new SimpleDateFormat("HH:mm:ss:SSS").parse(lowerDeathBound)));
		deadzoneLB.setTimeZone(TimeZone.getTimeZone("EST"));
		deadzoneLB.set(startReference.get(Calendar.YEAR), startReference.get(Calendar.MONTH), startReference.get(Calendar.DAY_OF_MONTH));
		long lb = deadzoneLB.getTimeInMillis();
		
		Calendar deadzoneUB = Calendar.getInstance();
		deadzoneUB.setTime((new SimpleDateFormat("HH:mm:ss:SSS").parse(upperDeathBound)));
		deadzoneUB.setTimeZone(TimeZone.getTimeZone("EST"));
		deadzoneUB.set(startReference.get(Calendar.YEAR), startReference.get(Calendar.MONTH), startReference.get(Calendar.DAY_OF_MONTH));
		if(deadzoneLB.compareTo(deadzoneUB) >= 0)	{
			deadzoneUB.add(Calendar.DATE, 1);
		}
		long ub = deadzoneUB.getTimeInMillis();
		
		LinkedList<DataCollectionEntry> list = new LinkedList<>();
		long time = 0L;
		String lastState = "";
		
		// Refines the on-off-chain, by deleting duplicate states.
		for(int i=0; i<passedList.size(); i++)	{
			if(!(lastState.equals(passedList.get(i).getState()))){
				list.add(passedList.get(i));
			}
			lastState = passedList.get(i).getState();
		}
		long start = 0L;
		DataCollectionEntry current = null;
		
		/* The main algorithm. There are six cases to consider:
		   case 1: An on-intervall is completely outside of the deadzone.
		   case 2: The on-interval lies completely in the deadzone.
		   case 3: the start time of an on-interval lies in the deadzone.
		   case 4: the end time of an on-interval lies in the deadzone.
		   case 5: The on-interval span over one or multiple deadzones.
		   case 6: case 5 and case 3 and/or 4 combined.
		   
		   For case 1, the complete interval can be added to the acc. time.
		   For case 2, none of the on-interval gets added to the acc. time.
		   For case 3, the start time of the interval has to be set to the end time of the deadzone after the end time.
		   For case 4, the end time of the interval has to be set to the start time of the deadzone before the end time.
		   For case 5, look at the deadzone counter at the time of the start time and at the time of the end time.
		   Subtract the end time deadzone counter from the start time deadzone counter. Lets call the result delta. 
		   Add delta multiplied by the milliseconds of a day (86400000ms) to the acc. time. Subtract delta multiplied by
		   the milliseconds of the deadzone from the acc. time.
		   For case 6, do the solutions for case 3 and/or case 4 first and then do the solution for case 5.
		   
		   The deadzone counter as well as the deadzone bounds get always be increased, when the current timestamp from the on-off-chain
		   is bigger than the end time of the current deadzone.
		 */
		while(0<list.size())	{
			
			current = list.removeFirst();
			/* Increasing the deadzone's bounds, until the end time of the deadzone is higher than the end time of the timeframe.
			the deadzone counter keeps track of the amount of days, by which the deadzone"s bounds had to be increased.*/
			while(current.getTimestamp()>=ub)	{
				ub = ub + 86400000;
				lb = lb + 86400000;
				deadZoneCounter++;
			}
			
			if(current.getState().equals("ON") && start == 0L)	{
				//Solution for case 3
				if(lb < current.getTimestamp() && current.getTimestamp() < ub)	{
					current.setTimestamp(ub);
				}
				//Sets flag for the old deadzone counter for solution of case 5.
				else{
					startIn = deadZoneCounter;
				}
				start = current.getTimestamp();
			}
			else if(current.getState().equals("OFF") && start != 0L){
				//Solution for case 4
				if(lb < current.getTimestamp() && current.getTimestamp() < ub)	{
					current.setTimestamp(lb);
				}
				//Solutions for case 5 and case 2
				if(current.getTimestamp() > start)	{
					// Adds the complete time of the on-interval
					time = time + current.getTimestamp() - start;
					if(startIn != 0)	{
						if(startIn != deadZoneCounter){
							//Subtracts the times of the deadzones
							for(int j=startIn; j<deadZoneCounter; j++)	{
								time = time - (ub - lb);
							}
						}
						startIn = 0;
					}
				}
				start = 0L;
			}
		}
		return ""+time;
	}
}