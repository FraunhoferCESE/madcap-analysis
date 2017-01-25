package org.fraunhofer.cese.madcap.analysis;

import org.fraunhofer.cese.madcap.analysis.models.ActivityEntry;
import org.fraunhofer.cese.madcap.analysis.models.BlockCache;
import org.fraunhofer.cese.madcap.analysis.models.DataCollectionEntry;
import org.fraunhofer.cese.madcap.analysis.models.ForegroundBackgroundEventEntry;
import org.fraunhofer.cese.madcap.analysis.models.LocationEntry;
import org.fraunhofer.cese.madcap.analysis.models.ReverseHeartBeatEntry;
import org.fraunhofer.cese.madcap.analysis.models.UserInformation;

import com.googlecode.objectify.*;

/**
 * Handles all the neccessary setup for Obejctify to work. Objectify is used by the endpoints to get
 * data out of the Google Cloud Storage.
 */
public class OfyService {
	static {
		 ObjectifyService.register(LocationEntry.class);
		 ObjectifyService.register(UserInformation.class);
		 ObjectifyService.register(BlockCache.class);
		 ObjectifyService.register(ActivityEntry.class);
		 ObjectifyService.register(ForegroundBackgroundEventEntry.class);
		 ObjectifyService.register(DataCollectionEntry.class);
		 ObjectifyService.register(ReverseHeartBeatEntry.class);
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
