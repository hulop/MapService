/*******************************************************************************
 * Copyright (c) 2014, 2017  IBM Corporation, Carnegie Mellon University and others
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *******************************************************************************/
package hulop.hokoukukan.servlet;

import java.io.IOException;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.wink.json4j.JSONArray;
import org.apache.wink.json4j.JSONException;
import org.apache.wink.json4j.JSONObject;

import hulop.hokoukukan.bean.AuthBean;
import hulop.hokoukukan.bean.DatabaseBean;

/**
 * Servlet implementation class LoggingServlet
 */
@WebServlet("/api/log")
public class LoggingServlet extends HttpServlet {
	private static final long serialVersionUID = 1L;
	private static final AuthBean authBean = new AuthBean();

	private final JSONObject lastLogs = new JSONObject();

	/**
	 * @see HttpServlet#HttpServlet()
	 */
	public LoggingServlet() {
		super();
		// TODO Auto-generated constructor stub
	}

	/**
	 * @see HttpServlet#doGet(HttpServletRequest request, HttpServletResponse
	 *      response)
	 */
	protected void doGet(HttpServletRequest request, HttpServletResponse response)
			throws ServletException, IOException {
		request.setCharacterEncoding("UTF-8");
		String action = request.getParameter("action");
		String auditor_api_key = request.getParameter("auditor_api_key");
		if (!"insert".equals(action)
				&& (auditor_api_key == null || !auditor_api_key.equals(System.getenv("AUDITOR_API_KEY")))) {
			if (!authBean.hasRole(request, "auditor")) {
				response.sendError(HttpServletResponse.SC_FORBIDDEN);
				return;
			}
		}
		String data = request.getParameter("data");
		if ("insert".equals(action) && data != null) {
			boolean success = false;
			try {
				JSONArray array = new JSONArray(data);
				if (array.size() > 0) {
					DatabaseBean.insertLogs(array);
					for (int i = array.size() - 1; i >= 0; i--) {
						JSONObject last = array.getJSONObject(i);
						if (last.has("event") && "location".equals(last.getString("event")) && last.has("client")) {
							lastLogs.put(last.getString("client"), last);
							break;
						}
					}
					success = true;
				}
			} catch (JSONException e) {
				e.printStackTrace();
			}
			if (success) {
				response.getWriter().append("SUCCESS");
			} else {
				response.sendError(HttpServletResponse.SC_BAD_REQUEST, "FAIL");
			}
			return;
		} else if ("stats".equals(action)) {
			RouteSearchServlet.sendJSON(DatabaseBean.getLogStats(), request, response);
			return;
		} else if ("get".equals(action)) {
			String clientId = request.getParameter("clientId");
			String start = request.getParameter("start");
			String end = request.getParameter("end");
			String skip = request.getParameter("skip");
			String limit = request.getParameter("limit");
			String event = request.getParameter("event");
			if (skip == null && limit == null && start == null && end == null) {
				start = Long.toString(System.currentTimeMillis() - 24 * 60 * 60 * 1000);
				end = Long.toString(System.currentTimeMillis());
				limit = "1000";
			}
			String fileName = request.getParameter("fileName");
			if (fileName != null) {
				response.setHeader("Content-Disposition", String.format("attachment; filename=\"%s\"", fileName));
			}
			RouteSearchServlet.sendJSON(DatabaseBean.getLogs(clientId, start, end, skip, limit, event), request, response);
			return;
		} else if ("last".equals(action)) {
			String clientId = request.getParameter("clientId");
			JSONObject last = null;
			if (clientId == null) {
				last = lastLogs;
			} else if (lastLogs.has(clientId)) {
				try {
					last = lastLogs.getJSONObject(clientId);
				} catch (JSONException e) {
					e.printStackTrace();
				}
			}
			if (last != null) {
				RouteSearchServlet.sendJSON(last, request, response);
			} else {
				response.sendError(HttpServletResponse.SC_NOT_FOUND);
			}
			return;
		} else if ("get_agreements".equals(action)) {
			RouteSearchServlet.sendJSON(DatabaseBean.getAgreements(), request, response);
			return;
		} else if ("get_answers".equals(action)) {
			String clientId = request.getParameter("clientId");
			if (clientId != null) {
				String fileName = request.getParameter("fileName");
				if (fileName != null) {
					response.setHeader("Content-Disposition", String.format("attachment; filename=\"%s\"", fileName));
				}
				RouteSearchServlet.sendJSON(DatabaseBean.getAnswers(clientId), request, response);
				return;
			}
		}
		response.sendError(HttpServletResponse.SC_BAD_REQUEST);
	}

	/**
	 * @see HttpServlet#doPost(HttpServletRequest request, HttpServletResponse
	 *      response)
	 */
	protected void doPost(HttpServletRequest request, HttpServletResponse response)
			throws ServletException, IOException {
		// TODO Auto-generated method stub
		doGet(request, response);
	}

}
