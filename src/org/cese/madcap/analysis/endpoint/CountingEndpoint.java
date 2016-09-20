package org.cese.madcap.analysis.endpoint;

import static org.cese.madcap.analysis.OfyService.ofy;

import java.util.List;
import java.util.logging.Logger;

import org.cese.madcap.analysis.models.ProbeEntry;
import org.cese.madcap.analysis.models.ProbeSet;

import com.google.api.server.spi.config.Api;
import com.google.api.server.spi.config.ApiMethod;
import com.google.api.server.spi.config.ApiNamespace;
import com.google.api.server.spi.config.Named;
import com.googlecode.objectify.ObjectifyService;

@Api(name = "analysisEndpoint", 
	version = "v1", 
	namespace = @ApiNamespace(
								ownerDomain = "madcap.cese.fraunhofer.org", 
								ownerName = "madcap.cese.fraunhofer.org", 
								packagePath = "analysis")
		)
public class CountingEndpoint {

	private static final Logger logger = Logger.getLogger(CountingEndpoint.class.getName());

//	private boolean fill_db_manually = false;
//
//	private void fillLocalDatabase(int ammount) {
//		ProbeEntry[] p = new ProbeEntry[ammount];
//		for (int i = 0; i < ammount; i++) {
//			p[i] = new ProbeEntry();
//			p[i].setId("" + i);
//			p[i].setProbeType("" + i);
//			p[i].setSensorData("" + i);
//			p[i].setTimestamp((long) i);
//			p[i].setUserID("" + i);
//		}
//		ofy().save().entities(p).now();
//	}

	@ApiMethod(name = "getMyProbeEntries", httpMethod = ApiMethod.HttpMethod.GET)
	public ProbeSet getMyProbeEntries(@Named("amount") Integer amount) {
		ObjectifyService.begin();

		// TODO: Need to verify that "amount" is a legal value
		List<ProbeEntry> probeList = ofy().load().type(ProbeEntry.class).limit(amount).list();

		return new ProbeSet(probeList);
	}
}