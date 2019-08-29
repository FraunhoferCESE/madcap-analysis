package org.fraunhofer.cese.madcap.analysis;

import org.fraunhofer.cese.madcap.analysis.models.ActivityEntry;
import org.fraunhofer.cese.madcap.analysis.models.DataCollectionEntry;
import org.fraunhofer.cese.madcap.analysis.models.ForegroundBackgroundEventEntry;
import org.fraunhofer.cese.madcap.analysis.models.LocationEntry;
import org.fraunhofer.cese.madcap.analysis.models.ReverseHeartBeatEntry;
import org.fraunhofer.cese.madcap.analysis.models.SystemInfoEntry;
import org.fraunhofer.cese.madcap.analysis.models.UserInformation;

import com.googlecode.objectify.*;

/**
 * Handles all the neccessary setup for Obejctify to work. Objectify is used by the endpoints to get
 * data out of the Google datastore.
 */
public class OfyService {
	/*static {
		 ObjectifyService.register(LocationEntry.class);
		 ObjectifyService.register(UserInformation.class);
		 ObjectifyService.register(ActivityEntry.class);
		 ObjectifyService.register(ForegroundBackgroundEventEntry.class);
		 ObjectifyService.register(DataCollectionEntry.class);
		 ObjectifyService.register(ReverseHeartBeatEntry.class);
		 ObjectifyService.register(SystemInfoEntry.class);
	}*/

	/**
	 * Returns the Objectify service wrapper.
	 * 
	 * @return The Objectify service wrapper.
	 */
	public static Objectify ofy() {
		return ObjectifyService.ofy();
	}
	
	/**
	 * Register the classes in a seperate method instead of a static block that was on top of the class.
	 * This caused ClassCastExceptions and probably worked in an older version.
	 * This method is called exactly once in SecurityEndpoint.isUserValid(User).
	 *
	 * Reference: 
	 * - https://stackoverflow.com/questions/17513219/objectify-v4-ref-get-throwing-classcastexception
	 * - https://github.com/objectify/objectify/wiki/BestPractices
	 *
	 * 08/21/19 RS
	 */
	public static void registerClasses() {
		ObjectifyService.register(LocationEntry.class);
		ObjectifyService.register(UserInformation.class);
		ObjectifyService.register(ActivityEntry.class);
		ObjectifyService.register(ForegroundBackgroundEventEntry.class);
		ObjectifyService.register(DataCollectionEntry.class);
		ObjectifyService.register(ReverseHeartBeatEntry.class);
		ObjectifyService.register(SystemInfoEntry.class);
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
