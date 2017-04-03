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

import org.apache.wink.json4j.JSON;
import org.apache.wink.json4j.JSONArray;
import org.apache.wink.json4j.JSONObject;

import hulop.hokoukukan.bean.AuthBean;
import hulop.hokoukukan.bean.DatabaseBean;

/**
 * Servlet implementation class EditorServlet
 */
@WebServlet("/api/editor")
public class EditorServlet extends HttpServlet {
	private static final long serialVersionUID = 1L;
	private static final AuthBean authBean = new AuthBean();

	/**
	 * @see HttpServlet#HttpServlet()
	 */
	public EditorServlet() {
		super();
		// TODO Auto-generated constructor stub
	}

	/**
	 * @see HttpServlet#doGet(HttpServletRequest request, HttpServletResponse
	 *      response)
	 */
	protected void doGet(HttpServletRequest request, HttpServletResponse response)
			throws ServletException, IOException {
		String editor_api_key = request.getParameter("editor_api_key");
		if (editor_api_key == null || !editor_api_key.equals(System.getenv("EDITOR_API_KEY"))) {
			if (!authBean.hasRole(request, "editor")) {
				response.sendError(HttpServletResponse.SC_FORBIDDEN);
				return;
			}
		}
		String user = request.getParameter("user");
		String action = request.getParameter("action");
		if (user == null || action == null) {
			response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Invalid user or action");
			return;
		}
		try {
			Object result = null;
			if ("editdata".equals(action)) {
				String editor = request.getParameter("editor");
				String insert = request.getParameter("insert");
				String remove = request.getParameter("remove");
				String update = request.getParameter("update");
				System.out.println("editor: " + editor);
				result = new JSONObject();
				if (insert != null) {
					JSONArray array = (JSONArray) JSON.parse(insert);
					if (array.length() > 0) {
						((JSONObject) result).put("insert", DatabaseBean.insert(array));
					}

				}
				if (update != null) {
					JSONArray array = (JSONArray) JSON.parse(update);
					if (array.length() > 0) {
						((JSONObject) result).put("update", DatabaseBean.update(array));
					}

				}
				if (remove != null) {
					JSONArray array = (JSONArray) JSON.parse(remove);
					if (array.length() > 0) {
						DatabaseBean.remove(array);
					}

				}
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
