const express = require('express')
require('dotenv').config()
const app = express()
const cors = require('cors')
const { connectDB } = require("./config/db");
const port = process.env.PORT || 5000

const userRoutes = require("./routes/userRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const { notFound, errorHandler } = require("./middlewares/errorMiddleware");


// middleware
app.use(cors())
app.use(express.json())
app.use(express.text());

connectDB();

app.use("/users", userRoutes);
app.use("/products", productRoutes);
app.use("/orders", orderRoutes);

app.get("/", (req, res) => {
	res.send("Cartify server is running...");
});

// error handlers
app.use(notFound);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`🚀 Cartify running on port ${port}`);
});