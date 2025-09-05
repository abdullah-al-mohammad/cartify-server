const { MongoClient, ServerApiVersion } = require("mongodb");

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3umb5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

let client;

async function connectDB() {
	try {
		client = new MongoClient(uri, {
			serverApi: {
				version: ServerApiVersion.v1,
				strict: true,
				deprecationErrors: true
			}
		});

		await client.connect();
		return client;
	} catch (error) {
		console.error("❌ MongoDB connection failed:", error.message);
		process.exit(1);
	}
}

function getCollection(dbName, collectionName) {
	if (!client) throw new Error("MongoDB not connected yet");
	return client.db(dbName).collection(collectionName);
}

module.exports = { connectDB, getCollection };
