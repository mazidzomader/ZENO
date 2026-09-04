const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    let token;

    // Check if token exists in Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user (excluding password)
      req.user = await User.findById(decoded.id).select("-password");
      
      // Check if user exists and is active
      if (!req.user) {return res.status(401).json({ message: "User not found." });}
      if (!req.user.isActive) {return res.status(403).json({ message: "Account suspended." });}

      next();
    } else {
      return res.status(401).json({
        message: "Not authorized. No token provided.",
      });
    }
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token.",
    });
  }
};

// Restricts a route to specific roles, e.g. authorize("owner", "admin")
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Requires role: ${roles.join(" or ")}.`,
      });
    }
    next();
  };
};

module.exports = {
  protect,
  authorize,
};