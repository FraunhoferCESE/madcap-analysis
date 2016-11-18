package org.fraunhofer.cese.madcap.analysis;


import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URL;
import java.nio.charset.Charset;
import java.util.LinkedList;
import java.util.List;

import org.fraunhofer.cese.madcap.analysis.models.BlockCache;
import org.fraunhofer.cese.madcap.analysis.models.EndpointArrayReturnObject;
import org.fraunhofer.cese.madcap.analysis.models.LocationEntry;
import org.fraunhofer.cese.madcap.analysis.models.LocationSet;
import org.fraunhofer.cese.madcap.analysis.models.ProbeEntry;
import org.fraunhofer.cese.madcap.analysis.models.ProbeSet;

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
@Api(name = "analysisEndpoint", version = "v1", namespace = @ApiNamespace(ownerDomain = "madcap.cese.fraunhofer.org", ownerName = "madcap.cese.fraunhofer.org", packagePath = "analysis"))
public class AnalysisEndpoint {

	
	/**
	 * Gets a flexible number of ProbeEntries from the Cloud storage
	 * @param amount the number of ProbeEnteries to return
	 * @return A set with the returned ProbeEntries
	 */
	@ApiMethod(name = "getMyProbeEntries", httpMethod = ApiMethod.HttpMethod.GET)
	public ProbeSet getMyProbeEntries(@Named("amount") int amount, User user) throws OAuthRequestException{
		ObjectifyService.begin();
		List<ProbeEntry> probeList = ofy().load().type(ProbeEntry.class).limit(amount).list();
		return new ProbeSet(probeList);
	}

	
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
	public LocationSet getInWindow(@Named("user") String id, @Named("start") long startTime, @Named("end") long endTime, User user) throws OAuthRequestException{
		ObjectifyService.begin();
		List<LocationEntry> result = ofy().load().type(LocationEntry.class).filter("userID =",id).filter("timestamp >=",startTime).filter("timestamp <=",endTime).order("timestamp").list();
		return new LocationSet(result);
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
	 * @throws OAuthRequestException
	 */
	@ApiMethod(name = "getUsers", httpMethod = ApiMethod.HttpMethod.GET)
	public EndpointArrayReturnObject getUsers(User user) throws OAuthRequestException{
		ObjectifyService.begin();
		 List<LocationEntry> result = ofy().load().type(LocationEntry.class).project("userID").distinct(true).list();
		 String[] users = new String[result.size()];
		 for(int i=0; i<result.size(); i++){
			users[i] = result.get(i).getUserID();
		 }
		 return new EndpointArrayReturnObject(users);
	}
}