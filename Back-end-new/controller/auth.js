// ============================================
// MIDDLEWARE - Auth.js
// ============================================
const dotenv = require('dotenv');
dotenv.config();
const jwt = require("jsonwebtoken");

// General Auth Middleware
const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authorization header missing or malformed" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.secretKey);
    req.user = {
      id: decoded.id,
      role: decoded.role,
      name: decoded.name,
      userType: decoded.userType // "Student" | "Teacher" | "Admin"
    };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Student Only Middleware
const authStudent = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authorization header missing or malformed" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.secretKey);
    
    if (decoded.userType !== "Student") {
      return res.status(403).json({ message: "Access denied. Students only." });
    }
    
    req.user = {
      id: decoded.id,
      name: decoded.name,
      userType: decoded.userType
    };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Teacher Only Middleware
const authTeacher = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authorization header missing or malformed" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.secretKey);
    
    if (decoded.userType !== "Teacher") {
      return res.status(403).json({ message: "Access denied. Teachers only." });
    }
    
    req.user = {
      id: decoded.id,
      name: decoded.name,
      userType: decoded.userType
    };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Admin Only Middleware
const authAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authorization header missing or malformed" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.secretKey);
    
    if (decoded.userType !== "Admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }
    
    req.user = {
      id: decoded.id,
      name: decoded.name,
      role: decoded.role, // SuperAdmin | Admin
      userType: decoded.userType
    };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Teacher (Approved Only) Middleware
const authApprovedTeacher = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authorization header missing or malformed" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.secretKey);
    
    if (decoded.userType !== "Teacher") {
      return res.status(403).json({ message: "Access denied. Teachers only." });
    }
    
    if (decoded.approvalStatus !== "Approved") {
      return res.status(403).json({ message: "Your account is not approved yet. Please wait for admin approval." });
    }
    
    req.user = {
      id: decoded.id,
      name: decoded.name,
      userType: decoded.userType,
      approvalStatus: decoded.approvalStatus
    };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = { 
  auth, 
  authStudent, 
  authTeacher, 
  authAdmin, 
  authApprovedTeacher 
};
