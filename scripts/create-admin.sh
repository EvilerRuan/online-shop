#!/bin/bash
# Create admin account 17612167268
SUPABASE_URL="https://zremusafurpmyhjhldze.supabase.co"
SRK="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyZW11c2FmdXJwbXloamhsZHplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDI4NDU1MiwiZXhwIjoyMDk1ODYwNTUyfQ._EjPCqo3JiuahYQcfLPcpa5jWUZKi7vqyHMZaTLpW6A"

echo "=== Step 1: Create Auth User ==="
RESULT=$(curl -s -X POST "$SUPABASE_URL/auth/v1/admin/users" \
  -H "apikey: $SRK" \
  -H "Authorization: Bearer $SRK" \
  -H "Content-Type: application/json" \
  -d '{"email":"17612167268@shop.local","password":"admin123456","email_confirm":true,"user_metadata":{"phone":"17612167268","username":"管理员"}}')

echo "$RESULT" | python3 -m json.tool

USER_ID=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)

if [ -z "$USER_ID" ]; then
  echo "创建用户失败"
  exit 1
fi

echo "用户ID: $USER_ID"

echo "=== Step 2: Create Profile ==="
curl -s -X POST "$SUPABASE_URL/rest/v1/profiles" \
  -H "apikey: $SRK" \
  -H "Authorization: Bearer $SRK" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{\"id\":\"$USER_ID\",\"username\":\"管理员\",\"phone\":\"17612167268\",\"role\":\"admin\",\"status\":\"active\"}" | python3 -m json.tool

echo "=== Done ==="
echo "账号: 17612167268"
echo "密码: admin123456"
