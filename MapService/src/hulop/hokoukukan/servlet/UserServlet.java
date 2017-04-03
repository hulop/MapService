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

import org.apache.wink.json4j.JSONObject;

import hulop.hokoukukan.bean.AuthBean;

/**
 * Servlet implementation class UserServlet
 */
@WebServlet("/api/user")
public class UserServlet extends HttpServlet {
	private static final long serialVersionUID = 1L;
	private static final AuthBean authBean = new AuthBean();

	/**
	 * @see HttpServlet#HttpServlet()
	 */
	public UserServlet() {
		super();
		// TODO Auto-generated constructor stub
	}

	/**
	 * @see HttpServlet#doGet(HttpServletRequest request, HttpServletResponse
	 *      response)
	 */
	protected void doGet(HttpServletRequest request, HttpServletResponse response)
			throws ServletException, IOException {
		String action = request.getParameter("action");
		if ("get-profile".equals(action)) {
			Object profile = null;
			try {
				profile = authBean.getProfile(request);
			} catch (Exception e) {
				e.printStackTrace();
			}
			if (profile == null) {
				response.sendError(HttpServletResponse.SC_FORBIDDEN);
			} else {
				RouteSearchServlet.sendJSON(profile, request, response);
			}
			return;
		}
		// if ("check-client-id".equals(action)) {
		// String clientId = request.getParameter("clientId");
		// if (clientId == null) {
		// long time = System.currentTimeMillis();
		// clientId = String.format("%X", (time * 256) + (long) (Math.random() *
		// 256));
		// System.out.println(clientId + ": " +
		// request.getHeader("User-Agent"));
		// }
		// if (clientId == null) {
		// response.sendError(HttpServletResponse.SC_FORBIDDEN);
		// return;
		// }
		// JSONObject obj = new JSONObject();
		// try {
		// obj.put("clientId", clientId);
		// } catch (JSONException e) {
		// e.printStackTrace();
		// }
		// RouteSearchServlet.sendJSON(obj, response);
		// return;
		// }
		if (!authBean.hasRole(request, "admin")) {
			response.sendError(HttpServletResponse.SC_FORBIDDEN);
			return;
		}
		try {
			Object result = null;
			if ("list-users".equals(action)) {
				result = authBean.listUsers();
			} else if ("add-user".equals(action)) {
				String user = request.getParameter("user");
				String password = request.getParameter("password");
				String roles[] = request.getParameterValues("role");
				System.out.println(user + "/" + password + "/" + roles);
				if (user != null && password != null && roles != null && roles.length > 0) {
					authBean.addUser(user, password, roles);
				}
			} else if ("remove-user".equals(action)) {
				String user = request.getParameter("user");
				if (user != null) {
					authBean.removeUser(new JSONObject(user));
				}
			} else {
				response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Invalid user or action");
				return;
			}
			if (result != null) {
				RouteSearchServlet.sendJSON(result, request, response);
				return;
			}
		} catch (Exception e) {
			e.printStackTrace();
		}
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
