# ===============================================
# QA Test Script for Gate Pass Management System
# ===============================================
$baseUrl = "http://localhost:3000/api"

function Test-API {
    param(
        [string]$Method,
        [string]$Url,
        [string]$Body = "",
        [string]$Token = "",
        [string]$Label = ""
    )
    
    $headers = @{ "Content-Type" = "application/json" }
    if ($Token) { $headers["Authorization"] = "Bearer $Token" }
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $headers
            ErrorAction = "Stop"
        }
        if ($Body -and ($Method -ne "GET")) {
            $params["Body"] = [System.Text.Encoding]::UTF8.GetBytes($Body)
        }
        
        $response = Invoke-WebRequest @params
        $result = $response.Content | ConvertFrom-Json
        Write-Host "[$($response.StatusCode)] $Label" -ForegroundColor Green
        return @{ Status = $response.StatusCode; Data = $result; Success = $true }
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.Value__
        $content = ""
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $content = $reader.ReadToEnd() | ConvertFrom-Json
        } catch {}
        Write-Host "[$statusCode] $Label - $($content.message)" -ForegroundColor Red
        return @{ Status = $statusCode; Data = $content; Success = $false }
    }
}

Write-Host "`n========== PHASE 1: HEALTH CHECK ==========" -ForegroundColor Cyan
Test-API -Method GET -Url "http://localhost:3000/health" -Label "Health Check"

Write-Host "`n========== PHASE 2: AUTH TESTING ==========" -ForegroundColor Cyan

# 2.1 Valid super-admin login
Write-Host "`n--- 2.1 Valid Super-Admin Login ---"
$r = Test-API -Method POST -Url "$baseUrl/auth/login" -Body '{"email":"admin@cdgi.com","password":"pass123"}' -Label "Super-Admin Login"
$superAdminToken = $r.Data.token
Write-Host "  Role: $($r.Data.role) | MustChange: $($r.Data.mustChangePassword)"

# 2.2 Invalid login - wrong password
Write-Host "`n--- 2.2 Invalid Login (Wrong Password) ---"
Test-API -Method POST -Url "$baseUrl/auth/login" -Body '{"email":"admin@cdgi.com","password":"wrongpass"}' -Label "Wrong Password"

# 2.3 Invalid login - missing fields
Write-Host "`n--- 2.3 Invalid Login (Missing Fields) ---"
Test-API -Method POST -Url "$baseUrl/auth/login" -Body '{"email":"admin@cdgi.com"}' -Label "Missing Password Field"
Test-API -Method POST -Url "$baseUrl/auth/login" -Body '{}' -Label "Empty Body"

# 2.4 Invalid login - non-existent user
Write-Host "`n--- 2.4 Non-existent User ---"
Test-API -Method POST -Url "$baseUrl/auth/login" -Body '{"email":"nobody@cdgi.com","password":"pass123"}' -Label "Non-existent User"

# 2.5 Access protected endpoint without token
Write-Host "`n--- 2.5 Protected Endpoint without Token ---"
Test-API -Method GET -Url "$baseUrl/user/dashboard" -Label "Dashboard No Auth"

# 2.6 Access with invalid token
Write-Host "`n--- 2.6 Invalid Token ---"
Test-API -Method GET -Url "$baseUrl/user/dashboard" -Token "invalid.token.here" -Label "Dashboard Invalid Token"

Write-Host "`n========== PHASE 3: SUPER-ADMIN DASHBOARD ==========" -ForegroundColor Cyan
$r = Test-API -Method GET -Url "$baseUrl/user/dashboard" -Token $superAdminToken -Label "SA Dashboard Stats"
Write-Host "  Stats: $($r.Data | ConvertTo-Json -Compress)"

Write-Host "`n========== PHASE 4: USER CREATION HIERARCHY ==========" -ForegroundColor Cyan

# 4.1 SA creates Admin (but admin needs hostel? Let's check)
Write-Host "`n--- 4.1 Super-Admin creates Admin ---"
$r = Test-API -Method POST -Url "$baseUrl/user/create-user" -Token $superAdminToken -Body '{"name":"Test Admin","email":"testadmin@cdgi.com","role":"admin"}' -Label "SA -> Create Admin"
$adminTempPass = $r.Data.tempPassword
Write-Host "  Admin TempPass: $adminTempPass"

