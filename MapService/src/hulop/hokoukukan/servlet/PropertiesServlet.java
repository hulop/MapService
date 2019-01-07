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
import java.util.Iterator;

import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.wink.json4j.JSONArray;
import org.apache.wink.json4j.JSONException;
import org.apache.wink.json4j.JSONObject;

import hulop.hokoukukan.bean.DatabaseBean;

/**
 * Servlet implementation class PropertiesServlet
 */
@WebServlet("/api/properties")
public class PropertiesServlet extends HttpServlet {
	private static final long serialVersionUID = 1L;
	private JSONArray api_keys = new JSONArray();

	@Override
	public void init(ServletConfig config) throws ServletException {
		super.init(config);
		String env = System.getenv("API_KEY_PROPERTIES");
		if (env != null) {
			try {
				api_keys = new JSONArray(env);
			} catch (JSONException e) {
				System.err.println(env);
			}
		}
	}

	/**
	 * @see HttpServlet#doGet(HttpServletRequest request, HttpServletResponse
	 *      response)
	 */
	protected void doGet(HttpServletRequest request, HttpServletResponse response)
			throws ServletException, IOException {
		JSONObject object = getObject(request, response);
		if (object != null) {
			try {
				JSONObject properties = object.getJSONObject("properties");
				RouteSearchServlet.sendJSON(properties, request, response);
			} catch (Exception e) {
				response.sendError(HttpServletResponse.SC_BAD_REQUEST);
			}
		}
	}

	/**
	 * @see HttpServlet#doPost(HttpServletRequest request, HttpServletResponse
	 *      response)
	 */
	protected void doPost(HttpServletRequest request, HttpServletResponse response)
			throws ServletException, IOException {
		JSONObject object = getObject(request, response);
		if (object != null) {
			try {
				JSONObject update = new JSONObject(request.getInputStream());
				System.out.println(update.toString(4));
				JSONObject properties = object.getJSONObject("properties");
				for (Iterator<String> it = update.keys(); it.hasNext();) {
					String key = it.next();
					properties.put(key, update.get(key));
				}
				DatabaseBean.adapter.setOBJ(object);
			} catch (Exception e) {
				response.sendError(HttpServletResponse.SC_BAD_REQUEST);
			}
		}
	}

	private JSONObject getObject(HttpServletRequest request, HttpServletResponse response) throws IOException {
		String key = request.getParameter("api_key");
		if (key == null || api_keys.indexOf(key) == -1) {
			response.sendError(HttpServletResponse.SC_FORBIDDEN);
			return null;
		}
		JSONObject object = null;
		try {
			object = DatabaseBean.adapter.find(request.getParameter("id"));
		} catch (Exception e) {
		}
		if (object == null) {
			response.sendError(HttpServletResponse.SC_NOT_FOUND);
		}
		return object;
	}
}
