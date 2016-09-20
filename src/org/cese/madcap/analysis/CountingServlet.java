package org.cese.madcap.analysis;

import java.io.IOException;
import java.util.List;
import static org.cese.madcap.analysis.OfyService.ofy;

import javax.servlet.http.*;

import org.cese.madcap.analysis.models.ProbeEntry;

import com.googlecode.objectify.ObjectifyService;


@SuppressWarnings("serial")

public class CountingServlet extends HttpServlet{
	
	private boolean fill_db_manually = false;
	
	public void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {

		try {
			ObjectifyService.register(ProbeEntry.class);
			int count = ofy().load().type(ProbeEntry.class).limit(49).count();
			resp.setContentType("text/plain");
			if (fill_db_manually) {
				fillLocalDatabase(50);
			}
			resp.getWriter().println("# of ProbeEntry rows: " + count);
			resp = myProbeEntries(49, resp);
		} catch (IOException e) {}
	}
	
	
	public void fillLocalDatabase(int ammount) {
		ProbeEntry[] p = new ProbeEntry[ammount];
		for (int i = 0; i < ammount; i++) {
			p[i] = new ProbeEntry();
			p[i].setId("" + i);
			p[i].setProbeType("" + i);
			p[i].setSensorData("" + i);
			p[i].setTimestamp((long) i);
			p[i].setUserID("" + i);
		}
		ofy().save().entities(p).now();
	}
	
	
	public HttpServletResponse myProbeEntries(final int ammount, final HttpServletResponse resp)	{
	ObjectifyService.begin();
	List<ProbeEntry> probeList = ofy().load().type(ProbeEntry.class).limit(ammount).list();
	resp.setContentType("text/plain");
	for(int i=0; i<probeList.size(); i++){
		ProbeEntry probe = probeList.get(i);
		String csv = probe.getTimestamp()+","+probe.getProbeType()+","+probe.getSensorData()+","+probe.getUserID()+",";
		try {
			resp.getWriter().write(csv);
			//resp.addHeader(probe.getId(), csv);
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}
	return resp;
	}
}