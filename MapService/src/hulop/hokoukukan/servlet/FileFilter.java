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
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URLConnection;
import java.util.Date;
import java.util.List;
import java.util.regex.Pattern;
import java.util.zip.GZIPOutputStream;

import javax.servlet.DispatcherType;
import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.annotation.WebFilter;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import hulop.hokoukukan.bean.DatabaseBean;

/**
 * Servlet Filter implementation class FileFilter
 */
@WebFilter(dispatcherTypes = { DispatcherType.REQUEST }, urlPatterns = { "/*" })
public class FileFilter implements Filter {

	private static int contextLength;
	private static List<String> attachmentList = null;
	private static long attachmentDate;

	/**
	 * Default constructor.
	 */
	public FileFilter() {
	}

	/**
	 * @see Filter#destroy()
	 */
	public void destroy() {
	}

	private static final boolean NO_GZIPFilter = "false".equals(System.getenv("GZIPFilter"));
	/**
	 * @see Filter#doFilter(ServletRequest, ServletResponse, FilterChain)
	 */
	public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
			throws IOException, ServletException {
		if (processFile((HttpServletRequest) request, (HttpServletResponse) response)) {
			return;
		}
		if (NO_GZIPFilter) {
			chain.doFilter(request, response);
		} else {
			GZIPFilter.getInstance().doFilter(request, response, chain);
		}
	}

	/**
	 * @see Filter#init(FilterConfig)
	 */
	public void init(FilterConfig fConfig) throws ServletException {
		contextLength = fConfig.getServletContext().getContextPath().length();
		onAttachmentChanged();
	}

	public static void onAttachmentChanged() {
		attachmentList = null;
		attachmentDate = new Date().getTime() / 1000 * 1000;
	}

	synchronized private boolean hasAttachment(String url) {
		if (attachmentList == null) {
			attachmentList = DatabaseBean.listAttachment();
			System.out.println(attachmentList);
		}
		if (attachmentList != null) {
			return attachmentList.contains(url);
		}
		return true;
	}

	private static final Pattern NOGZIP_PATTERN = Pattern.compile("\\.(png|jpg|jpeg|gif|gz|zip)$");

	private boolean processFile(HttpServletRequest request, HttpServletResponse response) throws IOException {
		String url = request.getRequestURI();
		url = url.substring(Math.min(url.length(), contextLength + 1));
		// System.out.println(url);
		String acceptedEncodings = request.getHeader("accept-encoding");
		boolean gzip = acceptedEncodings != null && acceptedEncodings.indexOf("gzip") != -1;
		if (gzip && NOGZIP_PATTERN.matcher(url.toLowerCase()).find()) {
			gzip = false;
		}
		String gzipExt = "";
		if (!hasAttachment(url)) {
			gzipExt = ".gz";
			if (!gzip || !hasAttachment(url + gzipExt)) {
				return false;
			}
			gzip = false;
			response.setHeader("Content-Encoding", "gzip");
		}
		long ifModified = request.getDateHeader("If-Modified-Since");
		if (ifModified != -1 && attachmentDate <= ifModified) {
			response.setStatus(HttpServletResponse.SC_NOT_MODIFIED);
			return true;
		}
		InputStream is = DatabaseBean.getAttachment(url + gzipExt);
		if (is != null) {
			String contentType = URLConnection.guessContentTypeFromName(url);
			if (contentType == null) {
				if (url.endsWith(".js")) {
					contentType = "application/x-javascript";
				} else if (url.endsWith(".json")) {
					contentType = "application/json";
				} else if (url.endsWith(".svg")) {
					contentType = "image/svg+xml";
				}
			}
			System.out.println(url + " / " + contentType);
			response.setContentType(contentType);
			response.setDateHeader("Last-Modified", attachmentDate);
			OutputStream os = response.getOutputStream();
			GZIPOutputStream gzos = null;
			try {
				byte data[] = new byte[1024 * 1024];
				int len = 0;
				while ((len = is.read(data, 0, data.length)) > 0) {
					if (gzip && gzos == null && data.length >= 860) {
						response.setHeader("Content-Encoding", "gzip");
						gzos = new GZIPOutputStream(os);
					}
					(gzos != null ? gzos : os).write(data, 0, len);
				}
				if (gzos != null) {
					gzos.finish();
					gzos.close();
				} else {
					os.flush();
				}
			} catch (Exception e) {
				e.printStackTrace();
				response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
			} finally {
				is.close();
				os.close();
			}
			return true;
		}
		return false;
	}

}
