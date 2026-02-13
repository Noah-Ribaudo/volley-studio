#!/bin/bash
PORT=$1

# Wait for the dev server to be ready
while ! curl -s "http://localhost:$PORT" > /dev/null 2>&1; do
  sleep 1
done

# Desktop window (left side, ~1280px wide)
osascript <<EOF
tell application "Google Chrome"
  make new window
  set URL of active tab of front window to "http://localhost:$PORT"
  set bounds of front window to {0, 25, 1280, 900}
end tell
EOF

sleep 0.5

# Mobile window (right side, ~430px wide — triggers mobile breakpoints)
osascript <<EOF
tell application "Google Chrome"
  make new window
  set URL of active tab of front window to "http://localhost:$PORT"
  set bounds of front window to {1290, 25, 1720, 900}
end tell
EOF
