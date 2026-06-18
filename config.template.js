// ===================================================================
// ==  config.template.js — gabarit rendu au démarrage (Coolify)    ==
// ===================================================================
// Les ${...} sont remplacés par envsubst au boot du conteneur nginx
// (voir Dockerfile → /docker-entrypoint.d/30-render-config.sh) à partir
// des variables d'environnement définies dans Coolify.

window.APP_CONFIG = {
  SERVICE_ID: ${SERVICE_ID},

  SUPABASE_URL: "${SUPABASE_URL}",
  SUPABASE_ANON_KEY: "${SUPABASE_ANON_KEY}",

  COOKIE_DOMAIN: "${COOKIE_DOMAIN}",

  PORTAL_URL: "${PORTAL_URL}",
  ADMIN_EMAIL: "${ADMIN_EMAIL}",
};
