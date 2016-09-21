package org.fraunhofer.cese.madcap.analysis;

import static org.fraunhofer.cese.madcap.analysis.OfyService.ofy;

import java.util.List;

import org.fraunhofer.cese.madcap.analysis.models.ProbeEntry;
import org.fraunhofer.cese.madcap.analysis.models.ProbeSet;

import com.google.api.server.spi.config.Api;
import com.google.api.server.spi.config.ApiMethod;
import com.google.api.server.spi.config.ApiNamespace;
import com.google.api.server.spi.config.Named;
import com.googlecode.objectify.ObjectifyService;

@Api(name = "analysisEndpoint", version = "v1", namespace = @ApiNamespace(ownerDomain = "madcap.cese.fraunhofer.org", ownerName = "madcap.cese.fraunhofer.org", packagePath = "analysis"))
public class AnalysisEndpoint {

	private void fillLocalDatabase(int ammount) {
		ProbeEntry[] p = new ProbeEntry[ammount];
		for (int i = 0; i < ammount; i++) {
			p[i] = new ProbeEntry();
			p[i].setId("" + i);
			p[i].setProbeType("" + i);
			p[i].setSensorData("" + i);
			p[i].setTimestamp((long) i);
			p[i].setUserID("" + i);
		}
		ofy().save().entities(p).now();
	}

	@ApiMethod(name = "getMyProbeEntries", httpMethod = ApiMethod.HttpMethod.GET)
	public ProbeSet getMyProbeEntries(@Named("amount") int amount) {
		ObjectifyService.begin();

		int count = ofy().load().type(ProbeEntry.class).count();
		if (count < 1) {
			fillLocalDatabase(50);
		}

		// TODO: Need to verify that "amount" is a legal value
		List<ProbeEntry> probeList = ofy().load().type(ProbeEntry.class).limit(amount).list();

		return new ProbeSet(probeList);
	}
}