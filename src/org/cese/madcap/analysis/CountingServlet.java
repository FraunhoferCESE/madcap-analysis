package org.cese.madcap.analysis;

import java.io.IOException;
import java.util.logging.Level;
import java.util.logging.Logger;
import static org.cese.madcap.analysis.OfyService.ofy;
import javax.servlet.http.*;

import org.cese.madcap.analysis.models.ProbeEntry;

@SuppressWarnings("serial")
public class CountingServlet extends HttpServlet {
	private static final Logger logger = Logger.getLogger(CountingServlet.class.getName());

	public void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {

		try {
			int count = ofy().load().type(ProbeEntry.class).count();
			resp.setContentType("text/plain");
			resp.getWriter().println("# of ProbeEntry rows: " + count);
		} catch (IOException e) {
			logger.log(Level.SEVERE, e.toString(), e);
		}
	}
}
