const express = require('express')
require('dotenv').config()
const app = express()
const cors = require('cors')
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
    const userCollection = client.db('customerDb').collection('users') //user collections

    // token related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET)
      
      res.send({token})
    })
    // middleWare for token verify
    const verifyToken = (req, res, next) => {
      const authHeader = req.headers.authorization;
      console.log(authHeader);
      
      
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
      })
    }

// user related apis request
    app.post('/users', async(req,res) => {
      const user = req.body
      
      // if user already exist
      const query = { email: user?.email }
      
      const existingUser = await userCollection.findOne(query);
      if(existingUser){
        return res.send({ message: "user already exist", insertedId: null });
      }
      const newUser ={
        ...user,
        role: user.role || 'user',
        status: 'active'
      }
      const result = await userCollection.insertOne(newUser)
      
      res.send(result)
    })

    app.get('/users', async (req, res) => {
      const result = await userCollection.find().toArray()
      // console.log(result);
      
      res.send(result)
    })
// make admin
    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req?.decoded?.email) {
         return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email }
      const user = await userCollection.findOne(query);
      let admin = false
      if (user) {
        admin = user?.role === "admin"
      }
      res.send({admin})
    })

    app.get('/users/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await userCollection.findOne(query)
      res.send(result)
    })
    app.patch('/users/:id', async(req, res) => {
      const user = req.body
      const id = req.params.id
      const filter = {_id: new ObjectId(id)}

      const updateDoc = { $set: {} };

        // Update only the fields that are present in the request
        if (user.role) updateDoc.$set.role = user.role;


      const result = await userCollection.updateOne(filter, updateDoc)
      console.log(result);
      
      res.send(result)
    })
    
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
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