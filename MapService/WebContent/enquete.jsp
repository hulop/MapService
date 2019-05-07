<%@page import="hulop.hokoukukan.bean.DatabaseBean"%>
<%@page import="java.util.Enumeration"%>
<%@page import="org.apache.wink.json4j.JSONObject"%>
<jsp:useBean id="agreeBean" scope="request"
	class="hulop.hokoukukan.bean.AgreementBean" />
<%@ page language="java" contentType="text/html; charset=UTF-8"
	pageEncoding="UTF-8"%>
<%
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
	request.setCharacterEncoding("UTF-8");
	String id = request.getParameter("id");
	String save = request.getParameter("save");
	if (id == null) {
		response.sendRedirect("finish_agreement.jsp");
		return;
	} else if (save != null) {
		if ("true".equals(save)) {
			JSONObject obj = new JSONObject();
			for (Enumeration<String> en = request.getParameterNames(); en.hasMoreElements();) {
				String key = en.nextElement();
				if (key.matches("^(id|save)$")) {
					continue;
				}
				String answer = request.getParameter(key);
				if (answer != null && answer.length() > 0) {
					obj.put(key, answer);
				}
			}
			obj.put("type", "user");
			agreeBean.setAnswers(id, obj, request);
		}
		response.sendRedirect("finish_agreement.jsp?id=" + id);
		return;
	}
%>
<%=DatabaseBean.readAttachment("WEB-INF/enquete.shtml").replaceAll("\\$id\\$", id)%>