# 4.2 SA tries to create student (should fail - hierarchy)
Write-Host "`n--- 4.2 SA tries to create Student (hierarchy violation) ---"
Test-API -Method POST -Url "$baseUrl/user/create-user" -Token $superAdminToken -Body '{"name":"Direct Student","email":"dstudent@cdgi.com","role":"student","hostel":"nonexistent"}' -Label "SA -> Create Student (should fail)"

# 4.3 SA tries to create with missing fields
Write-Host "`n--- 4.3 Create User with Missing Fields ---"
Test-API -Method POST -Url "$baseUrl/user/create-user" -Token $superAdminToken -Body '{"name":"","email":"","role":""}' -Label "Empty Fields"

# 4.4 Login as Admin (will need password change)
Write-Host "`n--- 4.4 Login as Admin ---"
$r = Test-API -Method POST -Url "$baseUrl/auth/login" -Body "{`"email`":`"testadmin@cdgi.com`",`"password`":`"$adminTempPass`"}" -Label "Admin Login"
$adminToken = $r.Data.token
Write-Host "  MustChangePassword: $($r.Data.mustChangePassword)"

# 4.5 Try accessing dashboard before changing password
Write-Host "`n--- 4.5 Dashboard before password change ---"
Test-API -Method GET -Url "$baseUrl/user/dashboard" -Token $adminToken -Label "Dashboard Before PW Change"

# 4.6 Change Admin password
Write-Host "`n--- 4.6 Change Admin Password ---"
Test-API -Method POST -Url "$baseUrl/auth/change-password" -Token $adminToken -Body '{"newPassword":"newadmin123"}' -Label "Change Admin Password"

# 4.7 Login with new password
Write-Host "`n--- 4.7 Login Admin with New Password ---"
$r = Test-API -Method POST -Url "$baseUrl/auth/login" -Body '{"email":"testadmin@cdgi.com","password":"newadmin123"}' -Label "Admin Login (new pw)"
$adminToken = $r.Data.token
Write-Host "  MustChangePassword: $($r.Data.mustChangePassword)"

# 4.8 Admin creates hostel
Write-Host "`n--- 4.8 Admin Creates Hostel ---"
$r = Test-API -Method POST -Url "$baseUrl/hostel/" -Token $adminToken -Body '{"name":"Boys Hostel A","type":"boys","category":"senior"}' -Label "Create Hostel"
$hostelId = $r.Data.hostel._id
Write-Host "  Hostel ID: $hostelId"

# 4.9 Create duplicate hostel (should fail)
Write-Host "`n--- 4.9 Duplicate Hostel ---"
Test-API -Method POST -Url "$baseUrl/hostel/" -Token $adminToken -Body '{"name":"Boys Hostel A","type":"boys"}' -Label "Duplicate Hostel"

# 4.10 Admin creates Warden
Write-Host "`n--- 4.10 Admin creates Warden ---"
$r = Test-API -Method POST -Url "$baseUrl/user/create-user" -Token $adminToken -Body "{`"name`":`"Test Warden`",`"email`":`"testwarden@cdgi.com`",`"role`":`"warden`",`"hostel`":`"$hostelId`"}" -Label "Admin -> Create Warden"
$wardenTempPass = $r.Data.tempPassword
Write-Host "  Warden TempPass: $wardenTempPass"

# 4.11 Admin tries to create Manager (should fail - hierarchy)
Write-Host "`n--- 4.11 Admin tries to create Manager (hierarchy violation) ---"
Test-API -Method POST -Url "$baseUrl/user/create-user" -Token $adminToken -Body "{`"name`":`"Bad Manager`",`"email`":`"badmgr@cdgi.com`",`"role`":`"manager`",`"hostel`":`"$hostelId`"}" -Label "Admin -> Create Manager (should fail)"

# 4.12 Login as Warden, change password
Write-Host "`n--- 4.12 Warden Login & Password Change ---"
$r = Test-API -Method POST -Url "$baseUrl/auth/login" -Body "{`"email`":`"testwarden@cdgi.com`",`"password`":`"$wardenTempPass`"}" -Label "Warden Login"
$wardenToken = $r.Data.token

Test-API -Method POST -Url "$baseUrl/auth/change-password" -Token $wardenToken -Body '{"newPassword":"warden123"}' -Label "Change Warden Password"

$r = Test-API -Method POST -Url "$baseUrl/auth/login" -Body '{"email":"testwarden@cdgi.com","password":"warden123"}' -Label "Warden Login (new pw)"
$wardenToken = $r.Data.token

# 4.13 Warden creates profile
Write-Host "`n--- 4.13 Warden Creates Profile ---"
$r = Test-API -Method POST -Url "$baseUrl/user/profile" -Token $wardenToken -Body '{"department":"Computer Science","phoneNumber":"9876543210"}' -Label "Warden Profile"

