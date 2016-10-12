package org.fraunhofer.cese.madcap.analysis;

import org.fraunhofer.cese.madcap.analysis.models.ProbeDataSet;
import org.fraunhofer.cese.madcap.analysis.models.ProbeEntry;
import org.fraunhofer.cese.madcap.analysis.models.ProbeSet;
import org.fraunhofer.cese.madcap.analysis.models.UserInformation;

import com.googlecode.objectify.*;

/**
 * Handles all the neccessary setup for Obejctify to work. Objectify is used by the endpoints to get
 * data out of the Google Cloud Storage.
 */
public class OfyService {
	static {
		 ObjectifyService.register(ProbeDataSet.class);
		 ObjectifyService.register(ProbeEntry.class);
		 ObjectifyService.register(ProbeSet.class);
		 ObjectifyService.register(UserInformation.class);
	}

	/**
	 * Returns the Objectify service wrapper.
	 * 
	 * @return The Objectify service wrapper.
	 */
	public static Objectify ofy() {
		return ObjectifyService.ofy();
	}

	/**
	 * Returns the Objectify factory service.
	 * 
	 * @return The factory service.
	 */
	public static ObjectifyFactory factory() {
		return ObjectifyService.factory();
	}
}
