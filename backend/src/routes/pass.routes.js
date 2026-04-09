const express = require("express");
const router = express.Router();
const { protect, enforcePasswordChange, requireProfile, authorizeRoles } = require("../middlewares/auth.middleware");
const { createPassRequest, getMyPassRequests, handlePassChange, getMyPassesWithStatus, getGatekeeperPasses,
    markOut,
    markIn,
    scanQR, getAllPassRequests, getStudentHistory } = require("../controllers/pass.controller");
const upload = require("../middlewares/cloudUpload")

router.post("/request-pass", protect, authorizeRoles("student"), enforcePasswordChange, requireProfile, upload.single("document"), createPassRequest);
router.get("/my-requests", protect, authorizeRoles("student"), enforcePasswordChange, requireProfile, getMyPassRequests);
router.get("/my", protect, authorizeRoles("student"), enforcePasswordChange, requireProfile, getMyPassesWithStatus);
router.patch("/:id/action", protect, authorizeRoles("warden", "manager"), enforcePasswordChange, requireProfile, handlePassChange);
router.get("/all", protect, authorizeRoles("manager", "warden"), enforcePasswordChange, requireProfile, getAllPassRequests);
router.get("/history", protect, authorizeRoles("manager", "warden"), enforcePasswordChange, requireProfile, getStudentHistory);


router.get("/get-passes", protect, authorizeRoles("gatekeeper"), enforcePasswordChange, requireProfile, getGatekeeperPasses);
router.post("/mark-out", protect, authorizeRoles("gatekeeper"), enforcePasswordChange, requireProfile, markOut);
router.post("/mark-in", protect, authorizeRoles("gatekeeper"), enforcePasswordChange, requireProfile, markIn);
router.post("/qr", protect, authorizeRoles("gatekeeper"), enforcePasswordChange, requireProfile, scanQR);

module.exports = router;