package org.fraunhofer.cese.madcap.analysis.models;

public class TimelineReturnContainer {

	public ActivityEntry[] returnedAE;
	public ForegroundBackgroundEventEntry[] returnedFBEE;
	
	public TimelineReturnContainer(){}

	public TimelineReturnContainer(ActivityEntry[] returnedAE){
		this.returnedAE = returnedAE;
	}
	
	public TimelineReturnContainer(ForegroundBackgroundEventEntry[] returnedFBEE){
		this.returnedFBEE = returnedFBEE;
	}
}
