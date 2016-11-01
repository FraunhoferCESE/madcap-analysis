package org.fraunhofer.cese.madcap.analysis;


import java.util.List;

import org.fraunhofer.cese.madcap.analysis.models.EndpointArrayReturnObject;
import org.fraunhofer.cese.madcap.analysis.models.ProbeEntry;
import org.fraunhofer.cese.madcap.analysis.models.ProbeSet;

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
	
	@ApiMethod(name = "getInWindow", httpMethod = ApiMethod.HttpMethod.POST)
	public ProbeSet getInWindow(@Named("user") String id, @Named("start") long startTime, @Named("end") long endTime, User user) throws OAuthRequestException{
		ObjectifyService.begin();
		 List<ProbeEntry> result = ofy().load().type(ProbeEntry.class).filter("userID =", id).filter("probeType =","\"edu.mit.media.funf.probe.builtin.SimpleLocationProbe\"").filter("timestamp >=",startTime).filter("timestamp <=",endTime).order("-timestamp").list();
		 return new ProbeSet(result);
	}
	
	@ApiMethod(name = "getUsers", httpMethod = ApiMethod.HttpMethod.GET)
	public EndpointArrayReturnObject getUsers(User user) throws OAuthRequestException{
		ObjectifyService.begin();
		 List<ProbeEntry> result = ofy().load().type(ProbeEntry.class).project("userID").distinct(true).list();
		 String[] users = new String[result.size()];
		 for(int i=0; i<result.size(); i++){
			users[i] = result.get(i).getUserID();
		 }
		 return new EndpointArrayReturnObject(users);
	}
}