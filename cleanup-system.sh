#!/bin/bash

# Cloud Backup App - System Cleanup Script
# This script fixes common issues with LaunchAgents and system conflicts

set -e

echo "Cloud Backup App - System Cleanup Script"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Step 1: Clean up LaunchAgents
echo -e "\n${YELLOW}Step 1: Cleaning up LaunchAgents...${NC}"

# Find and remove all cloud-backup-app related LaunchAgents
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
LAUNCH_DAEMONS_DIR="/Library/LaunchDaemons"

if [ -d "$LAUNCH_AGENTS_DIR" ]; then
    # Unload and remove user LaunchAgents
    for plist in "$LAUNCH_AGENTS_DIR"/com.cloudbackup.* "$LAUNCH_AGENTS_DIR"/*cloudbackup* "$LAUNCH_AGENTS_DIR"/*cloud-backup*; do
        if [ -f "$plist" ]; then
            echo "Cleaning up: $(basename "$plist")"
            launchctl unload "$plist" 2>/dev/null || true
            rm -f "$plist"
            print_status "Removed $(basename "$plist")"
        fi
    done
else
    print_warning "LaunchAgents directory not found"
fi

# Check for system-wide daemons (requires sudo)
if [ -d "$LAUNCH_DAEMONS_DIR" ]; then
    SYSTEM_PLISTS=$(sudo find "$LAUNCH_DAEMONS_DIR" -name "*cloudbackup*" -o -name "*cloud-backup*" 2>/dev/null || true)
    if [ -n "$SYSTEM_PLISTS" ]; then
        print_warning "Found system-wide LaunchDaemons. You may need to run with sudo to clean these:"
        echo "$SYSTEM_PLISTS"
    fi
fi

# Step 2: Kill any running backup processes
echo -e "\n${YELLOW}Step 2: Stopping running backup processes...${NC}"

# Kill any rclone processes that might be stuck
pkill -f "rclone.*cloudbackup" 2>/dev/null || true
pkill -f "cloud-backup-app" 2>/dev/null || true

print_status "Stopped any running backup processes"

# Step 3: Clean up application data
echo -e "\n${YELLOW}Step 3: Cleaning application data...${NC}"

APP_SUPPORT_DIR="$HOME/Library/Application Support/cloud-backup-app"
if [ -d "$APP_SUPPORT_DIR" ]; then
    echo "Found app data at: $APP_SUPPORT_DIR"
    read -p "Do you want to remove app configuration data? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$APP_SUPPORT_DIR"
        print_status "Removed application data"
    else
        print_warning "Kept application data"
    fi
else
    print_status "No application data found"
fi

# Step 4: Clean up rclone configuration
echo -e "\n${YELLOW}Step 4: Cleaning rclone configuration...${NC}"

RCLONE_CONFIG_DIR="$HOME/.config/rclone"
if [ -d "$RCLONE_CONFIG_DIR" ]; then
    echo "Found rclone config at: $RCLONE_CONFIG_DIR"
    read -p "Do you want to clean rclone configuration? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Backup existing config
        if [ -f "$RCLONE_CONFIG_DIR/rclone.conf" ]; then
            cp "$RCLONE_CONFIG_DIR/rclone.conf" "$RCLONE_CONFIG_DIR/rclone.conf.backup.$(date +%Y%m%d_%H%M%S)"
            print_status "Backed up rclone config"
        fi
        
        # Remove cloud-backup-app related configurations
        if command -v rclone &> /dev/null; then
            rclone config show 2>/dev/null | grep -E "^\[.*cloudbackup.*\]" | sed 's/\[\(.*\)\]/\1/' | while read -r remote; do
                echo "Removing rclone remote: $remote"
                echo "y" | rclone config delete "$remote" || true
            done
        fi
        print_status "Cleaned rclone configuration"
    else
        print_warning "Kept rclone configuration"
    fi
else
    print_status "No rclone configuration found"
fi

# Step 5: Reset LaunchAgent cache (safely)
echo -e "\n${YELLOW}Step 5: Resetting LaunchAgent cache...${NC}"

# Safely reload the user LaunchAgent domain
launchctl kickstart -k gui/$(id -u)/com.apple.UserEventAgent 2>/dev/null || true

print_status "Reset LaunchAgent cache"

# Step 6: Check for common conflicts
echo -e "\n${YELLOW}Step 6: Checking for common conflicts...${NC}"

# Check for conflicting backup software
CONFLICTING_PROCESSES=("Time Machine" "Backblaze" "Carbonite" "CrashPlan")
for process in "${CONFLICTING_PROCESSES[@]}"; do
    if pgrep -f "$process" > /dev/null 2>&1; then
        print_warning "Found running process: $process (may conflict with backup scheduling)"
    fi
done

# Check available disk space
AVAILABLE_SPACE=$(df -h "$HOME" | tail -1 | awk '{print $4}')
print_status "Available disk space: $AVAILABLE_SPACE"

# Step 7: Verify cleanup
echo -e "\n${YELLOW}Step 7: Verifying cleanup...${NC}"

# Check if any LaunchAgents remain
REMAINING_AGENTS=$(find "$LAUNCH_AGENTS_DIR" -name "*cloudbackup*" -o -name "*cloud-backup*" 2>/dev/null | wc -l)
if [ "$REMAINING_AGENTS" -eq 0 ]; then
    print_status "All LaunchAgents cleaned up"
else
    print_warning "Found $REMAINING_AGENTS remaining LaunchAgents"
fi

# Check if any processes are still running
RUNNING_PROCESSES=$(pgrep -f "cloudbackup\|cloud-backup-app" | wc -l)
if [ "$RUNNING_PROCESSES" -eq 0 ]; then
    print_status "No backup processes running"
else
    print_warning "Found $RUNNING_PROCESSES still running backup processes"
fi

echo -e "\n${GREEN}🎉 Cleanup completed!${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Restart the Cloud Backup App"
echo "2. Go through the setup wizard again"
echo "3. Test scheduled backup functionality"
echo ""
echo "If you still experience issues, try:"
echo "- Restarting your Mac"
echo "- Running this script with sudo for system-wide cleanup"
echo "- Checking Console.app for error messages"
echo ""
print_status "System is ready for fresh Cloud Backup App setup!"