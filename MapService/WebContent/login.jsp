<jsp:useBean id="authBean" scope="request"
	class="hulop.hokoukukan.bean.AuthBean" />
<%@ page language="java" contentType="text/html; charset=UTF-8"
	pageEncoding="UTF-8"%>
<%
	Object profile = authBean.login(request, response);
	if (profile == null) {
		return;
	}
	String redirect_url = request.getParameter("redirect_url");
	if (redirect_url == null) {
		redirect_url = "";
	}
%>
<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
<meta name="copyright" content="Copyright (c) IBM Corporation and others 2014, 2017. This page is made available under MIT license.">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<title></title>
</head>
<body>

	<form action="login.jsp" method="post" autocomplete="off">
		<input type="hidden" name="redirect_url" value="<%=redirect_url%>">
		<div>
			<p>
				<label for="user"> User ID: </label> <br /> <input type="text"
					id="user" name="user" size="30" value="" />
			</p>
			<p>
				<label for="password"> Password: </label> <br /> <input
					type="password" id="password" name="password" size="30" value="" />
			</p>
			<p>
				<input value="Log in" type="submit" />
			</p>
			<p>
				<%=profile%>
			</p>
		</div>
	</form>

</body>
</html>