# 4.14 Warden creates Manager
Write-Host "`n--- 4.14 Warden creates Manager ---"
$r = Test-API -Method POST -Url "$baseUrl/user/create-user" -Token $wardenToken -Body "{`"name`":`"Test Manager`",`"email`":`"testmanager@cdgi.com`",`"role`":`"manager`",`"hostel`":`"$hostelId`"}" -Label "Warden -> Create Manager"
$managerTempPass = $r.Data.tempPassword
Write-Host "  Manager TempPass: $managerTempPass"

# 4.15 Warden creates Gatekeeper
Write-Host "`n--- 4.15 Warden creates Gatekeeper ---"
$r = Test-API -Method POST -Url "$baseUrl/user/create-user" -Token $wardenToken -Body "{`"name`":`"Test Gatekeeper`",`"email`":`"testgk@cdgi.com`",`"role`":`"gatekeeper`",`"hostel`":`"$hostelId`"}" -Label "Warden -> Create Gatekeeper"
$gkTempPass = $r.Data.tempPassword

# 4.16 Warden tries to create Student (should fail)
Write-Host "`n--- 4.16 Warden tries to create Student (hierarchy violation) ---"
Test-API -Method POST -Url "$baseUrl/user/create-user" -Token $wardenToken -Body "{`"name`":`"Bad Student`",`"email`":`"badstudent@cdgi.com`",`"role`":`"student`",`"hostel`":`"$hostelId`"}" -Label "Warden -> Create Student (should fail)"

# 4.17 Manager Login + setup
Write-Host "`n--- 4.17 Manager Login & Setup ---"
$r = Test-API -Method POST -Url "$baseUrl/auth/login" -Body "{`"email`":`"testmanager@cdgi.com`",`"password`":`"$managerTempPass`"}" -Label "Manager Login"
$managerToken = $r.Data.token

Test-API -Method POST -Url "$baseUrl/auth/change-password" -Token $managerToken -Body '{"newPassword":"manager123"}' -Label "Change Manager PW"
$r = Test-API -Method POST -Url "$baseUrl/auth/login" -Body '{"email":"testmanager@cdgi.com","password":"manager123"}' -Label "Manager Login (new pw)"
$managerToken = $r.Data.token

$r = Test-API -Method POST -Url "$baseUrl/user/profile" -Token $managerToken -Body '{"phoneNumber":"9876543211"}' -Label "Manager Profile"

# 4.18 Manager creates Student
Write-Host "`n--- 4.18 Manager creates Student ---"
$r = Test-API -Method POST -Url "$baseUrl/user/create-user" -Token $managerToken -Body "{`"name`":`"Test Student`",`"email`":`"teststudent@cdgi.com`",`"role`":`"student`",`"hostel`":`"$hostelId`"}" -Label "Manager -> Create Student"
$studentTempPass = $r.Data.tempPassword
Write-Host "  Student TempPass: $studentTempPass"

