#!/bin/bash
set -e

echo "Starting backend server..."
cd /home/coop-ai/Sahakarhelp/backend
npm start &
SERVER_PID=$!

# Wait for server to be ready
sleep 3

echo "Testing PDF merge endpoint with test PDFs..."
curl -X POST http://localhost:8080/api/tools/pdf-merge \
  -F "files=@test1.pdf" \
  -F "files=@test2.pdf" \
  -H "Accept: application/json" \
  -w "\nHTTP Status: %{http_code}\n"

# Kill server
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null
echo "Test completed."