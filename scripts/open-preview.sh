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

sleep 1

# Mobile window (right side, wider to fit DevTools panel)
osascript <<EOF
tell application "Google Chrome"
  make new window
  set URL of active tab of front window to "http://localhost:$PORT"
  set bounds of front window to {1280, 25, 1920, 900}
  activate
end tell
EOF

# Wait for page to load before sending keyboard shortcuts
sleep 3

# Open DevTools (Cmd+Option+I), then toggle device toolbar / mobile simulator (Cmd+Shift+M)
osascript <<EOF
tell application "System Events"
  tell process "Google Chrome"
    keystroke "i" using {command down, option down}
    delay 2
    keystroke "m" using {command down, shift down}
  end tell
end tell
EOF