# 4.19 Student Login + setup
Write-Host "`n--- 4.19 Student Login & Setup ---"
$r = Test-API -Method POST -Url "$baseUrl/auth/login" -Body "{`"email`":`"teststudent@cdgi.com`",`"password`":`"$studentTempPass`"}" -Label "Student Login"
$studentToken = $r.Data.token

Test-API -Method POST -Url "$baseUrl/auth/change-password" -Token $studentToken -Body '{"newPassword":"student123"}' -Label "Change Student PW"
$r = Test-API -Method POST -Url "$baseUrl/auth/login" -Body '{"email":"teststudent@cdgi.com","password":"student123"}' -Label "Student Login (new pw)"
$studentToken = $r.Data.token

$r = Test-API -Method POST -Url "$baseUrl/user/profile" -Token $studentToken -Body '{"enrollmentNumber":"EN2024001","roomNumber":"A-101","course":"B.Tech CSE","year":"3rd","phoneNumber":"9876543212","emergencyContact":"9876543213"}' -Label "Student Profile"

# 4.20 Gatekeeper Login + setup
Write-Host "`n--- 4.20 Gatekeeper Login & Setup ---"
$r = Test-API -Method POST -Url "$baseUrl/auth/login" -Body "{`"email`":`"testgk@cdgi.com`",`"password`":`"$gkTempPass`"}" -Label "Gatekeeper Login"
$gkToken = $r.Data.token

Test-API -Method POST -Url "$baseUrl/auth/change-password" -Token $gkToken -Body '{"newPassword":"gk123456"}' -Label "Change GK PW"
$r = Test-API -Method POST -Url "$baseUrl/auth/login" -Body '{"email":"testgk@cdgi.com","password":"gk123456"}' -Label "GK Login (new pw)"
$gkToken = $r.Data.token

$r = Test-API -Method POST -Url "$baseUrl/user/profile" -Token $gkToken -Body '{"phoneNumber":"9876543214","shift":"Morning"}' -Label "GK Profile"

Write-Host "`n========== PHASE 5: PASS REQUEST FLOW ==========" -ForegroundColor Cyan

# 5.1 Student creates pass request
Write-Host "`n--- 5.1 Student Creates Pass Request ---"
$tomorrow = (Get-Date).AddDays(1).ToString("yyyy-MM-ddTHH:mm:ss")
$dayAfter = (Get-Date).AddDays(1).AddHours(6).ToString("yyyy-MM-ddTHH:mm:ss")
$today = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
$todayPlus3h = (Get-Date).AddHours(3).ToString("yyyy-MM-ddTHH:mm:ss")

$r = Test-API -Method POST -Url "$baseUrl/passes/request-pass" -Token $studentToken -Body "{`"reason`":`"Medical checkup`",`"destination`":`"City Hospital`",`"fromDate`":`"$today`",`"toDate`":`"$todayPlus3h`"}" -Label "Create Pass Request"
Write-Host "  Pass Request: $($r.Data | ConvertTo-Json -Compress -Depth 3)"

# 5.2 Student tries duplicate request (should fail)
Write-Host "`n--- 5.2 Duplicate Request (should fail) ---"
Test-API -Method POST -Url "$baseUrl/passes/request-pass" -Token $studentToken -Body "{`"reason`":`"Another reason`",`"destination`":`"Mall`",`"fromDate`":`"$today`",`"toDate`":`"$todayPlus3h`"}" -Label "Duplicate Request"

# 5.3 Missing fields
Write-Host "`n--- 5.3 Missing Fields ---"
Test-API -Method POST -Url "$baseUrl/passes/request-pass" -Token $studentToken -Body '{"reason":"test"}' -Label "Missing Fields Request"

# 5.4 Student views own requests
Write-Host "`n--- 5.4 Student Views Own Requests ---"
$r = Test-API -Method GET -Url "$baseUrl/passes/my-requests" -Token $studentToken -Label "My Requests"
$passRequestId = $r.Data.requests[0].id
Write-Host "  Request ID: $passRequestId | Status: $($r.Data.requests[0].status)"

# 5.5 Manager views pending requests
Write-Host "`n--- 5.5 Manager Views Pending Requests ---"
$r = Test-API -Method GET -Url "$baseUrl/passes/all" -Token $managerToken -Label "Manager: All Requests"
Write-Host "  Count: $($r.Data.count)"

# 5.6 Manager approves request
Write-Host "`n--- 5.6 Manager Approves Request ---"
$r = Test-API -Method PATCH -Url "$baseUrl/passes/$passRequestId/action" -Token $managerToken -Body '{"action":"approve","remark":"Approved for medical"}' -Label "Manager Approves"
Write-Host "  Status: $($r.Data.passRequest.status)"

# 5.7 Student views passes (should have a pass now)
Write-Host "`n--- 5.7 Student Views Passes ---"
$r = Test-API -Method GET -Url "$baseUrl/passes/my" -Token $studentToken -Label "Student: My Passes"
Write-Host "  Pass Count: $($r.Data.count)"
if ($r.Data.passes.Count -gt 0) {
    $passId = $r.Data.passes[0].passId
    $qrCode = $r.Data.passes[0].qrCode
    Write-Host "  Pass ID: $passId | QR: $qrCode | Status: $($r.Data.passes[0].status)"
}

