const jwt = require("jsonwebtoken");
const { getCollection } = require("../config/db");

const verifyToken = (req, res, next) => {
	const authHeader = req.headers.authorization;
	if (!authHeader)
		return res.status(401).json({ message: "Unauthorized: No token provided" });

	const token = authHeader.split(" ")[1];
	jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
		if (err)
			return res.status(401).json({ message: "Unauthorized: Invalid token" });

		req.decoded = decoded;
		next();
	});
};

const verifyAdmin = async (req, res, next) => {
	try {
		const userCollection = getCollection("customerDb", "users");
		const email = req?.decoded?.email;
		const user = await userCollection.findOne({ email });

		if (user?.role !== "admin") {
			return res
				.status(403)
				.json({ message: "Forbidden: Admin access required" });
		}
		next();
	} catch (error) {
		next(error);
	}
};

module.exports = { verifyToken, verifyAdmin };
