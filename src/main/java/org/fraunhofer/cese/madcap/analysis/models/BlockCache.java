package org.fraunhofer.cese.madcap.analysis.models;

import com.googlecode.objectify.annotation.Entity;
import com.googlecode.objectify.annotation.Id;

/**
 * This object represents a cached location in the datastore.
 * It connects the location with the census block it is in.
 * @author SHintzen
 *
 */
@Entity
public class BlockCache {

	@Id
	public String compositeId;
	public float latitude;
	public float longitude;
	public String block;
	
	/**
	 * Setter for composite Index
	 */
	public void createCompositeId()	{
		this.compositeId = ""+latitude+longitude;
	}
}
