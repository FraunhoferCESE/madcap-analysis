package org.fraunhofer.cese.madcap.analysis.models;

import java.util.Collection;
import java.util.List;

import com.googlecode.objectify.annotation.Entity;
import com.googlecode.objectify.annotation.Id;

@Entity
public class ProbeSet {
	@Id
	private Long id;
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