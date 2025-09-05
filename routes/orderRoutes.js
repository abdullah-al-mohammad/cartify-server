const express = require("express");
const { ObjectId } = require("mongodb");
const { getCollection } = require("../config/db");
const { verifyToken, verifyAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();
const orderCollection = () => getCollection("orderDb", "order");

// Get all orders (Admin only, with optional date filters)
router.get("/", verifyToken, verifyAdmin, async (req, res) => {
	try {
		const { startDate, endDate } = req.query;
		let query = {};

		if (startDate && endDate) {
			query.createdAt = {
				$gte: new Date(startDate),
				$lte: new Date(endDate)
			};
		} else if (startDate) {
			query.createdAt = { $gte: new Date(startDate) };
		} else if (endDate) {
			query.createdAt = { $lte: new Date(endDate) };
		}

		const orders = await orderCollection().find(query).toArray();
		res.json(orders);
	} catch (err) {
		res.status(500).json({ error: "Server Error" });
	}
});

// Create new order (User)
router.post("/", verifyToken, async (req, res, next) => {
	try {
		const orders = req.body;
		orders.createdAt = new Date();
		const result = await orderCollection().insertOne(orders);
		res.json(result);
	} catch (err) {
		next(err);
	}
});

// Update order status (Admin only)
router.patch(
	"/:id/status",
	verifyToken,
	verifyAdmin,
	async (req, res) => {
		try {
			const { status } = req.body;
			const result = await orderCollection().updateOne(
				{ _id: new ObjectId(req.params.id) },
				{ $set: { status } }
			);

			if (result.matchedCount === 0) {
				return res.status(404).json({ message: "Order not found" });
			}

			res.json({ success: true, message: "Order status updated" });
		} catch (err) {
			res.status(500).send({ error: "Server Error" });
		}
	}
);

module.exports = router;
