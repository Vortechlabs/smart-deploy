#!/bin/bash

# Ambil token dari cookie
TOKEN=$(curl -s http://localhost:3001 2>/dev/null | grep -o 'github_token=[^;]*' | head -1 | cut -d= -f2)

if [ -z "$TOKEN" ]; then
    echo "❌ Token not found. Please login first at http://localhost:3001"
    exit 1
fi

echo "✅ Token found"

# Hapus project lama
echo "Deleting old project..."
curl -X DELETE "http://localhost:3000/projects/cmo2cbtsb0001uam0w0c3e75p" \
  -H "Authorization: Bearer $TOKEN"

# Buat project baru
echo ""
echo "Creating new project with branch 'master'..."
curl -X POST "http://localhost:3000/projects" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "srikandi-app",
    "repoUrl": "https://github.com/Vortechlabs/srikanditrans",
    "branch": "master",
    "subdomain": "srikandi",
    "port": 3000
  }'

echo ""
echo "✅ Project created! Now click Deploy button in dashboard"
