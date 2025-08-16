@echo off

REM 🎯 CASINO VERIFICATION GAUNTLET
REM Run this script to verify system is ready for production deployment

echo 🎯 CASINO-GRADE VERIFICATION GAUNTLET
echo =====================================
echo 🎰 Proving system is bulletproof before real ETH
echo.

REM Check if Node.js is available
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is required but not installed
    pause
    exit /b 1
)

REM Check if required environment variables are set
if not defined SUPABASE_URL (
    echo ❌ Required environment variables missing:
    echo    SUPABASE_URL
    echo    SUPABASE_SERVICE_ROLE_KEY
    echo.
    echo 💡 Set these in your .env file or environment
    pause
    exit /b 1
)

if not defined SUPABASE_SERVICE_ROLE_KEY (
    echo ❌ Required environment variables missing:
    echo    SUPABASE_URL
    echo    SUPABASE_SERVICE_ROLE_KEY
    echo.
    echo 💡 Set these in your .env file or environment
    pause
    exit /b 1
)

REM Set default values for optional variables
if not defined API_URL set API_URL=http://localhost:3000
if not defined SOCKET_URL set SOCKET_URL=ws://localhost:3001
if not defined SKIP_LOAD_TEST set SKIP_LOAD_TEST=false
if not defined SKIP_CHAOS_TEST set SKIP_CHAOS_TEST=false

echo 🔧 Configuration:
echo    API URL: %API_URL%
echo    Socket URL: %SOCKET_URL%
echo    Skip Load Test: %SKIP_LOAD_TEST%
echo    Skip Chaos Test: %SKIP_CHAOS_TEST%
echo.

REM Create reports directory
if not exist "crash-casino\reports" mkdir "crash-casino\reports"

REM Check dependencies
echo 📦 Checking dependencies...
if not exist "node_modules" (
    echo 🔧 Installing Node.js dependencies...
    npm install
)

REM Run the master verification
echo 🚀 Starting verification gauntlet...
echo.

node crash-casino/verification/master-verification.js

REM Capture exit code
set VERIFICATION_RESULT=%ERRORLEVEL%

echo.
if %VERIFICATION_RESULT% EQU 0 (
    echo 🎉 VERIFICATION PASSED - READY FOR DEPLOYMENT!
    echo 💰 System is casino-grade and ready for real ETH
    echo.
    echo 🚀 Next steps:
    echo    1. Deploy to production
    echo    2. Run health checks
    echo    3. Monitor metrics closely
    echo    4. Start with small bet limits
) else (
    echo 🚨 VERIFICATION FAILED - DO NOT DEPLOY
    echo ❌ Critical issues detected
    echo.
    echo 🔧 Next steps:
    echo    1. Review failed tests above
    echo    2. Fix critical issues
    echo    3. Re-run verification
    echo    4. Only deploy when all tests pass
)

echo.
echo 📄 Detailed reports saved in crash-casino\reports\

pause
exit /b %VERIFICATION_RESULT%
