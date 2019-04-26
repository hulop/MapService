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
/*
 *  Please update WebContent/WEB-INF/web.xml like the following example
 *

<?xml version="1.0" encoding="UTF-8"?>
<web-app xmlns="http://xmlns.jcp.org/xml/ns/javaee"
	xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
	xsi:schemaLocation="http://xmlns.jcp.org/xml/ns/javaee http://xmlns.jcp.org/xml/ns/javaee/web-app_3_1.xsd"
	version="3.1">
	<!-- start of example -->
	<filter>
		<filter-name>UserAgentFilter</filter-name>
		<filter-class>hulop.hokoukukan.options.UserAgentFilter</filter-class>
		<init-param>
			<param-name>(iPod|iPhone|iPad)</param-name>
			<param-value>/ios</param-value>
		</init-param>
		<init-param>
			<param-name>(Android)</param-name>
			<param-value>/android</param-value>
		</init-param>
	</filter>
	<filter-mapping>
		<filter-name>UserAgentFilter</filter-name>
		<url-pattern>/*</url-pattern>
		<dispatcher>REQUEST</dispatcher>
	</filter-mapping>
	<!-- end of example -->
</web-app>

*/
package hulop.hokoukukan.options;

import java.io.IOException;
import java.net.URL;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.regex.Pattern;

import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;

import hulop.hokoukukan.servlet.FileFilter;

/**
 * Servlet Filter implementation class UserAgentFilter
 */
public class UserAgentFilter implements Filter {

	private ServletContext context;
	private int contextLength;
	private Map<Pattern, String> rootMap = new HashMap<>();

	/**
	 * @see Filter#init(FilterConfig)
	 */
	public void init(FilterConfig fConfig) throws ServletException {
		context = fConfig.getServletContext();
		contextLength = context.getContextPath().length();
		for (Enumeration<String> en = fConfig.getInitParameterNames(); en.hasMoreElements();) {
			String name = en.nextElement();
			String value = fConfig.getInitParameter(name).toString();
			try {
				rootMap.put(Pattern.compile(name), value);
			} catch (Exception e) {
				e.printStackTrace();
			}
		}
		System.out.println("UserAgentFilter: rootMap=" + rootMap);
	}

	/**
	 * @see Filter#doFilter(ServletRequest, ServletResponse, FilterChain)
	 */
	public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
			throws IOException, ServletException {
		String path = ((HttpServletRequest) request).getRequestURI().substring(contextLength);
		String altPath = alternatePath(request, path);
		if (altPath != null) {
			request.getRequestDispatcher(altPath).forward(request, response);
		} else {
			chain.doFilter(request, response);
		}
	}

	private String alternatePath(ServletRequest request, String path) throws IOException {
		String userAgent = ((HttpServletRequest) request).getHeader("User-Agent");
		if (userAgent != null) {
			for (Iterator<Pattern> it = rootMap.keySet().iterator(); it.hasNext();) {
				Pattern pat = it.next();
				if (pat.matcher(userAgent).find()) {
					String altPath = rootMap.get(pat) + path;
					if (FileFilter.hasAttachment(altPath.substring(1))) {
						System.out.println("alternatePath: Attachment" + altPath);
						return altPath;
					}
					URL res = context.getResource(altPath);
					if (res != null && !res.getFile().endsWith("/")) {
						System.out.println("alternatePath: WebContent" + altPath);
						return altPath;
					}
				}
			}
		} else {
			System.out.println("alternatePath: No User-Agent: " + path);
		}
		return null;
	}

	/**
	 * @see Filter#destroy()
	 */
	public void destroy() {
	}
}
