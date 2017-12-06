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

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.Charset;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

import javax.servlet.http.HttpServletResponse;

import org.apache.wink.json4j.JSON;
import org.apache.wink.json4j.JSONArray;
import org.apache.wink.json4j.JSONException;
import org.apache.wink.json4j.JSONObject;

import hulop.hokoukukan.servlet.FileFilter;
import hulop.hokoukukan.utils.CloudUtils;
import hulop.hokoukukan.utils.CloudantAdapter;
import hulop.hokoukukan.utils.DBAdapter;
import hulop.hokoukukan.utils.GmlUtils;
import hulop.hokoukukan.utils.MongoAdapter;
import hulop.hokoukukan.utils.NavCogUtils;

public class DatabaseBean {
	public static final DBAdapter adapter = getDBAdapter();

	private static DBAdapter getDBAdapter() {
		String url = CloudUtils.getCredentialURL(new String[] { "cloudantNoSQLDB" }, null);
		if (url != null) {
			System.out.println(url);
			try {
				return new CloudantAdapter(url);
			} catch (Exception e) {
				e.printStackTrace();
			}
		}
		url = CloudUtils.getCredential(new String[] { "compose-for-mongodb" }, "uri", null);
		if (url != null) {
			String cert = CloudUtils.getCredential(new String[] { "compose-for-mongodb" }, "ca_certificate_base64",
					null);
			if (cert != null) {
				String dbName = System.getenv("HULOP_NAVI_DB");
				if (dbName == null) {
					dbName = "navi_db";
				}
				System.out.println(url);
				System.out.println(dbName);
				System.out.println(cert);
				try {
					return new MongoAdapter(url, dbName, cert);
				} catch (Exception e) {
					e.printStackTrace();
				}
			}
		}
		url = CloudUtils.getCredentialURL(new String[] { "mongodb", "mongodb-2.4" },
				"mongodb://localhost:27017/navi_db");
		if (url != null) {
			System.out.println(url);
			try {
				return new MongoAdapter(url);
			} catch (Exception e) {
				e.printStackTrace();
			}
		}
		throw new RuntimeException("No DB adapter");
	}

	public static void dropDatabase() {
		adapter.dropDB();
	}

	private static void importGML(InputStream is, File file) {
		adapter.prepare(file);
		try {
			GmlUtils.toJSON(is, file, new GmlUtils.JSONListener() {
				@Override
				public void onJSON(Object json) {
					preInsert(json);
					adapter.insert(json.toString());
				}
			});
			adapter.flush();
		} catch (Exception e) {
			e.printStackTrace();
		}
		System.out.println(" " + adapter.getInsertCount() + " records");
	}

	private static void importNavcogJSON(InputStream is, File file) {
		adapter.prepare(file);
		try {
			new NavCogUtils((JSONObject) JSON.parse(is), file, new GmlUtils.JSONListener() {
				@Override
				public void onJSON(Object json) {
					preInsert(json);
					adapter.insert(json.toString());
				}
			}).convert();
			adapter.flush();
		} catch (Exception e) {
			e.printStackTrace();
		}
		System.out.println(" " + adapter.getInsertCount() + " records");
	}

	private static String[] ID_KEYS = new String[] { "ノードID", "リンクID", "施設ID", "出入口ID" };

	private static void preInsert(Object json) {
		if (json instanceof JSONObject) {
			JSONObject obj = (JSONObject) json;
			if (obj.has("properties")) {
				try {
					JSONObject p = obj.getJSONObject("properties");
					for (String key : ID_KEYS) {
						if (p.has(key)) {
							((JSONObject) json).put("_id", p.getString(key));
							break;
						}
					}
				} catch (JSONException e) {
					e.printStackTrace();
				}
			}
		}
	}

	public static void importMapData(File zipFile, File file, String dataType) {
		final String dbDir = file.getName();
		InputStream is = null;
		try {
			is = new FileInputStream(zipFile);
			if ("gml.zip".equals(dataType)) {
				ZipInputStream zis = new ZipInputStream(is, Charset.forName(dbDir.contains("utf8") ? "UTF8" : "MS932"));
				for (ZipEntry entry = zis.getNextEntry(); entry != null; entry = zis.getNextEntry()) {
					String id = dbDir + "/" + entry.getName();
					if (!entry.isDirectory() && id.toLowerCase().endsWith(".gml")) {
						System.out.println("File: " + id);
						importGML(new BufferedInputStream(zis) {
							@Override
							public void close() throws IOException {
							}
						}, new File(id));
					}
				}
				zis.close();
			} else if ("navcog.json".equals(dataType)) {
				importNavcogJSON(is, file);
			} else if ("attachment.zip".equals(dataType)) {
				ZipInputStream zis = new ZipInputStream(is);
				for (ZipEntry entry = zis.getNextEntry(); entry != null; entry = zis.getNextEntry()) {
					String id = entry.getName();
					if (!entry.isDirectory()) {
						System.out.println("File: " + id);
						adapter.saveAttachment(id, new BufferedInputStream(zis) {
							@Override
							public void close() throws IOException {
							}
						});
					}
				}
				zis.close();
				FileFilter.onAttachmentChanged();
			}
		} catch (Exception e) {
			e.printStackTrace();
		} finally {
			if (is != null) {
				try {
					is.close();
				} catch (IOException e) {
					e.printStackTrace();
				}
			}
		}
	}

	public static List<String> listFiles() {
		return adapter.listFiles();
	}

	public static List<String> listAttachment() {
		return adapter.listAttachment();
	}

	public static InputStream getAttachment(String path) {
		return adapter.getAttachment(path);
	}

