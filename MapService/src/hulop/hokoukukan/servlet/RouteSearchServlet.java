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
import java.io.OutputStream;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Map.Entry;
import java.util.zip.GZIPOutputStream;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.wink.json4j.JSON;
import org.apache.wink.json4j.JSONArray;
import org.apache.wink.json4j.JSONObject;

import hulop.hokoukukan.bean.DatabaseBean;
import hulop.hokoukukan.bean.RouteSearchBean;

/**
 * Servlet implementation class RouteSearchServlet
 */
@WebServlet("/routesearch")
public class RouteSearchServlet extends HttpServlet {
	private static final long serialVersionUID = 1L;

	private static final long CACHE_EXPIRE = 30 * 60 * 1000;

	private final Map<String, JSONObject> startMap = new LinkedHashMap<String, JSONObject>(16, 0.75f, true) {
		private static final long serialVersionUID = 1L;
		private final int maxSize = getEnvInt("MAX_START_PARAMS", 1000);

		@Override
		protected boolean removeEldestEntry(Entry<String, JSONObject> eldest) {
			return size() > maxSize;
		}
	};

	private final Map<String, RouteSearchBean> routeBeanMap = new LinkedHashMap<String, RouteSearchBean>(16, 0.75f,
			true) {
		private static final long serialVersionUID = 1L;
		private final int maxSize = getEnvInt("MAX_ROUTE_BEANS", 100);

		@Override
		protected boolean removeEldestEntry(Entry<String, RouteSearchBean> eldest) {
			return size() > maxSize;
		}
	};

	/**
	 * @see HttpServlet#doGet(HttpServletRequest request, HttpServletResponse
	 *      response)
	 */
	protected void doGet(HttpServletRequest request, HttpServletResponse response)
			throws ServletException, IOException {
		String user = request.getParameter("user");
		String action = request.getParameter("action");
		if (user == null || action == null) {
			response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Invalid user or action");
			return;
		}

		try {
			Object result = null;
			if ("toilets".equals(action)) {
				double lat = Double.parseDouble(request.getParameter("lat"));
				double lng = Double.parseDouble(request.getParameter("lng"));
				double dist = Double.parseDouble(request.getParameter("dist"));
				result = DatabaseBean.getToilets(new double[] { lng, lat }, dist);
				if (result != null) {
					sendJSON(result, request, response);
					return;
				}
			}

			RouteSearchBean bean = null;
			JSONObject params = null;
			boolean reStart = false;
			String lang = request.getParameter("lang");
			if (lang == null) {
				System.err.println("No lang parameter on routesearch");
				lang = "en";
			}
			String beanUser = user + ":" + lang;
			synchronized (routeBeanMap) {
				for (Iterator<Map.Entry<String, RouteSearchBean>> it = routeBeanMap.entrySet().iterator(); it
						.hasNext();) {
					Map.Entry<String, RouteSearchBean> entry = it.next();
					if (entry.getValue().getLastInit() < System.currentTimeMillis() - CACHE_EXPIRE) {
						it.remove();
						System.out.println(entry.getKey() + " expired");
					}
				}
				bean = routeBeanMap.get(beanUser);
				params = startMap.get(user);
				if ("start".equals(action)) {
					params = new JSONObject();
					params.put("lat", Double.parseDouble(request.getParameter("lat")));
					params.put("lng", Double.parseDouble(request.getParameter("lng")));
					params.put("dist", Double.parseDouble(request.getParameter("dist")));
					params.put("cache", !"false".equals(request.getParameter("cache")));
					startMap.put(user, params);
					reStart = true;
				}
				if (bean == null && params != null) {
					routeBeanMap.put(beanUser, bean = new RouteSearchBean());
					reStart = true;
					System.out.println(routeBeanMap.size() + " users");
				}
			}
			if (bean == null) {
				response.sendError(HttpServletResponse.SC_REQUEST_TIMEOUT, "Please restart session");
				return;
			}

			if (reStart) {
				bean.init(new double[] { params.getDouble("lng"), params.getDouble("lat") }, params.getDouble("dist"),
						lang, params.getBoolean("cache"));
				if (!"start".equals(action)) {
					System.out.println("Restarting session=" + user + ", params=" + params);
				}
			}
			if ("start".equals(action)) {
				result = new JSONObject().put("landmarks", bean.getLandmarks());
			} else if ("search".equals(action)) {
				String from = request.getParameter("from");
				String to = request.getParameter("to");
				JSONObject preferences = (JSONObject) JSON.parse(request.getParameter("preferences"));
				result = bean.getDirection(from, to, preferences);
				JSONObject route = new JSONObject();
				route.put("from", from);
				route.put("to", to);
				route.put("preferences", preferences);
				route.put("lang", lang);
				JSONObject data = new JSONObject();
				data.put("event", "route_search");
				data.put("client", user);
				data.put("timestamp", System.currentTimeMillis());
				data.put("route", route);
				JSONArray array = new JSONArray();
				array.add(data);
				System.out.println("route_search user=" + user);
				DatabaseBean.insertLogs(array);
			} else if ("features".equals(action)) {
				result = bean.getFeatures();
			} else if ("nodemap".equals(action)) {
				result = bean.getNodeMap();
			}
			if (result != null) {
				sendJSON(result, request, response);
			}
		} catch (Exception e) {
			e.printStackTrace();
			response.sendError(HttpServletResponse.SC_BAD_REQUEST, e.getMessage());
		}
	}

	/**
	 * @see HttpServlet#doPost(HttpServletRequest request, HttpServletResponse
	 *      response)
	 */
	protected void doPost(HttpServletRequest request, HttpServletResponse response)
			throws ServletException, IOException {
		doGet(request, response);
	}

	public static void sendJSON(Object obj, HttpServletRequest request, HttpServletResponse response)
			throws IOException {
		boolean gzip = false;
		if (request != null) {
			String acceptedEncodings = request.getHeader("accept-encoding");
			gzip = acceptedEncodings != null && acceptedEncodings.indexOf("gzip") != -1;
		}
		response.setCharacterEncoding("UTF-8");
		response.setContentType("application/json");
		response.addHeader("Access-Control-Allow-Origin", "*");
		OutputStream os = null;
		try {
			String s;
			if (obj instanceof JSONObject) {
				s = ((JSONObject) obj).toString();
			} else if (obj instanceof JSONArray) {
				s = ((JSONArray) obj).toString();
			} else {
				s = obj.toString();
			}
			// (os = response.getOutputStream()).write(s.getBytes("UTF-8"));
			byte[] data = s.getBytes("UTF-8");
			os = response.getOutputStream();
			if (gzip && data.length >= 860) {
				response.setHeader("Content-Encoding", "gzip");
				GZIPOutputStream gzos = new GZIPOutputStream(os);
				gzos.write(data);
				gzos.finish();
				gzos.close();
			} else {
				os.write(data);
			}
		} catch (Exception e) {
			e.printStackTrace();
		} finally {
			if (os != null) {
				os.close();
			}
		}
	}

	private static int getEnvInt(String key, int defaultValue) {
		try {
			String size = System.getenv(key);
			if (size != null) {
				System.out.println(key + "=" + size);
				return Integer.parseInt(size);
			}
		} catch (Exception e) {
			e.printStackTrace();
		}
		return defaultValue;
	}
}
