/**
 * Utility functions for handling Indian Standard Time (IST) on the backend.
 */

// Returns the exact UTC date object that corresponds to 00:00:00 (midnight) in IST for the current day.
const getStartOfDayIST = () => {
    // Current UTC time
    const now = new Date();
    
    // Convert to IST representation (string)
    const istString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const istDateObj = new Date(istString);
    
    // Set to midnight IST
    istDateObj.setHours(0, 0, 0, 0);
    
    // Format to "YYYY-MM-DDTHH:mm:ss" to parse back with +05:30 offset
    const year = istDateObj.getFullYear();
    const month = String(istDateObj.getMonth() + 1).padStart(2, '0');
    const day = String(istDateObj.getDate()).padStart(2, '0');
    
    // This is 00:00:00 IST, which is -05:30 UTC
    // "YYYY-MM-DD" + "T00:00:00+05:30"
    return new Date(`${year}-${month}-${day}T00:00:00+05:30`);
};

module.exports = {
    getStartOfDayIST
};