	public static String readAttachment(String path) {
		InputStream is = getAttachment(path);
		if (is != null) {
			Reader reader = null;
			try {
				reader = new InputStreamReader(is);
				int length;
				char cbuf[] = new char[16 * 1024];
				StringBuilder sb = new StringBuilder();
				while ((length = reader.read(cbuf, 0, cbuf.length)) != -1) {
					sb.append(cbuf, 0, length);
				}
				return sb.toString();
			} catch (Exception e) {
				e.printStackTrace();
			} finally {
				if (reader != null) {
					try {
						reader.close();
					} catch (IOException e) {
						e.printStackTrace();
					}
				}
			}
		}
		return "";
	}

	public static void removeFile(File file) {
		adapter.prepare(file);
	}

	public static void deleteAttachment(String path) {
		if (path.endsWith("*")) {
			path = path.replace("*", "");
			for (String p : listAttachment()) {
				if (p.startsWith(path)) {
					adapter.deleteAttachment(p);
				}
			}
		} else {
			adapter.deleteAttachment(path);
		}
		FileFilter.onAttachmentChanged();
	}

	public static JSONArray insert(JSONArray array) {
		adapter.prepare(null);
		try {
			for (int i = 0; i < array.length(); i++) {
				adapter.insert(array.getString(i));
			}
			adapter.flush();
		} catch (Exception e) {
			e.printStackTrace();
		}
		return adapter.getResult();
	}

	public static JSONArray update(JSONArray array) {
		adapter.prepare(null);
		try {
			for (int i = 0; i < array.length(); i++) {
				adapter.update(array.getString(i));
			}
			adapter.flush();
		} catch (Exception e) {
			e.printStackTrace();
		}
		return adapter.getResult();
	}

	public static void remove(JSONArray array) {
		adapter.remove(array);
	}

	public static Object getToilets(double[] point, double distance) throws JSONException {
		JSONArray features = new JSONArray();
		List<String> categories = new ArrayList<String>();
		categories.add("公共用トイレの情報");
		categories.add("出入口情報");
		adapter.getGeometry(point, distance, null, features, categories);
		JSONObject siteMap = new JSONObject();
		for (Object feature : features) {
			JSONObject properties = ((JSONObject) feature).getJSONObject("properties");
			if (properties.has("施設ID") && properties.has("多目的トイレ")) {
				switch (properties.getString("多目的トイレ")) {
				case "1":
				case "2":
					siteMap.put(properties.getString("施設ID"), feature);
					break;
				}
			}
		}
		JSONArray exitList = new JSONArray();
		JSONObject nodeMap = new JSONObject();
		for (Object feature : features) {
			JSONObject properties = ((JSONObject) feature).getJSONObject("properties");
			if (properties.has("出入口ID") && properties.has("対応施設ID") && properties.has("対応ノードID")) {
				String siteId = properties.getString("対応施設ID");
				String nodeId = properties.getString("対応ノードID");
				if (siteMap.has(siteId)) {
					if (!nodeMap.has(nodeId)) {
						JSONObject node = adapter.find(nodeId);
						if (node != null) {
							nodeMap.put(nodeId, node);
						}
					}
					exitList.add(feature);
				}
			}
		}
		JSONObject result = new JSONObject();
		result.put("exitList", exitList);
		result.put("nodeMap", nodeMap);
		result.put("siteMap", siteMap);
		return result;
	}

	private static boolean flushWaiting = false;
	private static Runnable flushWait = new Runnable() {
		@Override
		public void run() {
			try {
				Thread.sleep(1000);
				adapter.flush();
			} catch (InterruptedException e) {
				e.printStackTrace();
			} finally {
				flushWaiting = false;
			}
		}
	};

	public static void insertLogs(JSONArray array) {
		try {
			for (int i = 0; i < array.length(); i++) {
				adapter.insertLog(array.getString(i));
			}
			if (!flushWaiting) {
				flushWaiting = true;
				new Thread(flushWait).start();
			}
		} catch (Exception e) {
			e.printStackTrace();
		}
	}

	public static JSONArray getLogStats() {
		return adapter.getLogStats();
	}

	public static JSONArray getLogs(String clientId, String start, String end, String skip, String limit,
			String event) {
		JSONArray logs = adapter.getLogs(clientId, start, end, skip, limit, event);
		for (Object log : logs) {
			if (log instanceof JSONObject) {
				try {
					((JSONObject) log).remove("_id");
					((JSONObject) log).remove("_rev");

				} catch (Exception e) {
				}
			}
		}
		return logs;
	}

	public static JSONObject getEntry(String id) {
		return adapter.getEntry(id);
	}

	public static void setEntry(JSONObject entry) {
		adapter.setEntry(entry);
	}

	public static JSONArray getAgreements() {
		return adapter.getAgreements();
	}

	public static JSONArray getAnswers(String deviceId) {
		return adapter.getAnswers(deviceId);
	}

	public static void zipAttachments(HttpServletResponse response) throws IOException {
		response.setHeader("Content-Disposition", "attachment; filename=\"attachments.zip\"");
		ZipOutputStream zos = new ZipOutputStream(response.getOutputStream());
		try {
			byte data[] = new byte[1024 * 1024];
			int len;
			for (String path : listAttachment()) {
				InputStream is = getAttachment(path);
				if (is != null) {
					zos.putNextEntry(new ZipEntry(path));
					while ((len = is.read(data, 0, data.length)) > 0) {
						zos.write(data, 0, len);
					}
					zos.closeEntry();
					is.close();
				}
			}
		} finally {
			zos.close();
		}
	}

	public static void main(String[] args) {
		if (args.length > 0) {
			String dir = args[0];
			if (dir.endsWith(".zip")) {
				File zipFile = new File(dir);
				if (!zipFile.exists()) {
					System.err.println(dir + " does not exists");
					return;
				}
				importMapData(zipFile, zipFile, "gml.zip");
			}
		}
	}
}
