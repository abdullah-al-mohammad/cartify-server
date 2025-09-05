const express = require("express");
const { ObjectId } = require("mongodb");
const { getCollection } = require("../config/db");
const { verifyToken, verifyAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();
const productCollection = () => getCollection("productDB", "product");

// Get all products (with discount calculation)
router.get("/", async (req, res, next) => {
	try {
		const products = await productCollection().find().toArray();

		const productsWithDiscount = products.map(product => {
			const discountAmount = (product.price * (product.discount || 0)) / 100;
			const finalPrice = product.price - discountAmount;
			return { ...product, finalPrice };
		});

		res.json(productsWithDiscount);
	} catch (err) {
		next(err);
	}
});

// Get single product
router.get("/:id", async (req, res, next) => {
	try {
		const product = await productCollection().findOne({
			_id: new ObjectId(req.params.id)
		});
		if (!product) return res.status(404).json({ message: "Product not found" });
		res.json(product);
	} catch (err) {
		next(err);
	}
});

// Get related products (same category)
router.get("/:id/related", async (req, res, next) => {
	try {
		const product = await productCollection().findOne({
			_id: new ObjectId(req.params.id)
		});
		if (!product) return res.status(404).json({ message: "Product not found" });

		const related = await productCollection()
			.find({
				categories: { $in: product.categories || [] },
				_id: { $ne: product._id }
			})
			.limit(4)
			.toArray();

		res.json(related);
	} catch (err) {
		next(err);
	}
});

// Create product (Admin only)
router.post("/", verifyToken, verifyAdmin, async (req, res, next) => {
	try {
		const product = req.body;
		const price = Number(product.price) || 0;
		const discount = Number(product.discount) || 0;
		product.finalPrice = price - (price * discount) / 100;

		const result = await productCollection().insertOne(product);
		res.json(result);
	} catch (err) {
		next(err);
	}
});

// Update product (stock/status) (Admin only)
router.patch("/:id", verifyToken, verifyAdmin, async (req, res) => {
	try {
		const { stockStatus, status } = req.body;
		const updateFields = {};
		if (stockStatus !== undefined) updateFields.stockStatus = stockStatus;
		if (status !== undefined) updateFields.status = status;

		const result = await productCollection().findOneAndUpdate(
			{ _id: new ObjectId(req.params.id) },
			{ $set: updateFields },
			{ returnDocument: "after" }
		);

		if (!result.value) {
			return res.status(404).json({ message: "Product not found" });
		}

		res.json(result.value);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// Delete product (Admin only)
router.delete("/:id", verifyToken, verifyAdmin, async (req, res) => {
	try {
		const result = await productCollection().deleteOne({
			_id: new ObjectId(req.params.id)
		});

		if (result.deletedCount === 0) {
			return res.status(404).json({ message: "Product not found" });
		}

		res.json({ success: true, message: "Product deleted successfully" });
	} catch (err) {
		res.status(500).send({ success: false, message: err.message });
	}
});

module.exports = router;
