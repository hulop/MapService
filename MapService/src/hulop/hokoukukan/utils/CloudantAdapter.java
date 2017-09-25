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
package hulop.hokoukukan.utils;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;

import org.apache.wink.json4j.JSONArray;
import org.apache.wink.json4j.JSONException;
import org.apache.wink.json4j.JSONObject;

import com.cloudant.client.api.ClientBuilder;
import com.cloudant.client.api.CloudantClient;
import com.cloudant.client.api.Database;
import com.cloudant.client.api.model.Response;
import com.cloudant.client.api.views.Key;
import com.cloudant.client.api.views.Key.ComplexKey;
import com.cloudant.client.api.views.UnpaginatedRequestBuilder;
import com.cloudant.client.api.views.ViewResponse;
import com.cloudant.client.api.views.ViewResponse.Row;
import com.cloudant.client.internal.DatabaseURIHelper;
import com.cloudant.client.org.lightcouch.NoDocumentException;
import com.cloudant.http.Http;
import com.cloudant.http.HttpConnection;
import com.cloudant.http.interceptors.Replay429Interceptor;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

public class CloudantAdapter implements DBAdapter {

	private Database navi_db, user_db, log_db, file_db, entry_db;
	private final CloudantClient client;
	private final List<JsonElement> insertList = new ArrayList<JsonElement>();
	private final List<JsonElement> insertLogList = new ArrayList<JsonElement>();
	private JSONArray resultList = new JSONArray();
	private static final String NAVI_DB = "navi_db", USER_DB = "user_db", LOG_DB = "log_db", FILE_DB = "file_db",
			ENTRY_DB = "entry_db";
	private int insertCount = 0;
	private static final Replay429Interceptor REPLAY429_INTERCEPTOR = new Replay429Interceptor(3, 250l);

	public CloudantAdapter(String url) throws MalformedURLException {
		client = ClientBuilder.url(new URL(url)).interceptors(REPLAY429_INTERCEPTOR).build();
		System.out.println(client.getAllDbs());
		ensureDB();
	}

	@Override
	public void prepare(File file) {
		if (file != null) {
			try {
				System.out.println(file.getPath());
				ViewResponse<String, String> response = navi_db.getViewRequestBuilder("file", "files")
						.newRequest(Key.Type.STRING, String.class).keys(file.getPath()).build().getResponse();
				List<JsonElement> deleteList = new ArrayList<JsonElement>();
				int count = 0;
				for (Row<String, String> row : response.getRows()) {
					JsonObject obj = new JsonObject();
					obj.addProperty("_id", row.getId());
					obj.addProperty("_rev", row.getValue());
					obj.addProperty("_deleted", true);
					deleteList.add(obj);
					count++;
					if (deleteList.size() >= 1000) {
						navi_db.bulk(deleteList);
						deleteList.clear();
					}
				}
				if (deleteList.size() > 0) {
					navi_db.bulk(deleteList);
				}
				System.out.println(count + " records deleted");
			} catch (IOException e) {
				e.printStackTrace();
			}
		}
		// insertList.clear();
		// insertLogList.clear();
		resultList = new JSONArray();
		insertCount = 0;
	}

	@Override
	public void insert(String json) {
		synchronized (insertList) {
			insertList.add(new JsonParser().parse(json));
		}
		if (insertList.size() >= 1000) {
			flush();
		}
	}

	@Override
	public void update(String json) {
		insert(json);
	}

	@Override
	public void remove(JSONArray array) {
		int count = 0;
		List<JsonElement> deleteList = new ArrayList<JsonElement>();
		for (int i = 0; i < array.length(); i++) {
			try {
				JSONObject row = array.getJSONObject(i);
				JsonObject obj = new JsonObject();
				obj.addProperty("_id", row.getString("_id"));
				if (row.has("_rev")) {
					obj.addProperty("_rev", row.getString("_rev"));
				} else {
					System.err.println("No _rev on remove for " + row.getString("_id"));
				}
				obj.addProperty("_deleted", true);
				deleteList.add(obj);
			} catch (Exception e) {
				e.printStackTrace();
			}
			if (deleteList.size() >= 1000) {
				count += navi_db.bulk(deleteList).size();
				deleteList.clear();
			}
		}
		if (deleteList.size() > 0) {
			count += navi_db.bulk(deleteList).size();
		}
		System.out.println(count + " docs deleted");
	}

