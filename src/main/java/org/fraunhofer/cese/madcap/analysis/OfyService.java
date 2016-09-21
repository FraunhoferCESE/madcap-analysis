package org.fraunhofer.cese.madcap.analysis;

import org.fraunhofer.cese.madcap.analysis.models.ProbeDataSet;
import org.fraunhofer.cese.madcap.analysis.models.ProbeEntry;
import org.fraunhofer.cese.madcap.analysis.models.ProbeSet;

import com.googlecode.objectify.*;

/**
 *
 */
public class OfyService {
	static {
		 ObjectifyService.register(ProbeDataSet.class);
		 ObjectifyService.register(ProbeEntry.class);
		 ObjectifyService.register(ProbeSet.class);
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
