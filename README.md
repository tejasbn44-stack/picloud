# picloud
Turning my raspberry pi into a personal cloud

## Phase 2
Website for viewing, editing, downloading and syncing of backed up files on Pi

### Setup
1. laptop running on debian
2. Raspberry Pi running on raspberry pi os 64 bit
3. access to Raspberry Pi using SSH
4. SSH key to make the interaction passwordless between laptop to Pi and Pi to laptop. (both is required)
5. tailscale to have private connection between laptop and Pi using private static IPs along with other devices that need to access the website like your phone.
6. Docker installed on Pi

### Steps
1. Install rsync on the laptop
2. make a directory for backup on Pi and give chmod 700 permission to it.
3. create backup script and make it an executable
4. run it to perform backup
5. create a folder in Pi and copy everything inside the folder picloud-web-editor in it.
6. Update the Dockerfile and docker-compose-yml file with the correct details
7. run "docker compose up -d" to build and run
8. test the health of the website by running "curl http://localhost:3000/api/health" on pi
9. go to "https://your_pi_ip:3000" to access you website.

### Future Enhancements
1. Automated backups
2. Cleaner website
