# =============================================================================
# DOCKERFILE — Page de don Grand Amour Festival
# =============================================================================
# Image légère Node.js Alpine (~50 Mo)
# Coolify détecte automatiquement ce Dockerfile et build l'image

FROM node:20-alpine

# Dossier de travail dans le conteneur
WORKDIR /app

# Copier les fichiers de dépendances en premier (optimise le cache Docker)
COPY package.json package-lock.json* ./

# Installer les dépendances (uniquement production)
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

# Copier le reste du code
COPY . .

# Port exposé (doit correspondre à la variable PORT)
EXPOSE 3000

# Commande de démarrage
CMD ["node", "server.js"]
