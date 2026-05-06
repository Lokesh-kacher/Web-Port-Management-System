const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Authorization token missing" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "wps_dev_secret");
    req.user = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

module.exports = authMiddleware;
