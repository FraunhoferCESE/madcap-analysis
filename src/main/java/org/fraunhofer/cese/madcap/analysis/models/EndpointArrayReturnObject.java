package org.fraunhofer.cese.madcap.analysis.models;

import java.util.List;

/**
 * A container to return values to the client through endpoints. 
 * Endpoints can't return primitive types. Therefore, this class exists to return primitive types parsed as Strings.
 * @author Stefan Hintzen
 */
public class EndpointArrayReturnObject {
	
	public String[] returned;
	public List passObject;
	
	public EndpointArrayReturnObject(String[] returned){
		this.returned = returned;
	}

	public EndpointArrayReturnObject(List passObject){
		this.passObject = passObject;
	}
}
