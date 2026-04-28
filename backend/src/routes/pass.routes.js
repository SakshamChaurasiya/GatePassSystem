const express = require("express");
const router = express.Router();
const { protect, enforcePasswordChange, requireProfile, authorizeRoles } = require("../middlewares/auth.middleware");
const {
    createPassRequest, getMyPassRequests, handlePassChange, getMyPassesWithStatus,
    getGatekeeperPasses, markOut, markIn, scanQR, getAllPassRequests,
    getStudentHistory, cancelPassRequest, getManagerHistory, getAllPassesWithStatus,
    requestExtension, getMyExtensionRequests, getAllExtensionRequests, handleExtensionAction
} = require("../controllers/pass.controller");
const upload = require("../middlewares/cloudUpload");

// Student routes
router.post("/request-pass", protect, authorizeRoles("student"), enforcePasswordChange, requireProfile, upload.single("document"), createPassRequest);
router.get("/my-requests", protect, authorizeRoles("student"), enforcePasswordChange, requireProfile, getMyPassRequests);
router.patch("/:id/cancel", protect, authorizeRoles("student"), enforcePasswordChange, requireProfile, cancelPassRequest);
router.get("/my", protect, authorizeRoles("student"), enforcePasswordChange, requireProfile, getMyPassesWithStatus);

// Student extension routes
router.post("/extension-request", protect, authorizeRoles("student"), enforcePasswordChange, requireProfile, upload.single("document"), requestExtension);
router.get("/my-extensions", protect, authorizeRoles("student"), enforcePasswordChange, requireProfile, getMyExtensionRequests);

// Manager/Warden routes
router.patch("/:id/action", protect, authorizeRoles("warden", "manager"), enforcePasswordChange, requireProfile, handlePassChange);
router.get("/all", protect, authorizeRoles("manager", "warden"), enforcePasswordChange, requireProfile, getAllPassRequests);
router.get("/all-passes", protect, authorizeRoles("manager", "warden"), enforcePasswordChange, requireProfile, getAllPassesWithStatus);
router.get("/history/:studentId", protect, authorizeRoles("manager", "warden"), enforcePasswordChange, requireProfile, getStudentHistory);
router.get("/manager-history/:managerId", protect, authorizeRoles("warden"), enforcePasswordChange, requireProfile, getManagerHistory);

// Manager/Warden extension routes
router.get("/all-extensions", protect, authorizeRoles("manager", "warden"), enforcePasswordChange, requireProfile, getAllExtensionRequests);
router.patch("/extension/:id/action", protect, authorizeRoles("manager", "warden"), enforcePasswordChange, requireProfile, handleExtensionAction);

// Gatekeeper routes
router.post("/qr", protect, authorizeRoles("gatekeeper"), enforcePasswordChange, requireProfile, scanQR);
router.get("/get-passes", protect, authorizeRoles("gatekeeper"), enforcePasswordChange, requireProfile, getGatekeeperPasses);
router.post("/mark-out", protect, authorizeRoles("gatekeeper"), enforcePasswordChange, requireProfile, markOut);
router.post("/mark-in", protect, authorizeRoles("gatekeeper"), enforcePasswordChange, requireProfile, markIn);

module.exports = router;