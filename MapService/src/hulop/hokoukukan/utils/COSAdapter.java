package hulop.hokoukukan.utils;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.wink.json4j.JSON;
import org.apache.wink.json4j.JSONArray;
import org.apache.wink.json4j.JSONObject;

import com.ibm.cloud.objectstorage.ClientConfiguration;
import com.ibm.cloud.objectstorage.auth.AWSCredentials;
import com.ibm.cloud.objectstorage.auth.AWSStaticCredentialsProvider;
import com.ibm.cloud.objectstorage.client.builder.AwsClientBuilder.EndpointConfiguration;
import com.ibm.cloud.objectstorage.oauth.BasicIBMOAuthCredentials;
import com.ibm.cloud.objectstorage.services.s3.AmazonS3;
import com.ibm.cloud.objectstorage.services.s3.AmazonS3ClientBuilder;
import com.ibm.cloud.objectstorage.services.s3.model.ListObjectsRequest;
import com.ibm.cloud.objectstorage.services.s3.model.ObjectListing;
import com.ibm.cloud.objectstorage.services.s3.model.ObjectMetadata;
import com.ibm.cloud.objectstorage.services.s3.model.S3ObjectSummary;
import com.ibm.cloud.objectstorage.util.IOUtils;

public class COSAdapter implements DBAdapter {

	private final DBAdapter db;
	private final Map<String, byte[]> cache = new HashMap<String, byte[]>();
	private String bucketName;
	private AmazonS3 cos;

	public COSAdapter(DBAdapter adapter) {
		db = adapter;
		String services_env = System.getenv("COS_SERVICES");
		String settings_env = System.getenv("COS_SETTINGS");
		if (services_env == null) {
			services_env = System.getenv("VCAP_SERVICES");
		}
		if (services_env != null && settings_env != null) {
			try {
				JSONObject settings = (JSONObject) JSON.parse(settings_env);
				System.out.println(settings.toString(4));
				JSONObject services = (JSONObject) JSON.parse(services_env);
				if (services.has("cloud-object-storage")) {
					JSONObject credentials = services.getJSONArray("cloud-object-storage").getJSONObject(0)
							.getJSONObject("credentials");
					System.out.println(credentials.toString(4));
					bucketName = settings.getString("bucketName");
					String api_key = credentials.getString("apikey");
					String service_instance_id = credentials.getString("resource_instance_id");
					String endpoint_url = settings.getString("endpoint_url");
					String location = settings.getString("location");
					cos = createClient(api_key, service_instance_id, endpoint_url, location);
					System.out.println(cos.listBuckets());
				}
			} catch (Exception e) {
				e.printStackTrace();
			}
		}
	}

	private static AmazonS3 createClient(String api_key, String service_instance_id, String endpoint_url,
			String location) {
		AWSCredentials credentials = new BasicIBMOAuthCredentials(api_key, service_instance_id);
		ClientConfiguration clientConfig = new ClientConfiguration().withRequestTimeout(5000);
		clientConfig.setUseTcpKeepAlive(true);
		return AmazonS3ClientBuilder.standard().withCredentials(new AWSStaticCredentialsProvider(credentials))
				.withEndpointConfiguration(new EndpointConfiguration(endpoint_url, location))
				.withPathStyleAccessEnabled(true).withClientConfiguration(clientConfig).build();
	}

	@Override
	public List<String> listAttachment() {
		if (cos == null) {
			return db.listAttachment();
		}
		List<String> files = new ArrayList<String>();
		ObjectListing objectListing = cos.listObjects(new ListObjectsRequest().withBucketName(bucketName));
		for (S3ObjectSummary objectSummary : objectListing.getObjectSummaries()) {
			files.add(objectSummary.getKey());
		}
		return files;
	}

	@Override
	public InputStream getAttachment(String path) {
		if (cos == null) {
			return db.getAttachment(path);
		}
		byte[] b = cache.get(path);
		if (b == null) {
			try {
				InputStream is = cos.getObject(bucketName, path).getObjectContent();
				b = IOUtils.toByteArray(is);
				is.close();
				cache.put(path, b);
			} catch (IOException e) {
				e.printStackTrace();
			}
		}
		return b == null ? null : new ByteArrayInputStream(b);
	}

	@Override
	public void saveAttachment(String path, InputStream is) {
		if (cos == null) {
			db.saveAttachment(path, is);
			return;
		}
		try {
			byte[] b = IOUtils.toByteArray(is);
			is.close();
			cache.put(path, b);
			ObjectMetadata metadata = new ObjectMetadata();
			metadata.setContentType("application/octet-stream");
			metadata.setContentLength(b.length);
			is = new ByteArrayInputStream(b);
			cos.putObject(bucketName, path, is, metadata);
			is.close();
		} catch (Exception e) {
			e.printStackTrace();
		}
	}

	@Override
	public void deleteAttachment(String path) {
		if (cos == null) {
			db.deleteAttachment(path);
			return;
		}
		cache.remove(path);
		cos.deleteObject(bucketName, path);
		System.out.println("deleteAttachment:" + path);
	}

	@Override
	public void prepare(File file) {
		db.prepare(file);
	}

	@Override
	public void insert(String json) {
		db.insert(json);
	}

	@Override
	public void update(String json) {
		db.update(json);
	}

	@Override
	public void setOBJ(JSONObject obj) {
		db.setOBJ(obj);
	}

	@Override
	public void remove(JSONArray array) {
		db.remove(array);
	}

	@Override
	public void flush() {
		db.flush();
	}

	@Override
	public int getInsertCount() {
		return db.getInsertCount();
	}

	@Override
	public JSONArray getResult() {
		return db.getResult();
	}

	@Override
	public void dropDB() {
		db.dropDB();
	}

	@Override
	public void getGeometry(double[] center, double radius, JSONObject nodeMap, JSONArray features,
			GeometryType toilet) {
		db.getGeometry(center, radius, nodeMap, features, toilet);
	}

	@Override
	public String findNearestNode(double[] point, List<Double> floors) {
		return db.findNearestNode(point, floors);
	}

	@Override
	public JSONObject find(String id) {
		return db.find(id);
	}

	@Override
	public List<String> listFiles() {
		return db.listFiles();
	}

	@Override
	public JSONObject findUser(String id) {
		return db.findUser(id);
	}

	@Override
	public JSONArray listUsers() {
		return db.listUsers();
	}

	@Override
	public void insertUser(String json) {
		db.insertUser(json);
	}

	@Override
	public void updateUser(String json) {
		db.updateUser(json);
	}

	@Override
	public void removeUser(JSONObject obj) {
		db.removeUser(obj);
	}

	@Override
	public void insertLog(String json) {
		db.insertLog(json);
	}

	@Override
	public JSONArray getLogStats() {
		return db.getLogStats();
	}

	@Override
	public JSONArray getLogs(String clientId, String start, String end, String skip, String limit, String event) {
		return db.getLogs(clientId, start, end, skip, limit, event);
	}

	@Override
	public JSONObject getEntry(String id) {
		return db.getEntry(id);
	}

	@Override
	public void setEntry(JSONObject entry) {
		db.setEntry(entry);
	}

	@Override
	public JSONArray getAgreements() {
		return db.getAgreements();
	}

	@Override
	public JSONArray getAnswers(String deviceId) {
		return db.getAnswers(deviceId);
	}
}
