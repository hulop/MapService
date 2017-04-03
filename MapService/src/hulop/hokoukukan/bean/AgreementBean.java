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

import org.apache.wink.json4j.JSONException;
import org.apache.wink.json4j.JSONObject;

public class AgreementBean {

	public boolean isAgreementSupported() {
		return "true".equals(System.getenv("SUPPORT_AGREEMENT"));
	}

	public boolean isQuestionSupported() {
		return "true".equals(System.getenv("SUPPORT_QUESTION"));
	}

	public void setAgreed(String id, boolean agreed) {
		try {
			setEntry(id, getEntry(id).put("agreed", agreed));
		} catch (JSONException e) {
			e.printStackTrace();
		}
	}

	public void setAnswers(String id, Object answers) {
		try {
			setEntry(id, getEntry(id).put("answers", answers));
		} catch (JSONException e) {
			e.printStackTrace();
		}
	}

	public void setEntry(JSONObject entry) {
		try {
			System.out.println(entry.toString(4));
			DatabaseBean.setEntry(entry);
		} catch (JSONException e) {
			e.printStackTrace();
		}
	}

	public boolean getAgreed(String id) {
		try {
			JSONObject entry = getEntry(id);
			if (entry.has("agreed")) {
				return entry.getBoolean("agreed");
			}
		} catch (JSONException e) {
			e.printStackTrace();
		}
		return false;
	}

	public Object getAnswers(String id) {
		try {
			JSONObject entry = getEntry(id);
			if (entry.has("answers")) {
				return entry.get("answers");
			}
			;
		} catch (JSONException e) {
			e.printStackTrace();
		}
		return null;
	}

	private JSONObject getEntry(String id) throws JSONException {
		JSONObject entry = DatabaseBean.getEntry(id);
		return entry != null ? entry : new JSONObject();
	}

	private void setEntry(String id, JSONObject entry) throws JSONException {
		entry.put("_id", id);
		setEntry(entry);
	}
}
