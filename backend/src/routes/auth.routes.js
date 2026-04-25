const express = require("express");
const router = express.Router();
const { login, changePassword } = require("../controllers/auth.controller");
const { protect } = require("../middlewares/auth.middleware");

router.post("/login", login);
router.patch("/change-password", protect, changePassword);

module.exports = router;