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

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.zip.GZIPOutputStream;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.ServletOutputStream;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.WriteListener;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpServletResponseWrapper;

public class GZIPFilter {

	private static GZIPFilter instance = null;
	private static Pattern GZIP_PATTERN = Pattern.compile("\\.(js|css)$");
	private Map<String, Map<String, Object>> cacheMap = new HashMap<String, Map<String, Object>>();

	public static GZIPFilter getInstance() {
		if (instance == null) {
			instance = new GZIPFilter();
		}
		return instance;
	}

	public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
			throws IOException, ServletException {
		doFilter((HttpServletRequest) request, (HttpServletResponse) response, chain);
	}

	public void clear() {
		cacheMap.clear();
	}

	private boolean useGZIP(HttpServletRequest request) {
		String url = request.getRequestURI();
		String accepts = request.getHeader("accept-encoding");
		boolean useGZIP = accepts != null && accepts.indexOf("gzip") != -1
				&& GZIP_PATTERN.matcher(url.toLowerCase()).find() && "GET".equals(request.getMethod());
		return useGZIP;
	}

	private void doFilter(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws IOException, ServletException {
		String url = request.getRequestURI();
		byte[] b = null;
		Map<String, Object> map = cacheMap.get(url);
		if (map != null) {
			// System.out.println("Use Cache: " + url);
			for (String name : map.keySet()) {
				Object value = map.get(name);
				if (value instanceof byte[]) {
					b = (byte[]) value;
				} else {
					response.setHeader(name, value.toString());
				}
			}
		} else {
			if (!useGZIP(request)) {
				// System.out.println("No GZIP: " + url);
				chain.doFilter(request, response);
				return;
			}
			// System.out.println("No Cache: " + url);
			MemResponse res = new MemResponse(response);
			chain.doFilter(request, res);
			b = res.toByteArray();
			if (res.getStatus() == 200 && b != null && b.length > 860) {
				Map<String, Object> cache = new HashMap<String, Object>();
				for (String name : res.getHeaderNames()) {
					cache.put(name, res.getHeader(name));
				}
				System.out.println(cache);
				if ("gzip".equals(res.getHeader("Content-Encoding"))) {
					cache.put("$data", b);
				} else {
					cache.put("Content-Encoding", "gzip");
					ByteArrayOutputStream os = new ByteArrayOutputStream();
					GZIPOutputStream gzos = new GZIPOutputStream(os);
					gzos.write(b);
					gzos.close();
					cache.put("$data", os.toByteArray());
				}
				cacheMap.put(url, cache);
			}
		}
		if (b != null) {
			response.getOutputStream().write(b);
		}
	}

	class MemResponse extends HttpServletResponseWrapper {

		private MemStream os;
		private PrintWriter writer;

		public MemResponse(HttpServletResponse response) {
			super(response);
		}

		public byte[] toByteArray() {
			return os != null ? os.toByteArray() : null;
		}

		@Override
		public ServletOutputStream getOutputStream() throws IOException {
			if (writer != null) {
				throw new IllegalStateException("PrintWriter obtained already - cannot get OutputStream");
			}
			if (os == null) {
				os = new MemStream();
			}
			return os;
		}

		@Override
		public PrintWriter getWriter() throws IOException {
			if (writer == null) {
				if (os != null) {
					throw new IllegalStateException("OutputStream obtained already - cannot get PrintWriter");
				}
				os = new MemStream();
				writer = new PrintWriter(new OutputStreamWriter(os, getResponse().getCharacterEncoding()));
			}
			return writer;
		}
	}

	class MemStream extends ServletOutputStream {

		private ByteArrayOutputStream os = new ByteArrayOutputStream();

		public byte[] toByteArray() {
			return os.toByteArray();
		}

		@Override
		public boolean isReady() {
			return true;
		}

		@Override
		public void setWriteListener(WriteListener arg0) {
		}

		@Override
		public void write(int b) throws IOException {
			os.write(b);
		}

		@Override
		public void write(byte[] b) throws IOException {
			os.write(b);
		}

		@Override
		public void write(byte[] b, int off, int len) throws IOException {
			os.write(b, off, len);
		}
	}
}
