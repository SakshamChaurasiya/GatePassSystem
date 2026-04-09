const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const { protect, canCreateUser, enforcePasswordChange } = require("../middlewares/auth.middleware");
const { createUser, getUsers, getDashboardStats, createProfile, getProfile, bulkUploadStudents } = require("../controllers/user.controller");

router.post("/create-user", protect, enforcePasswordChange, canCreateUser, createUser);
router.get("/get-users", protect, enforcePasswordChange, getUsers);
router.get("/dashboard", protect, enforcePasswordChange, getDashboardStats);
router.post("/profile", protect, createProfile);
router.get("/profile", protect, getProfile);
router.post("/bulk-upload", protect, enforcePasswordChange, upload.single("file"), bulkUploadStudents);

module.exports = router;