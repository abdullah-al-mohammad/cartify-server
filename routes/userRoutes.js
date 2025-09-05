const express = require("express");
const { ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const { getCollection } = require("../config/db");
const { verifyToken, verifyAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();
const userCollection = () => getCollection("customerDb", "users");

// JWT
router.post("/jwt", async (req, res, next) => {
	try {
		const user = req.body;
		const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);
		res.json({ token });
	} catch (err) {
		next(err);
	}
});

// Create user
router.post("/", verifyToken, async (req, res, next) => {
	try {
		const user = req.body;
		const existing = await userCollection().findOne({ email: user.email });
		if (existing) return res.json({ message: "User already exists" });

		const newUser = { ...user, role: user.role || "user", status: "active" };
		const result = await userCollection().insertOne(newUser);
		res.json(result);
	} catch (err) {
		next(err);
	}
});

// Get all users
router.get("/", verifyToken, async (req, res, next) => {
	try {
		const users = await userCollection().find().toArray();
		res.json(users);
	} catch (err) {
		next(err);
	}
});

// Get single user
router.get("/:id", verifyToken, async (req, res, next) => {
	try {
		const user = await userCollection().findOne({
			_id: new ObjectId(req.params.id)
		});
		res.json(user);
	} catch (err) {
		next(err);
	}
});

// Check admin
router.get("/admin/:email", verifyToken, async (req, res, next) => {
	try {
		if (req.params.email !== req?.decoded?.email) {
			return res.status(403).json({ message: "Forbidden access" });
		}
		const user = await userCollection().findOne({ email: req.params.email });
		res.json({ admin: user?.role === "admin" });
	} catch (err) {
		next(err);
	}
});

// Update user role
router.patch("/:id", verifyToken, verifyAdmin, async (req, res, next) => {
	try {
		const { role } = req.body.user;
		const result = await userCollection().updateOne(
			{ _id: new ObjectId(req.params.id) },
			{ $set: { role } }
		);
		res.json(result);
	} catch (err) {
		next(err);
	}
});

module.exports = router;