	@Override
	public void flush() {
		synchronized (insertList) {
			if (insertList.size() > 0) {
				for (Response resp : navi_db.bulk(insertList)) {
					try {
						resultList.add(new JSONObject().put("_id", resp.getId()).put("_rev", resp.getRev()));
					} catch (Exception e) {
						e.printStackTrace();
					}
				}
				insertCount += insertList.size();
				insertList.clear();
			}
		}
		List<JsonElement> flushList = null;
		synchronized (insertLogList) {
			if (insertLogList.size() > 0) {
				flushList = new ArrayList<JsonElement>(insertLogList);
				insertCount += insertLogList.size();
				insertLogList.clear();
			}
		}
		if (flushList != null) {
			for (Response resp : log_db.bulk(flushList)) {
				try {
					new JSONObject().put("_id", resp.getId()).put("_rev", resp.getRev());
				} catch (Exception e) {
					e.printStackTrace();
				}
			}
		}
	}

	@Override
	public int getInsertCount() {
		return insertCount;
	}

	@Override
	public JSONArray getResult() {
		return resultList;
	}

	@Override
	public void dropDB() {
		client.deleteDB(NAVI_DB);
		ensureDB();
	}

	@Override
	public void getGeometry(double[] center, double radius, JSONObject nodeMap, JSONArray features,
			List<String> categories) {
		int limit = 200;
		if (getGeometryRows(center, radius, limit * 100, 1, categories).size() > 0) {
			System.err.println("more than 100 API calls expected");
			return;
		}
		long start = System.currentTimeMillis();
		try {
			for (int skip = 0;; skip += limit) {
				JsonArray rows = getGeometryRows(center, radius, skip, limit, categories);
				for (int i = 0; i < rows.size(); i++) {
					JsonObject row = (JsonObject) rows.get(i);
					JsonObject doc = (JsonObject) row.get("doc");
					// doc.remove("_id");
					// doc.remove("_rev");
					JSONObject json = new JSONObject(doc.toString());
					JSONObject properties = json.getJSONObject("properties");
					if ("ノード情報".equals(properties.get("category"))) {
						nodeMap.put(properties.getString("ノードID"), json);
					} else {
						features.add(json);
					}
				}
				long elapsed = System.currentTimeMillis() - start;
				System.out.println(
						rows.size() + "/" + (rows.size() + skip) + " " + Math.floor(elapsed / 10) / 100 + "seconds");
				if (rows.size() < limit) {
					break;
				}
				if (elapsed > 60 * 1000) {
					nodeMap.clear();
					features.clear();
					System.err.println("more than 1 minutes have passed");
					break;
				}
			}
		} catch (Exception e) {
			e.printStackTrace();
		}
	}

	@Override
	public String findNearestNode(double[] point, List<String> floors) {
		try {
			int limit = floors == null ? 1 : 200;
			for (int skip = 0; skip < 1000; skip += limit) {
				JsonArray rows = getNearestRows(point, skip, limit);
				for (int i = 0; i < rows.size(); i++) {
					JsonObject row = (JsonObject) rows.get(i);
					JsonObject doc = (JsonObject) row.get("doc");
					JsonObject properties = (JsonObject) doc.get("properties");
					if (floors == null || floors.indexOf(properties.get("高さ").getAsString()) != -1) {
						return properties.get("ノードID").getAsString();
					}
				}
				if (rows.size() < limit) {
					break;
				}
				System.out.println(rows.size() + "/" + (rows.size() + skip));
			}
		} catch (Exception e) {
			e.printStackTrace();
		}
		return null;
	}

	private void ensureDB() {
		navi_db = client.database(NAVI_DB, true);
		for (String file : new String[] { "file.json", "geo.json", "user.json" }) {
			ensureView(file, navi_db);
		}
		user_db = client.database(USER_DB, true);
		for (String file : new String[] { "user.json" }) {
			ensureView(file, user_db);
		}
		log_db = client.database(LOG_DB, true);
		for (String file : new String[] { "log.json" }) {
			ensureView(file, log_db);
		}
		file_db = client.database(FILE_DB, true);
		for (String file : new String[] { "attachment.json" }) {
			ensureView(file, file_db);
		}
		entry_db = client.database(ENTRY_DB, true);
		for (String file : new String[] { "entry.json" }) {
			ensureView(file, entry_db);
		}
	}

	private void ensureView(String file, Database db) {
		try {
			InputStreamReader reader = new InputStreamReader(CloudantAdapter.class.getResourceAsStream("/json/" + file),
					"UTF-8");
			JsonObject document = (JsonObject) new JsonParser().parse(reader);
			JsonElement id = document.get("_id");
			if (id != null) {
				try {
					JsonObject documentFromDB = db.find(JsonObject.class, id.getAsString());
					document.add("_rev", documentFromDB.get("_rev"));
					if (!document.equals(documentFromDB)) {
						db.update(document);
						System.out.println(file + " updated");
					}
				} catch (NoDocumentException e) {
					db.save(document);
					System.out.println(file + " saved");
				}
			}
		} catch (Exception e) {
			e.printStackTrace();
		}

	}

