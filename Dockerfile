# Image Nginx légère
FROM nginx:alpine

# Copier le site statique (config.js local exclu via .dockerignore)
COPY . /usr/share/nginx/html

# Config Nginx : revalidation systematique des fichiers HTML/JS/CSS (et config.js).
# Sans cela, Nginx ne renvoie aucun Cache-Control et les navigateurs servent une
# version perimee de app.js apres un deploiement. Avec "no-cache", le navigateur
# revalide via ETag : 304 si inchange (zero surcout), 200 + nouvelle version sinon.
RUN cat > /etc/nginx/conf.d/default.conf <<'EOF'
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location ~* \.(?:html|js|css)$ {
        add_header Cache-Control "no-cache" always;
    }

    location / {
        try_files $uri $uri/ =404;
    }
}
EOF

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