Write-Host "`n========== PHASE 6: GATE VERIFICATION ==========" -ForegroundColor Cyan

# 6.1 Gatekeeper views active passes
Write-Host "`n--- 6.1 Gatekeeper Views Active Passes ---"
$r = Test-API -Method GET -Url "$baseUrl/passes/get-passes" -Token $gkToken -Label "GK: Active Passes"
Write-Host "  Active Count: $($r.Data.count)"

# 6.2 GK marks OUT
Write-Host "`n--- 6.2 Gatekeeper Marks OUT ---"
$r = Test-API -Method POST -Url "$baseUrl/passes/mark-out" -Token $gkToken -Body "{`"passId`":`"$passId`"}" -Label "Mark OUT"

# 6.3 GK tries to mark OUT again (should fail)
Write-Host "`n--- 6.3 Duplicate Mark OUT (should fail) ---"
Test-API -Method POST -Url "$baseUrl/passes/mark-out" -Token $gkToken -Body "{`"passId`":`"$passId`"}" -Label "Duplicate Mark OUT"

# 6.4 GK marks IN
Write-Host "`n--- 6.4 Gatekeeper Marks IN ---"
$r = Test-API -Method POST -Url "$baseUrl/passes/mark-in" -Token $gkToken -Body "{`"passId`":`"$passId`"}" -Label "Mark IN"

# 6.5 GK tries to mark IN again (should fail)
Write-Host "`n--- 6.5 Duplicate Mark IN (should fail) ---"
Test-API -Method POST -Url "$baseUrl/passes/mark-in" -Token $gkToken -Body "{`"passId`":`"$passId`"}" -Label "Duplicate Mark IN"

# 6.6 QR Scan
Write-Host "`n--- 6.6 QR Code Scan (already used) ---"
Test-API -Method POST -Url "$baseUrl/passes/qr" -Token $gkToken -Body "{`"qrCode`":`"$qrCode`"}" -Label "QR Scan (completed pass)"

Write-Host "`n========== PHASE 7: FORWARD + WARDEN FLOW ==========" -ForegroundColor Cyan

# Create another student + pass request for forward flow
Write-Host "`n--- 7.1 Create Second Student ---"
$r = Test-API -Method POST -Url "$baseUrl/user/create-user" -Token $managerToken -Body "{`"name`":`"Student Two`",`"email`":`"student2@cdgi.com`",`"role`":`"student`",`"hostel`":`"$hostelId`"}" -Label "Create Student 2"
$s2TempPass = $r.Data.tempPassword

$r = Test-API -Method POST -Url "$baseUrl/auth/login" -Body "{`"email`":`"student2@cdgi.com`",`"password`":`"$s2TempPass`"}" -Label "Student2 Login"
$s2Token = $r.Data.token
Test-API -Method POST -Url "$baseUrl/auth/change-password" -Token $s2Token -Body '{"newPassword":"student2pw"}' -Label "Student2 PW Change"
$r = Test-API -Method POST -Url "$baseUrl/auth/login" -Body '{"email":"student2@cdgi.com","password":"student2pw"}' -Label "Student2 Login (new)"
$s2Token = $r.Data.token
Test-API -Method POST -Url "$baseUrl/user/profile" -Token $s2Token -Body '{"enrollmentNumber":"EN2024002","roomNumber":"A-102","course":"B.Tech CSE","year":"2nd","phoneNumber":"9876543215"}' -Label "Student2 Profile"

# Student2 creates pass request
Write-Host "`n--- 7.2 Student2 Creates Pass Request ---"
$r = Test-API -Method POST -Url "$baseUrl/passes/request-pass" -Token $s2Token -Body "{`"reason`":`"Family emergency`",`"destination`":`"Home`",`"fromDate`":`"$today`",`"toDate`":`"$todayPlus3h`"}" -Label "Student2 Pass Request"
$s2RequestId = $r.Data.passRequest._id

# Manager forwards to warden
Write-Host "`n--- 7.3 Manager Forwards to Warden ---"
$r = Test-API -Method PATCH -Url "$baseUrl/passes/$s2RequestId/action" -Token $managerToken -Body '{"action":"forward","remark":"Needs warden approval (emergency)"}' -Label "Manager Forwards"
Write-Host "  Status: $($r.Data.passRequest.status)"