	private JsonArray getGeometryRows(double[] center, double radius, int skip, int limit, List<String> categories) {
		String index = "geoIndex";
		if (categories != null) {
			if (categories.contains("公共用トイレの情報")) {
				index = "toiletIndex";
			} else if (categories.contains("リンクの情報")) {
				index = "linkIndex";
			}
		}
		return (JsonArray) navi_db.findAny(JsonObject.class, String.format(
				"%s/_design/geo/_geo/%s?lon=%f&lat=%f8&radius=%f&relation=intersects&skip=%d&limit=%d&include_docs=true",
				navi_db.getDBUri(), index, center[0], center[1], radius, skip, limit)).get("rows");
	}

	private JsonArray getNearestRows(double[] point, int skip, int limit) {
		return (JsonArray) navi_db.findAny(JsonObject.class,
				String.format(
						"%s/_design/geo/_geo/nodeIndex?g=point(%f+%f)&nearest=true&skip=%d&limit=%d&include_docs=true",
						navi_db.getDBUri(), point[0], point[1], skip, limit))
				.get("rows");
	}

	@Override
	public JSONObject find(String id) {
		return find(id, navi_db);
	}

	@Override
	public List<String> listFiles() {
		List<String> files = new ArrayList<String>();
		try {
			ViewResponse<String, Long> response = navi_db.getViewRequestBuilder("file", "count")
					.newRequest(Key.Type.STRING, Long.class).reduce(true).group(true).build().getResponse();
			for (Row<String, Long> row : response.getRows()) {
				System.out.println(row.getKey() + ": " + row.getValue());
				files.add(row.getKey());
			}
		} catch (IOException e) {
			e.printStackTrace();
		}
		return files;
	}

	@Override
	public JSONObject findUser(String id) {
		return find(id, user_db);
	}

	private JSONObject find(String id, Database db) {
		try {
			return new JSONObject(db.find(JsonObject.class, id).toString());
		} catch (NoDocumentException e) {
		} catch (Exception e) {
			e.printStackTrace();
		}
		return null;
	}

	@Override
	public JSONArray listUsers() {
		JSONArray users = new JSONArray();
		try {
			ViewResponse<String, Object> response = user_db.getViewRequestBuilder("user", "users")
					.newRequest(Key.Type.STRING, Object.class).includeDocs(true).build().getResponse();
			for (Row<String, Object> row : response.getRows()) {
				Object doc = row.getDocumentAsType(JsonObject.class);
				users.add(new JSONObject(doc.toString()));
			}
		} catch (Exception e) {
			e.printStackTrace();
		}
		return users;
	}

	@Override
	public void insertUser(String json) {
		user_db.save(new JsonParser().parse(json));

	}

	@Override
	public void updateUser(String json) {
		user_db.update(new JsonParser().parse(json));
	}

	@Override
	public void removeUser(JSONObject obj) {
		try {
			String id = obj.getString("_id");
			String rev = obj.getString("_rev");
			if (id != null && rev != null) {
				user_db.remove(id, rev);
			}
		} catch (JSONException e) {
			e.printStackTrace();
		}
	}

	@Override
	public void insertLog(String json) {
		synchronized (insertLogList) {
			insertLogList.add(new JsonParser().parse(json));
		}
		if (insertLogList.size() >= 1000) {
			flush();
		}
	}

	@Override
	public JSONArray getLogStats() {
		JSONArray result = new JSONArray();
		try {
			ViewResponse<String, Object> response = log_db.getViewRequestBuilder("log", "stats")
					.newRequest(Key.Type.STRING, Object.class).reduce(true).group(true).build().getResponse();
			for (Row<String, Object> row : response.getRows()) {
				String clientId = row.getKey();
				try {
					Object stats = new JSONObject(row.getValue());
					JSONObject obj = new JSONObject();
					obj.put("clientId", clientId);
					obj.put("stats", stats);
					result.add(obj);
				} catch (JSONException e) {
					e.printStackTrace();
				}
			}
		} catch (IOException e) {
			e.printStackTrace();
		}
		return result;
	}

