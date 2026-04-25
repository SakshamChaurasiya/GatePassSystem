const express = require("express");
const router = express.Router();
const { protect, enforcePasswordChange, authorizeRoles } = require("../middlewares/auth.middleware");
const { createHostel, getHostels, getHostelDetails } = require("../controllers/hostel.controller");

router.post("/", protect, enforcePasswordChange, authorizeRoles('admin'), createHostel);
router.get("/", protect, enforcePasswordChange, authorizeRoles('admin', 'super-admin'), getHostels);


router.get("/:id", protect, enforcePasswordChange, authorizeRoles('admin', 'super-admin'), getHostelDetails);

module.exports = router;
