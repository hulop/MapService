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
package hulop.hokoukukan.bean;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

import org.apache.commons.codec.digest.DigestUtils;
import org.apache.wink.json4j.JSONArray;
import org.apache.wink.json4j.JSONException;
import org.apache.wink.json4j.JSONObject;

import hulop.hokoukukan.utils.DBAdapter;

public class AuthBean {

	public static final DBAdapter adapter = DatabaseBean.adapter;

	public AuthBean() {
		init();
	}

	public Object login(HttpServletRequest request, HttpServletResponse response) throws Exception {
		String user = request.getParameter("user");
		String password = request.getParameter("password");
		Object user_profile = user != null && password != null ? createProfile(user, password) : getProfile(request);

		if (user_profile != null) {
			HttpSession session = request.getSession(true);
			session.setAttribute("user_profile", user_profile);
			String redirect_url = request.getParameter("redirect_url");
			if (redirect_url != null && redirect_url.length() > 0) {
				response.sendRedirect(redirect_url);
				return null;
			}
			return user_profile;
		} else {
			HttpSession session = request.getSession(false);
			if (session != null) {
				session.invalidate();
			}
			return user != null ? "INVALID_CREDENTIAL" : "";
		}
	}

	public Object getProfile(HttpServletRequest request) throws Exception {
		HttpSession session = request.getSession(false);
		if (session != null) {
			if (request.getParameter("logout") == null) {
				return session.getAttribute("user_profile");
			}
			session.invalidate();
		}
		return null;
	}

	public Object createProfile(String user, String password) {
		JSONObject obj = findUser(user);
		try {
			if (obj != null && getHash(user, password).equals(obj.get("password"))) {
				try {
					JSONArray roles = obj.getJSONArray("roles");
					if (roles != null && roles.length() > 0) {
						JSONObject user_profile = new JSONObject();
						user_profile.put("user", user);
						user_profile.put("roles", roles);
						return user_profile;
					}
				} catch (JSONException e) {
					e.printStackTrace();
				}
			}
		} catch (JSONException e) {
			e.printStackTrace();
		}
		return null;
	}

	public boolean hasRole(HttpServletRequest request, String role) {
		HttpSession session = request.getSession(false);
		if (session != null) {
			try {
				JSONObject user_profile = (JSONObject) session.getAttribute("user_profile");
				JSONArray roles = user_profile == null ? null : user_profile.getJSONArray("roles");
				return roles != null && roles.indexOf(role) != -1;
			} catch (Exception e) {
				e.printStackTrace();
			}
		}
		return false;
	}

	public JSONArray listUsers() {
		return adapter.listUsers();
	}

	public void addUser(String user, String password, String[] roles) {
		JSONObject obj = new JSONObject();
		try {
			obj.put("_id", user);
			obj.put("password", getHash(user, password));
			obj.put("roles", roles);
			adapter.insertUser(obj.toString());
		} catch (JSONException e) {
			e.printStackTrace();
		}
	}

	public JSONObject findUser(String user) {
		return adapter.findUser(user);
	}

	public void updateUser(String user, String password, String[] roles) {
		JSONObject obj = findUser(user);
		if (obj != null) {
			try {
				if (password != null) {
					obj.put("password", getHash(user, password));
				}
				if (roles != null) {
					obj.put("roles", roles);
				}
				adapter.updateUser(obj.toString());
			} catch (JSONException e) {
				e.printStackTrace();
			}
		}
	}

	public void removeUser(JSONObject user) {
		adapter.removeUser(user);
	}

	public String getHash(String user, String password) {
		return DigestUtils.sha256Hex(DigestUtils.sha256Hex(user) + password);
	}

	private void init() {
		JSONArray users = listUsers();
		if (users.length() == 0) {
			addUser("hulopadmin", "please change password", new String[] { "admin"});
		}
	}

}