# Warden views forwarded
Write-Host "`n--- 7.4 Warden Views Forwarded ---"
$r = Test-API -Method GET -Url "$baseUrl/passes/all" -Token $wardenToken -Label "Warden: Forwarded Requests"
Write-Host "  Count: $($r.Data.count)"

# Warden approves
Write-Host "`n--- 7.5 Warden Approves ---"
$r = Test-API -Method PATCH -Url "$baseUrl/passes/$s2RequestId/action" -Token $wardenToken -Body '{"action":"approve","remark":"Approved emergency leave"}' -Label "Warden Approves"
Write-Host "  Status: $($r.Data.passRequest.status)"

Write-Host "`n========== PHASE 8: CROSS-ROLE SECURITY ==========" -ForegroundColor Cyan

# 8.1 Student tries to access manager endpoints
Write-Host "`n--- 8.1 Student Access Manager's Passes ---"
Test-API -Method GET -Url "$baseUrl/passes/all" -Token $studentToken -Label "Student -> Manager Endpoint"

# 8.2 Student tries to create user
Write-Host "`n--- 8.2 Student tries to Create User ---"
Test-API -Method POST -Url "$baseUrl/user/create-user" -Token $studentToken -Body '{"name":"Hacker","email":"hacker@cdgi.com","role":"admin"}' -Label "Student -> Create User"

# 8.3 Manager tries to access gatekeeper endpoint
Write-Host "`n--- 8.3 Manager Access GK Endpoint ---"
Test-API -Method GET -Url "$baseUrl/passes/get-passes" -Token $managerToken -Label "Manager -> GK Endpoint"

# 8.4 Gatekeeper tries to approve pass
Write-Host "`n--- 8.4 GK tries to action pass ---"
Test-API -Method PATCH -Url "$baseUrl/passes/$s2RequestId/action" -Token $gkToken -Body '{"action":"approve"}' -Label "GK -> Approve Pass"

Write-Host "`n========== PHASE 9: EDGE CASES ==========" -ForegroundColor Cyan

# 9.1 Change password to same password
Write-Host "`n--- 9.1 Same Password Change ---"
Test-API -Method POST -Url "$baseUrl/auth/change-password" -Token $managerToken -Body '{"newPassword":"manager123"}' -Label "Same PW Change"

# 9.2 Get profile (after creation)
Write-Host "`n--- 9.2 Get Profile ---"
$r = Test-API -Method GET -Url "$baseUrl/user/profile" -Token $studentToken -Label "Student Get Profile"
Write-Host "  Profile: $($r.Data | ConvertTo-Json -Compress -Depth 5)"

# 9.3 Duplicate profile creation (should fail)
Write-Host "`n--- 9.3 Duplicate Profile ---"
Test-API -Method POST -Url "$baseUrl/user/profile" -Token $studentToken -Body '{"enrollmentNumber":"EN2024003","roomNumber":"A-103","course":"test","year":"1st","phoneNumber":"9876543299"}' -Label "Duplicate Profile"

# 9.4 Get users (role-filtered)
Write-Host "`n--- 9.4 Get Users ---"
$r = Test-API -Method GET -Url "$baseUrl/user/get-users" -Token $adminToken -Label "Admin: Get Users"
Write-Host "  Counts: $($r.Data.counts | ConvertTo-Json -Compress)"

# 9.5 Notifications
Write-Host "`n--- 9.5 Notifications ---"
$r = Test-API -Method GET -Url "$baseUrl/notifications/" -Token $studentToken -Label "Student Notifications"
Write-Host "  Count: $($r.Data.count)"

# 9.6 All hostels
Write-Host "`n--- 9.6 Get Hostels ---"
$r = Test-API -Method GET -Url "$baseUrl/hostel/" -Token $adminToken -Label "Get Hostels"
Write-Host "  Hostels: $($r.Data.hostels.Count)"

Write-Host "`n========== TESTS COMPLETE ==========" -ForegroundColor Cyan
Write-Host "Super-Admin Token: $superAdminToken"
Write-Host "Admin Token: $adminToken"
Write-Host "Warden Token: $wardenToken"
Write-Host "Manager Token: $managerToken"
Write-Host "Student Token: $studentToken"
Write-Host "GK Token: $gkToken"
Write-Host "Hostel ID: $hostelId"