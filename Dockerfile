FROM node:18-alpine

# Install rsync and coreutils (for timeout command)
RUN apk add --no-cache rsync openssh-client coreutils

WORKDIR /app

COPY app/package*.json ./
RUN npm install --production

COPY app/ .

RUN mkdir -p /data/notes

EXPOSE 3000

CMD ["node", "server.js"]
