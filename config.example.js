// ===================================================================
// ==  config.example.js — MODÈLE de configuration runtime          ==
// ===================================================================
// Copier ce fichier en `config.js` (non versionné) et renseigner les valeurs.
//
//   cp config.example.js config.js   (puis éditer config.js)
//
// En PRODUCTION (Coolify), `config.js` est généré au démarrage du conteneur
// à partir de `config.template.js` et des variables d'environnement
// (voir Dockerfile → /docker-entrypoint.d/30-render-config.sh).
//
// Astuce dev local : sur http://localhost laisser COOKIE_DOMAIN à "" pour que
// le cookie de session soit accepté (un Domain=.zoomali.io est rejeté sur localhost).

window.APP_CONFIG = {
  // ID du service dans la table `services` de Supabase (source de vérité des accès)
  SERVICE_ID: 0,

  // Instance Supabase mutualisée ZoomAli.io
  SUPABASE_URL: "https://supabase.admin.multibrasservices.com",
  SUPABASE_ANON_KEY: "<anon_key_publique>",

  // SSO cross-domain : la session du portail est partagée sur tous les *.zoomali.io
  COOKIE_DOMAIN: ".zoomali.io",

  // Retour portail quand l'utilisateur n'a pas accès au service
  PORTAL_URL: "https://saaas.zoomali.io",
  ADMIN_EMAIL: "multibrasservices@gmail.com",
};
