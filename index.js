const express = require('express')
require('dotenv').config()
const app = express()
const cors = require('cors')
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion, ObjectId, ReturnDocument } = require('mongodb');
var jwt = require('jsonwebtoken');
const { log } = require('console')

// middleware
app.use(cors())
app.use(express.json())
app.use(express.text());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3umb5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
		// Connect the client to the server	(optional starting in v4.7)
		await client.connect();

		// collections
		const userCollection = client.db("customerDb").collection("users"); //user collections
		const productCollection = client.db("productDB").collection("product"); //product collection
		const orderCollection = client.db("orderDb").collection("order"); //order collection

		// token related api
		app.post("/jwt", async (req, res) => {
			const user = req.body;
			const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);

			res.send({ token });
		});
		// middleWare for token verify
		const verifyToken = (req, res, next) => {
			const authHeader = req.headers.authorization;

			if (!authHeader) {
				return res.status(401).send({ message: "unauthorized Access" });
			}
			const token = authHeader.split(" ")[1];
			jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
				if (err) {
					return res.status(401).send({ message: "unauthorized access" });
				}
				req.decoded = decoded;

				next();
			});
		};
		// use verify admin after verify token
		const verifyAdmin = async (req, res, next) => {
			const email = req?.decoded?.email;

			const query = { email: email };
			const user = await userCollection.findOne(query);
			const isAdmin = user?.role === "admin";
			if (!isAdmin) {
				return res.status(403).send({ message: "forbidden access" });
			}
			next();
		};

		// user related apis request
		app.post("/users", verifyToken, async (req, res) => {
			const user = req.body;

			// if user already exist
			const query = { email: user?.email };

			const existingUser = await userCollection.findOne(query);
			if (existingUser) {
				return res.send({ message: "user already exist", insertedId: null });
			}
			const newUser = {
				...user,
				role: user.role || "user",
				status: "active"
			};
			const result = await userCollection.insertOne(newUser);

			res.send(result);
		});

		app.get("/users",verifyToken, async (req, res) => {
			const result = await userCollection.find().toArray();
			// console.log(result);

			res.send(result);
		});
		// make admin
		app.get("/users/admin/:email", verifyToken, async (req, res) => {
			const email = req.params.email;
			if (email !== req?.decoded?.email) {
				return res.status(403).send({ message: "forbidden access" });
			}
			const query = { email: email };
			const user = await userCollection.findOne(query);
			let admin = false;
			if (user) {
				admin = user?.role === "admin";
			}
			
			res.send({ admin });
		});

		app.get("/users/:id", verifyToken, async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const result = await userCollection.findOne(query);
			res.send(result);
		});
		app.patch("/users/:id",verifyToken,verifyAdmin, async (req, res) => {
			const user = req.body;
			const id = req.params.id;
			const filter = { _id: new ObjectId(id) };

			const updateDoc = { $set: {} };

			// Update only the fields that are present in the request
			if (user.role) updateDoc.$set.role = user.role;

			const result = await userCollection.updateOne(filter, updateDoc);
			// console.log(result);

			res.send(result);
		});

		// product rleted crud
		app.get("/products", async (req, res) => {
			const products = await productCollection.find().toArray();
			// Discount price calculate
			const productsWithDiscount = products.map(product => {
				const discountAmount = (product.price * (product.discount || 0)) / 100;
				const finalPrice = product.price - discountAmount;

				return {
					...product,
					finalPrice // discounted price
				};
			});

			res.send(productsWithDiscount);
		});
		// Get single product by id
		app.get("/products/:id",verifyToken, async (req, res) => {
			const { id } = req.params;
			const product = await productCollection.findOne({
				_id: new ObjectId(id)
			});
			if (!product) return res.status(404).send({ error: "Product not found" });
			res.send(product);
		});

		// Get related products (same category)
		app.get("/products/:id/related",verifyToken, async (req, res) => {
			const { id } = req.params;
			const product = await productCollection.findOne({
				_id: new ObjectId(id)
			});
			if (!product) return res.status(404).send({ error: "Product not found" });

			const related = await productCollection
				.find({
					categories: { $in: product.categories },
					_id: { $ne: product._id }
				})
				.limit(4)
				.toArray();

			res.send(related);
		});

		app.delete("/products/:id", verifyToken, verifyAdmin, async (req, res) => {
			try {
				const id = req.params.id;
				const query = { _id: new ObjectId(id) };

				const result = await productCollection.deleteOne(query);

				if (result.deletedCount === 0) {
					return res.status(404).send({ message: "Product not found" });
				}

				res.send({ success: true, message: "Product deleted successfully" });
			} catch (error) {
				res.status(500).send({ success: false, message: error.message });
			}
		});

		app.patch("/products/:id",verifyToken,verifyAdmin,async (req, res) => {
			try {
				const { id } = req.params;
				const updateFields = {}
				  if (req.body.stockStatus !== undefined)
						updateFields.stockStatus = req.body.stockStatus;
					if (req.body.status !== undefined)
						updateFields.status = req.body.status;
				const query = { _id: new ObjectId(id) }
				const field = { $set: updateFields }
				const newDocument = {ReturnDocument: "after"}
				const result = await productCollection.findOneAndUpdate(
					query,
					field,
					newDocument
				);
				console.log(result);
				
				 if (!result.value) {
						return res.status(404).json({ message: "Product not found" });
				}
				res.send(result)
			 } catch {
				res.status(500).json({ error: err.message });
			}
		})

		app.post("/products",verifyToken,verifyAdmin, async (req, res) => {
			const product = req.body;
			// finalPrice calculate
			const price = Number(product.price) || 0;
			const discount = Number(product.discount) || 0;
			product.finalPrice = price - (price * discount) / 100;

			const result = await productCollection.insertOne(product);

			res.send(result);
		});

		// GET all orders, optionally filter by date
		app.get("/orders",verifyToken,verifyAdmin, async (req, res) => {
			try {
				const { startDate, endDate } = req.query;

				let query = {};

				if (startDate || endDate) {
					query.createdAt = {};
					if (startDate) query.createdAt.$gte = new Date(startDate);
					if (endDate) query.createdAt.$lte = new Date(endDate);
				}

				const orders = await orderCollection.find(query).toArray();
				res.send(orders);
			} catch (err) {
				console.error(err);
				res.status(500).send({ error: "Server Error" });
			}
		});

		// Update order status
		app.patch("/orders/:id/status",verifyToken,verifyAdmin, async (req, res) => {
			try {
				const { status } = req.body; // pending, shipped, delivered, canceled
				const { id } = req.params;

				const result = await orderCollection.updateOne(
					{ _id: new ObjectId(id) },
					{ $set: { status } }
				);

				res.send({ success: true, result });
			} catch (err) {
				console.error(err);
				res.status(500).send({ error: "Server Error" });
			}
		});

		app.post("/orders",verifyToken, (req, res) => {
			const orders = req.body;
			console.log(orders);
			
			const result = orderCollection.insertOne(orders);
			return res.send(result);
		});
		// Send a ping to confirm a successful connection
		await client.db("admin").command({ ping: 1 });
		console.log(
			"Pinged your deployment. You successfully connected to MongoDB!"
		);
	} finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', async (req, res) => {
  res.send('cartify port is running')
})
app.listen(port, () => {
  console.log(`cartify is running on ${port}`);
})