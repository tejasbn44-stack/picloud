FROM node:18-alpine
# Chooses the base image: Node.js v18 on a small Alpine Linux. This provides the node runtime and filesystem the app runs in.

# Install rsync and coreutils (for timeout command)
RUN apk add --no-cache rsync openssh-client coreutils
# Executes a command at build time to install packages via Alpine’s package manager (apk).
# --no-cache prevents storing package index on disk (keeps image smaller).
# Installs rsync, an ssh client (for scp/ssh), and coreutils (provides commands like timeout). These are available inside the image at runtime.

WORKDIR /app
# Sets the working directory for subsequent instructions and the container runtime. If it doesn’t exist, Docker creates it. Relative paths in COPY/RUN refer to this dir.

COPY app/package*.json ./
# Copies package.json and package-lock.json (or similar) from the build context’s app/ folder into the container’s current WORKDIR (/app).
# Copying just package files before code is a layer optimization so npm install can be cached unless package files change.
RUN npm install --production
# Runs npm install at build time to install dependencies. --production installs only dependencies, not devDependencies (smaller final image). This creates node_modules inside the image.

COPY app/ .
# Copies the rest of the application source files from host’s app/ directory into the container’s WORKDIR. need to use .dockerignore to avoid copying node_modules, .git, etc.

RUN mkdir -p /data/notes
# Creates a directory at build time inside the image. Useful if app expects that path to exist. If persistent data is needed, map a volume at runtime to /data/notes.

EXPOSE 3000
# Declares that the container listens on port 3000. This is documentation/metadata only — to actually map ports being used docker run -p or Docker Compose ports.

CMD ["node", "server.js"]
# The default command the container runs at startup (exec form). When the container is run, it executes node server.js. 
