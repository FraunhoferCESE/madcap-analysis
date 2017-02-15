package org.fraunhofer.cese.madcap.analysis.models;

/**
 * A container to return values to the client through endpoints. 
 * Endpoints can't return primitive types. Therefore, this class exists to return multiple primitive types parsed into an String array.
 * @author Stefan Hintzen
 */
public class EndpointReturnObject {
	
	public String returned;
	public Object passObject;
	
	public EndpointReturnObject(String returned){
		this.returned = returned;
	}
	
	public EndpointReturnObject(Object passObject){
		this.passObject = passObject;
	}
}
