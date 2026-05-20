FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/

# Le dossier data/ contiendra state.json (état de polling persisté)
VOLUME ["/app/data"]

CMD ["node", "src/index.js"]
