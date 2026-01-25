#!/bin/bash

# Configuration
PI_USER="" # enter your Pi user
PI_HOST="" # enter static IP of Pi using tailscale
DIRECTORY_PATH="$HOME/" # path to the directory that needs to be backed up
REMOTE_BASE="" # backup directory in Pi

# Colors for output, can skip
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "Starting backup to picloud..."

# Backup Obsidian notes in my case
echo -n "Backing up Obsidian vault... "
if rsync -avz --delete \  # common rsync commands for synchronization
    --exclude '.obsidian/workspace*' \
    --exclude '.trash/' \  # skip any files or directories
    "$DIRECTORY_PATH/" \
    "$PI_USER@$PI_HOST:~/$REMOTE_BASE/obsidian/"; then
    echo -e "${GREEN}✓${NC}" # not important
else
    echo -e "${RED}✗${NC}" # not important
    exit 1
fi

echo "Backup completed successfully!"
