/*******************************************************************************
 * Copyright (c) 2014, 2023  IBM Corporation, Carnegie Mellon University and others
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
package hulop.directory;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.io.OutputStream;
import java.io.Writer;
import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Map.Entry;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.GZIPOutputStream;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.http.client.fluent.Form;
import org.apache.http.client.fluent.Request;
import org.apache.wink.json4j.JSONArray;
import org.apache.wink.json4j.JSONObject;

public class Utils {

	private static Map<String, Directory> directoryCache = new LinkedHashMap<String, Directory>(16, 0.75f, true) {
		private static final long serialVersionUID = 1L;
		private final int maxSize = getEnvInt("MAX_DIRECTORY_CACHE", 1000);

		@Override
		protected boolean removeEldestEntry(Entry<String, Directory> eldest) {
			return size() > maxSize;
		}
	};

	public static JSONObject load(String path) throws Exception {
		// return new JSONObject(new InputStreamReader(Utils.class.getResourceAsStream(path), "UTF-8"));
		return ConfigLoader.load(path);
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

	public static String kana2hira(String str) {
		StringBuilder sb = new StringBuilder(str);
		for (int i = 0; i < sb.length(); i++) {
			char c = sb.charAt(i);
			if (c >= '\u30a1' && c <= '\u30f6') {
				sb.setCharAt(i, (char) (c - '\u0060'));
			}
		}
		return sb.toString();
	}

	public static JSONObject getDirectory(String lat, String lng, String dist, String user, String lang,
			boolean noLandmarks, boolean categories) throws Exception {
		StringBuilder sb = new StringBuilder();
		for (String l : lang.split(",")) {
			if (sb.length() > 0) {
				sb.append(",");
			}
			sb.append(langFilter(l));
		}
		lang = sb.length() > 0 ? sb.toString() : "en";
		String route_url = System.getenv("CONV_MAP_SERVICE") + "/routesearch";
		Form form = Form.form();
		form.add("action", "landmarks");
		form.add("lat", lat);
		form.add("lng", lng);
		form.add("dist", dist);
		form.add("user", user);
		form.add("lang", lang);
		Request req = Request.Post(new URI(route_url)).bodyForm(form.build());
		JSONObject route = new JSONObject(req.execute().returnContent().asString());
		JSONObject result = new JSONObject();
		String[] languages = lang.split(",");
		for (String l : languages) {
			Directory directory = new Directory(route.getJSONArray(l), l, noLandmarks, categories);
			directoryCache.put(user + "_" + l, directory);
			if (languages.length == 1) {
				result = directory.getDocument();
			} else {
				result.put(l, directory.getDocument());
			}
		}
		return result.put("last_updated", route.optJSONObject("last_updated"));
	}

	public static Directory getDirectory(String user, String lang) {
		return directoryCache.get(user + "_" + langFilter(lang));
	}

	public static String unescape(String input) {
		Pattern U_PAT = Pattern.compile("\\\\u(.{4})");
		Matcher m = U_PAT.matcher(input);
		StringBuffer sb = new StringBuffer();
		while (m.find()) {
			int code = Integer.parseInt(m.group(1), 16);
			m.appendReplacement(sb, new String(Character.toChars(code)));
		}
		m.appendTail(sb);
		return sb.toString();
	}

	public static int getEnvInt(String key, int defaultValue) {
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

	private static final Pattern patTW = Pattern.compile("^zh-(Hant|HK|TW|MO)", Pattern.CASE_INSENSITIVE);

	private static String langFilter(String lang) {
		lang = lang.trim();
		if (lang != null) {
			if (patTW.matcher(lang).find()) {
				lang = "zh-TW";
			} else if ("zh".equals(lang = lang.substring(0, 2))) {
				lang = "zh-CN";
			}
		}
		return lang;
	}

	public static void main(String[] args) {
		try {
			String lat = "35.68649580359582";
			String lng = "139.77406764817016";
			String dist = "500";
			String user = "test";
			String lang = "ja";
			System.out.println("loading...");
			String directory = getDirectory(lat, lng, dist, user, lang, true, true).toString(4);
			directory = unescape(directory);
			if (args.length > 0) {
				File file = new File(args[0]);
				System.out.println(file.getAbsolutePath());
				Writer writer = new FileWriter(file);
				writer.write(directory);
				writer.close();
			} else {
				System.out.println(directory);
			}
		} catch (Exception e) {
			e.printStackTrace();
		}
	}
}
