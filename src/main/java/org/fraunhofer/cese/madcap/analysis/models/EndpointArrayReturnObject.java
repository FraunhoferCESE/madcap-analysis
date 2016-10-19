package org.fraunhofer.cese.madcap.analysis.models;

/**
 * A container to return values to the client through endpoints. 
 * Endpoints can't return primitive types. Therefore, this class exists.
 * @author SHintzen
 *
 */
public class EndpointArrayReturnObject {
	
	public String[] returned;
	
	public EndpointArrayReturnObject(String[] returned){
		this.returned = returned;
	}
}
