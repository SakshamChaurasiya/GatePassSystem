module.exports = {
    "super-admin": ["admin"],
    "admin": ["warden"],
    "warden": ["manager", "gatekeeper"],
    "manager": ["student"]
};