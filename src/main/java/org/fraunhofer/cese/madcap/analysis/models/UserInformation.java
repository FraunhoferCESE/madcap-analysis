package org.fraunhofer.cese.madcap.analysis.models;

import java.util.LinkedList;

import com.googlecode.objectify.annotation.Entity;
import com.googlecode.objectify.annotation.Id;

/**
 * A container for all relevant information regarding a user. This includes his personal information and his visibility rights.
 * @author Stefan Hintzen
 */
@Entity
public class UserInformation {
	
	@Id
	private String email;
	
	/* This variable is not used, but needs to be in the class to match the entities signature in
	 * the Cloud Storage */
	private boolean see_GUI;
	
	/**
	 * A getter for a list of all permissions. needs to be expanded as new permissions get added
	 * ti the webapp.
	 * @return A linkedList of all permissions by name
	 */
	public LinkedList<String> getPermissionList()	{
		LinkedList<String> permissionList = new LinkedList<>();
		if(this.see_GUI== true){
			permissionList.push("SEE_GUI");
		}
		return permissionList;
	}
}
