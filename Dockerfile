# Image Nginx légère
FROM nginx:alpine

# Copier le site statique (config.js local exclu via .dockerignore)
COPY . /usr/share/nginx/html

# Génération de la config runtime au démarrage du conteneur, à partir des
# variables d'environnement Coolify (envsubst est fourni par l'image nginx).
# Les scripts /docker-entrypoint.d/*.sh sont exécutés automatiquement au boot.
RUN cat > /docker-entrypoint.d/30-render-config.sh <<'EOF'
#!/bin/sh
set -e
TPL=/usr/share/nginx/html/config.template.js
OUT=/usr/share/nginx/html/config.js
if [ -f "$TPL" ]; then
  : "${SERVICE_ID:=0}"
  : "${SUPABASE_URL:=}"
  : "${SUPABASE_ANON_KEY:=}"
  : "${COOKIE_DOMAIN:=.zoomali.io}"
  : "${PORTAL_URL:=https://saaas.zoomali.io}"
  : "${ADMIN_EMAIL:=multibrasservices@gmail.com}"
  export SERVICE_ID SUPABASE_URL SUPABASE_ANON_KEY COOKIE_DOMAIN PORTAL_URL ADMIN_EMAIL
  envsubst '${SERVICE_ID} ${SUPABASE_URL} ${SUPABASE_ANON_KEY} ${COOKIE_DOMAIN} ${PORTAL_URL} ${ADMIN_EMAIL}' < "$TPL" > "$OUT"
  echo "[render-config] config.js généré (SERVICE_ID=$SERVICE_ID)"
fi
EOF
RUN chmod +x /docker-entrypoint.d/30-render-config.sh

# Port servi par Nginx (à reporter dans Coolify → Ports Exposes)
EXPOSE 80
