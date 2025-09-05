const notFound = (req, res, next) => {
	res.status(404).json({ message: `Not Found - ${req.originalUrl}` });
};

const errorHandler = (err, req, res, next) => {
	console.error("Error:", err.stack || err.message);
	res.status(res.statusCode === 200 ? 500 : res.statusCode).json({
		message: err.message || "Internal Server Error"
	});
};

module.exports = { notFound, errorHandler };
