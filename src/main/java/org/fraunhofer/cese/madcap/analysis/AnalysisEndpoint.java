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
			List<ForegroundBackgroundEventEntry> activities = ofy().load().type(ForegroundBackgroundEventEntry.class).filter("userID =",id).filter("eventType =",1).filter("timestamp >=",startTime).filter("timestamp <=",endTime).order("timestamp").list();
			if(shallFirst)	{
				ForegroundBackgroundEventEntry firstActivity = ofy().load().type(ForegroundBackgroundEventEntry.class).filter("userID =",id).filter("eventType =",1).filter("timestamp <",startTime).order("-timestamp").first().now();				
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
	public DataCollectionEntry[] getOnOffTimePublic(@Named("user") String id, @Named("start") long startTime, @Named("end") long endTime, User user) throws OAuthRequestException{	
		return getOnOffTime(id, startTime, endTime, user);	
	}
		
	
	
	private DataCollectionEntry[] getOnOffTime(String id, long startTime, long endTime, User user) throws OAuthRequestException{
		SecurityEndpoint.isUserValid(user);
		ObjectifyService.begin();
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
	
	@ApiMethod(name = "getUserInformation", httpMethod = ApiMethod.HttpMethod.GET)
	public EndpointArrayReturnObject getUserInfo(@Named("user") String id,@Named("time") long time,@Named("with_month") boolean wantsMonth, User user) throws OAuthRequestException	{
		SecurityEndpoint.isUserValid(user);
		
		String[] accResult = (getAccountableTime(id, time, wantsMonth)).returned;
		String[] returner = new String[10];
		returner[0] = accResult[0];
		returner[1] = accResult[1];

		long times[] = getStartAndEnd(time);
		
		List<ReverseHeartBeatEntry> rhbe = ofy().load().type(ReverseHeartBeatEntry.class).filter("userID =",id).filter("timestamp >",times[0]).filter("timestamp <",times[1]).order("timestamp").list();
		List<ReverseHeartBeatEntry> rhbeMonth = ofy().load().type(ReverseHeartBeatEntry.class).filter("userID =",id).filter("timestamp >",times[2]).filter("timestamp <",times[3]).order("timestamp").list();

		if(rhbe.get(0).getKind().equals("DEATHEND"))	{
			rhbe.add(0, new ReverseHeartBeatEntry("DEATHSTART", times[0]));
		}
		
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
		returner[2] = deathTime+"";
		returner[3] = deathCount+"";
		returner[4] = deathTimeMonth+"";
		returner[5] = deathCountMonth+"";
		
		SystemInfoEntry userInfo = ofy().load().type(SystemInfoEntry.class).filter("userID =",id).first().now();

		returner[6] = userInfo.getManufacturer();
		returner[7] = userInfo.getModel();
		returner[8] = userInfo.getApiLevel()+"";
		returner[9] = userInfo.getMadcapVersion();
		
		return new EndpointArrayReturnObject(returner);
	}
	
	private long[] getStartAndEnd(long time)	{
		long[] returner = new long[4];
		
		Date date = new Date(time);
		Calendar calendar = Calendar.getInstance();		
		
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
	
	
	private EndpointArrayReturnObject getAccountableTime( String id, long time, boolean wantsMonth)	{
		ObjectifyService.begin();
		
		String[] returner = {"Not requested","Not requested"};
				
		long[] times = getStartAndEnd(time);
		
		long start = times[0];
		long end = times[1];
		long startMonth = times[2];
		long endMonth = times[3];
		
		try{
			String lowerDeathBound = "00:00:00:000";
			String upperDeathBound = "08:00:00:000";
			List<DataCollectionEntry> result = ofy().load().type(DataCollectionEntry.class).filter("userID =",id).filter("timestamp >=",start).filter("timestamp <=",end).order("timestamp").list();	
			DataCollectionEntry first = ofy().load().type(DataCollectionEntry.class).filter("userID =",id).filter("timestamp <",start).order("-timestamp").first().now();
			if(first != null && result != null && !result.isEmpty())	{
				result.add(0,new DataCollectionEntry(first.getState(),first.getTimestamp()));	
				result.get(0).setTimestamp(start);
			}
			if(first != null || (result != null && !result.isEmpty()))	{
				result.add(new DataCollectionEntry("ON", end));
				returner[0] = "" + calculateAccountableTime( new EndpointArrayReturnObject(result), start, end, lowerDeathBound, upperDeathBound);
			}
			else	{
				returner[0] = "0";
			}
			
			if(wantsMonth)	{
				List<DataCollectionEntry> resultMonth = ofy().load().type(DataCollectionEntry.class).filter("userID =",id).filter("timestamp >=",startMonth).filter("timestamp <=",endMonth).order("timestamp").list();	
				DataCollectionEntry firstOfMonth = ofy().load().type(DataCollectionEntry.class).filter("userID =",id).filter("timestamp <",startMonth).order("-timestamp").first().now();
				if(firstOfMonth != null && resultMonth != null && !resultMonth.isEmpty()){
					resultMonth.add(0,new DataCollectionEntry(firstOfMonth.getState(),firstOfMonth.getTimestamp()));	
					resultMonth.get(0).setTimestamp(start);
				}

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
	
	private String calculateAccountableTime(EndpointArrayReturnObject passer, long windowStart, long windowEnd, String lowerDeathBound, String upperDeathBound) throws ParseException{
		
		List<DataCollectionEntry> passedList = passer.passObject;
		int startIn = 0;
		int deadZoneCounter = 1;
		passedList.get(0).setTimestamp(windowStart);
		String label = "OFF";
		if(passedList.get(passedList.size()-1).getState().equals("OFF"))	{
			label = "ON";
		}
		passedList.add(passedList.size(), new DataCollectionEntry(label,Math.min(windowEnd,Calendar.getInstance().getTimeInMillis())));
		
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

		for(int i=0; i<passedList.size(); i++)	{
			if(!(lastState.equals(passedList.get(i).getState()))){
				list.add(passedList.get(i));
			}
			lastState = passedList.get(i).getState();
		}
		long start = 0L;
		DataCollectionEntry current = null;
		while(0<list.size())	{
			
			current = list.removeFirst();
			while(current.getTimestamp()>=ub)	{
				ub = ub + 86400000;
				lb = lb + 86400000;
				deadZoneCounter++;
			}
			
			if(current.getState().equals("ON") && start == 0L)	{
				if(lb < current.getTimestamp() && current.getTimestamp() < ub)	{
					current.setTimestamp(ub);
				}
				else{
					startIn = deadZoneCounter;
				}
				start = current.getTimestamp();
			}
			else if(current.getState().equals("OFF") && start != 0L){
				if(lb < current.getTimestamp() && current.getTimestamp() < ub)	{
					current.setTimestamp(lb);
				}
				if(current.getTimestamp() > start)	{
					time = time + current.getTimestamp() - start;
					if(startIn != 0)	{
						if(startIn != deadZoneCounter){
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