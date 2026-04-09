const express = require("express");
const router = express.Router();
const { protect, enforcePasswordChange, authorizeRoles } = require("../middlewares/auth.middleware");
const { createHostel, getHostels } = require("../controllers/hostel.controller");

router.post("/", protect, enforcePasswordChange, authorizeRoles('admin'), createHostel);
router.get("/", protect, enforcePasswordChange, authorizeRoles('admin'), getHostels);

module.exports = router;
