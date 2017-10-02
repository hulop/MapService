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
import java.io.InputStream;
import java.util.List;

import org.apache.wink.json4j.JSONArray;
import org.apache.wink.json4j.JSONObject;

public interface DBAdapter {

	void prepare(File file);

	void insert(String json);

	void update(String json);

	void setOBJ(JSONObject obj);
	
	void remove(JSONArray array);

	void flush();

	int getInsertCount();

	JSONArray getResult();

	void dropDB();

	void getGeometry(double[] center, double radius, JSONObject nodeMap, JSONArray features, List<String> categories);

	String findNearestNode(double[] point, List<String> floors);

	JSONObject find(String id);

	List<String> listFiles();

	JSONObject findUser(String id);

	JSONArray listUsers();

	void insertUser(String json);

	void updateUser(String json);

	void removeUser(JSONObject obj);

	void insertLog(String json);

	JSONArray getLogStats();

	JSONArray getLogs(String clientId, String start, String end, String skip, String limit, String event);

	void saveAttachment(String path, InputStream is);

	InputStream getAttachment(String path);

	List<String> listAttachment();

	void deleteAttachment(String path);

	JSONObject getEntry(String id);

	void setEntry(JSONObject entry);

	JSONArray getAgreements();

	JSONArray getAnswers(String deviceId);
}
