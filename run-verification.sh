#!/bin/bash

# 🎯 CASINO VERIFICATION GAUNTLET
# Run this script to verify system is ready for production deployment

echo "🎯 CASINO-GRADE VERIFICATION GAUNTLET"
echo "====================================="
echo "🎰 Proving system is bulletproof before real ETH"
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed"
    exit 1
fi

# Check if required environment variables are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Required environment variables missing:"
    echo "   SUPABASE_URL"
    echo "   SUPABASE_SERVICE_ROLE_KEY"
    echo ""
    echo "💡 Set these in your .env file or export them"
    exit 1
fi

# Set default values for optional variables
export API_URL=${API_URL:-"http://localhost:3000"}
export SOCKET_URL=${SOCKET_URL:-"ws://localhost:3001"}

# Optional: Skip heavy tests for quick verification
export SKIP_LOAD_TEST=${SKIP_LOAD_TEST:-"false"}
export SKIP_CHAOS_TEST=${SKIP_CHAOS_TEST:-"false"}

echo "🔧 Configuration:"
echo "   API URL: $API_URL"
echo "   Socket URL: $SOCKET_URL" 
echo "   Skip Load Test: $SKIP_LOAD_TEST"
echo "   Skip Chaos Test: $SKIP_CHAOS_TEST"
echo ""

# Create reports directory
mkdir -p crash-casino/reports

# Install required dependencies if needed
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "🔧 Installing Node.js dependencies..."
    npm install
fi

# Run the master verification
echo "🚀 Starting verification gauntlet..."
echo ""

node crash-casino/verification/master-verification.js

# Capture exit code
VERIFICATION_RESULT=$?

echo ""
if [ $VERIFICATION_RESULT -eq 0 ]; then
    echo "🎉 VERIFICATION PASSED - READY FOR DEPLOYMENT!"
    echo "💰 System is casino-grade and ready for real ETH"
    echo ""
    echo "🚀 Next steps:"
    echo "   1. Deploy to production"
    echo "   2. Run health checks"
    echo "   3. Monitor metrics closely"
    echo "   4. Start with small bet limits"
else
    echo "🚨 VERIFICATION FAILED - DO NOT DEPLOY"
    echo "❌ Critical issues detected"
    echo ""
    echo "🔧 Next steps:"
    echo "   1. Review failed tests above"
    echo "   2. Fix critical issues"
    echo "   3. Re-run verification"
    echo "   4. Only deploy when all tests pass"
fi

echo ""
echo "📄 Detailed reports saved in crash-casino/reports/"

exit $VERIFICATION_RESULT
