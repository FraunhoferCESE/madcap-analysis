package org.fraunhofer.cese.madcap.analysis.models;

import java.util.Collection;
import java.util.List;

import com.googlecode.objectify.annotation.Entity;
import com.googlecode.objectify.annotation.Id;

/**
 * A collection of ProbeEntries. Can be used to return a batch of ProbeEntries in one operation
 *
 */
@Entity
public class LocationSet {
	@Id
	private Long id;
	private List<LocationEntry> entries;

	public LocationSet(List<LocationEntry> entries) {
		super();
		this.entries = entries;
	}

	public Collection<LocationEntry> getEntries() {
		return entries;
	}

	public void setEntries(List<LocationEntry> entries) {
		this.entries = entries;
	}

}