	@Override
	public JSONArray getLogs(String clientId, String start, String end, String skip, String limit, String event) {
		if (clientId == null && event == null) {
			return getLogs(start, end, skip, limit);
		}
		JSONArray result = new JSONArray();
		String view, key1;
		if (clientId != null) {
			view = "client_timestamp";
			key1 = clientId;
		} else {
			view = "event_timestamp";
			key1 = event;
		}
		try {
			UnpaginatedRequestBuilder<ComplexKey, Object> builder = log_db.getViewRequestBuilder("log", view)
					.newRequest(Key.Type.COMPLEX, Object.class);
			builder.startKey(Key.complex(key1).add(start != null ? Long.parseLong(start) : 0));
			builder.endKey(Key.complex(key1).add(end != null ? Long.parseLong(end) : Long.MAX_VALUE));
			if (skip != null) {
				builder.skip(Integer.parseInt(skip));
			}
			if (limit != null) {
				builder.limit(Integer.parseInt(limit));
			}
			ViewResponse<ComplexKey, Object> response = builder.includeDocs(true).build().getResponse();
			for (Row<ComplexKey, Object> row : response.getRows()) {
				Object doc = row.getDocumentAsType(JsonObject.class);
				try {
					result.add(new JSONObject(doc.toString()));
				} catch (JSONException e) {
					e.printStackTrace();
				}
			}
		} catch (IOException e) {
			e.printStackTrace();
		}
		return result;
	}

	private JSONArray getLogs(String start, String end, String skip, String limit) {
		JSONArray result = new JSONArray();
		try {
			UnpaginatedRequestBuilder<Number, Object> builder = log_db.getViewRequestBuilder("log", "timestamp")
					.newRequest(Key.Type.NUMBER, Object.class);
			if (start != null) {
				builder.startKey(Long.parseLong(start));
			}
			if (end != null) {
				builder.endKey(Long.parseLong(end));
			}
			if (skip != null) {
				builder.skip(Integer.parseInt(skip));
			}
			if (limit != null) {
				builder.limit(Integer.parseInt(limit));
			}
			ViewResponse<Number, Object> response = builder.includeDocs(true).build().getResponse();
			for (Row<Number, Object> row : response.getRows()) {
				Object doc = row.getDocumentAsType(JsonObject.class);
				try {
					result.add(new JSONObject(doc.toString()));
				} catch (JSONException e) {
					e.printStackTrace();
				}
			}
		} catch (IOException e) {
			e.printStackTrace();
		}
		return result;
	}

	@Override
	public void saveAttachment(String path, InputStream is) {
		String rev = null;
		try {
			rev = file_db.find(JsonObject.class, path).get("_rev").getAsString();
		} catch (NoDocumentException e) {
		}
		file_db.saveAttachment(is, "file", "application/octet-stream", path, rev);
	}

	@Override
	public InputStream getAttachment(String path) {
		try {
			HttpConnection conn = Http.GET(new DatabaseURIHelper(file_db.getDBUri()).attachmentUri(path, "file"));
			return client.executeRequest(conn).responseAsInputStream();
		} catch (NoDocumentException e) {
		} catch (IOException e) {
			e.printStackTrace();
		}
		return null;
	}

	@Override
	public List<String> listAttachment() {
		List<String> files = new ArrayList<String>();
		try {
			ViewResponse<String, String> response = file_db.getViewRequestBuilder("attachment", "files")
					.newRequest(Key.Type.STRING, String.class).build().getResponse();
			for (Row<String, String> row : response.getRows()) {
				files.add(row.getKey());
			}
		} catch (IOException e) {
			e.printStackTrace();
		}
		return files;
	}

	@Override
	public void deleteAttachment(String path) {
		try {
			file_db.remove(file_db.find(JsonObject.class, path));
			System.out.println("deleteAttachment:" + path);
		} catch (NoDocumentException e) {
		}
	}

	@Override
	public JSONObject getEntry(String id) {
		return find(id, entry_db);
	}

	@Override
	public void setEntry(JSONObject entry) {
		JsonElement el = new JsonParser().parse(entry.toString());
		if (entry.has("_rev")) {
			entry_db.update(el);
		} else {
			entry_db.save(el);
		}
	}

	@Override
	public JSONArray getAgreements() {
		JSONArray devices = new JSONArray();
		try {
			ViewResponse<String, Object> response = entry_db.getViewRequestBuilder("entry", "agreed")
					.newRequest(Key.Type.STRING, Object.class).includeDocs(true).build().getResponse();
			for (Row<String, Object> row : response.getRows()) {
				Object doc = row.getDocumentAsType(JsonObject.class);
				devices.add(new JSONObject(doc.toString()));
			}
		} catch (Exception e) {
			e.printStackTrace();
		}
		return devices;
	}

	@Override
	public JSONArray getAnswers(String deviceId) {
		JSONArray answers = new JSONArray();
		try {
			ViewResponse<String, Object> response = entry_db.getViewRequestBuilder("entry", "answers")
					.newRequest(Key.Type.STRING, Object.class).keys(deviceId).includeDocs(true).build().getResponse();
			for (Row<String, Object> row : response.getRows()) {
				Object doc = row.getDocumentAsType(JsonObject.class);
				answers.add(new JSONObject(doc.toString()));
			}
		} catch (Exception e) {
			e.printStackTrace();
		}
		return answers;
	}

}