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

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.PrintWriter;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.servlet.ServletException;
import javax.servlet.annotation.MultipartConfig;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.Part;

import hulop.hokoukukan.bean.AuthBean;
import hulop.hokoukukan.bean.DatabaseBean;

/**
 * Servlet implementation class ImportServlet
 */
@WebServlet("/api/admin")
@MultipartConfig(fileSizeThreshold = 0, maxFileSize = -1L, maxRequestSize = -1L)
public class AdminServlet extends HttpServlet {
	private static final long serialVersionUID = 1L;
	private static final AuthBean authBean = new AuthBean();

	/**
	 * @see HttpServlet#HttpServlet()
	 */
	public AdminServlet() {
		super();
		// TODO Auto-generated constructor stub
	}

	/**
	 * @see HttpServlet#doGet(HttpServletRequest request, HttpServletResponse
	 *      response)
	 */
	protected void doGet(HttpServletRequest request, HttpServletResponse response)
			throws ServletException, IOException {
		if (!authBean.hasRole(request, "admin")) {
			response.sendError(HttpServletResponse.SC_FORBIDDEN);
			return;
		}
		request.setCharacterEncoding("UTF-8");
		String action = request.getParameter("action");
		if ("zip-attachments".equals(action)) {
			DatabaseBean.zipAttachments(response);
			return;
		}
		response.setContentType("text/plain; charset=UTF-8");
		if ("drop-database".equals(action)) {
			DatabaseBean.dropDatabase();
			response.getWriter().append("dropped database");
		} else if ("remove-file".equals(action)) {
			String fileName = request.getParameter("file");
			if (fileName == null || fileName.isEmpty()) {
				response.sendError(HttpServletResponse.SC_BAD_REQUEST);
				return;
			}
			DatabaseBean.removeFile(new File(fileName));
			response.getWriter().append("removed " + fileName);
		} else if ("list-files".equals(action)) {
			System.out.println(DatabaseBean.listFiles());
			PrintWriter writer = response.getWriter();
			for (String file : DatabaseBean.listFiles()) {
				writer.println(file);
			}
		} else if ("remove-attachment".equals(action)) {
			String fileName = request.getParameter("file");
			if (fileName == null || fileName.isEmpty()) {
				response.sendError(HttpServletResponse.SC_BAD_REQUEST);
				return;
			}
			DatabaseBean.deleteAttachment(fileName);
			response.getWriter().append("removed " + fileName);
		} else if ("list-attachments".equals(action)) {
			System.out.println(DatabaseBean.listAttachment());
			PrintWriter writer = response.getWriter();
			for (String file : DatabaseBean.listAttachment()) {
				writer.println(file);
			}
		}
	}

	/**
	 * @see HttpServlet#doPost(HttpServletRequest request, HttpServletResponse
	 *      response)
	 */
	protected void doPost(HttpServletRequest request, HttpServletResponse response)
			throws ServletException, IOException {
		final String dataType = request.getParameter("type");
		if (dataType == null) {
			return;
		}
		for (Part part : request.getParts()) {
			final String fileName = part.getSubmittedFileName();
			if (fileName != null) {
				System.out.println(fileName);
				InputStream is = null;
				try {
					final File tempFile = saveTempFile(is = part.getInputStream());
					if (tempFile != null && tempFile.exists()) {
						new Thread(new Runnable() {
							@Override
							public void run() {
								DatabaseBean.importMapData(tempFile, new File(fileName), dataType);
								tempFile.delete();
							}

						}).start();
					}
				} finally {
					if (is != null) {
						is.close();
					}
				}
				response.getWriter().append("importing " + fileName);
				break;
			}
		}
	}

	private static File saveTempFile(InputStream is) {
		File tempFile = null;
		try {
			tempFile = File.createTempFile("tempfile", ".tmp");
			System.out.println(tempFile);
			OutputStream os = null;
			try {
				os = new FileOutputStream(tempFile);
				byte data[] = new byte[4096];
				int len = 0;
				while ((len = is.read(data, 0, data.length)) > 0) {
					os.write(data, 0, len);
				}
				os.flush();
				return tempFile;
			} finally {
				if (os != null) {
					os.close();
				}
			}
		} catch (IOException e) {
			e.printStackTrace();
		}
		if (tempFile.exists()) {
			tempFile.delete();
		}
		return null;
	}

}
