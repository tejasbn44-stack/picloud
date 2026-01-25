# picloud
Turning my raspberry pi into a personal cloud

## Phase 1
Manual backup using rsync for a specific directory

### Setup
1. laptop running on debian
2. Raspberry Pi running on raspberry pi os 64 bit
3. access to Raspberry Pi using the Raspberry Pi connect remote shell
4. SSH key to make the interaction passwordless
5. tailscale to have private connection between laptop and Pi using private static IPs

### Steps
1. Install rsync on the laptop
2. make a directory for backup on Pi and give chmod 700 permission to it.
3. create backup script and make it an executable
4. run it to perform backup

### Future Enhancements
1. Automated backups
2. host files on web from accessibility
