#!/bin/bash
# Auto-increment patch version and add changelog entry
# Usage: ./scripts/bump-version.sh "change1" "change2" ...

FILE="public/version.json"
if [ ! -f "$FILE" ]; then echo "version.json not found"; exit 1; fi

# Read current version
CURRENT=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$FILE','utf8')).version)")
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"
PATCH=$((PATCH + 1))
NEW_VERSION="$MAJOR.$MINOR.$PATCH"
TODAY=$(TZ=Asia/Shanghai date +%Y-%m-%d)

# Build changes array
CHANGES="["
FIRST=true
for arg in "$@"; do
  if [ "$FIRST" = true ]; then FIRST=false; else CHANGES+=","; fi
  CHANGES+="\"$arg\""
done
CHANGES+="]"

# Update version.json using node
node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('$FILE', 'utf8'));
data.version = '$NEW_VERSION';
data.changelog.unshift({ version: '$NEW_VERSION', date: '$TODAY', changes: $CHANGES });
fs.writeFileSync('$FILE', JSON.stringify(data, null, 2) + '\n');
console.log('Version bumped: $CURRENT -> $NEW_VERSION');
"
