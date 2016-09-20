package org.cese.madcap.analysis.models;

import java.util.Collection;
import java.util.List;

import com.googlecode.objectify.annotation.Entity;

@Entity
public class ProbeSet {
	private List<ProbeEntry> entries;

	public ProbeSet(List<ProbeEntry> entries) {
		super();
		this.entries = entries;
	}

	public Collection<ProbeEntry> getEntries() {
		return entries;
	}

	public void setEntries(List<ProbeEntry> entries) {
		this.entries = entries;
	}

}
