#!/bin/bash
echo "Starting server..."
node server.js &
SERVER_PID=$!
sleep 3
echo "Testing /api/test..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/test
echo ""
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null