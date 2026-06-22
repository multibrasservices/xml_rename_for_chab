// ===================================================================
// ==    FICHIER JAVASCRIPT PRINCIPAL : app.js (Version Finale)     ==
// ===================================================================
// "Namespaces are one honking great idea -- let's do more of those!"

// -------------------------------------------------------------------
// ÉTAPE 1 : CONSTANTES ET INITIALISATION
// -------------------------------------------------------------------

// ... (les constantes du DOM restent les mêmes)
const authContainer = document.getElementById('auth-container');
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const errorNotification = document.getElementById('error-notification');
const servicesContainer = document.getElementById('services-container');
const logoutButton = document.getElementById('logout-button');
const fileInput = document.getElementById('file-input');
const processButton = document.getElementById('process-button');
const resultsContainer = document.getElementById('results-container');
const resultsTable = document.getElementById('results-table'); // Référence à la table entière
const resultsTableBody = resultsTable.querySelector('tbody');
const downloadZipButton = document.getElementById('download-zip-button');
const xmlErrorNotification = document.getElementById('xml-error-notification');
const accessDenied = document.getElementById('access-denied');
const adminEmailLink = document.getElementById('admin-email-link');
const backToPortalButton = document.getElementById('back-to-portal');

// Configuration runtime injectée via config.js (window.APP_CONFIG)
const APP_CONFIG = window.APP_CONFIG || {};
const SUPABASE_URL = APP_CONFIG.SUPABASE_URL;
const SUPABASE_ANON_KEY = APP_CONFIG.SUPABASE_ANON_KEY;
const SERVICE_ID = APP_CONFIG.SERVICE_ID;
const PORTAL_URL = APP_CONFIG.PORTAL_URL || "https://saaas.zoomali.io";
const ADMIN_EMAIL = APP_CONFIG.ADMIN_EMAIL || "multibrasservices@gmail.com";
const COOKIE_DOMAIN = APP_CONFIG.COOKIE_DOMAIN || "";

// Cookie storage cross-domain (.zoomali.io) : partage la session SSO entre tous
// les sous-domaines. Un utilisateur déjà connecté sur le portail arrive connecté ici.
const cookieStorage = {
    getItem: (key) => {
        const match = document.cookie.match(
            new RegExp('(^| )' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]+)')
        );
        return match ? decodeURIComponent(match[2]) : null;
    },
    setItem: (key, value) => {
        const domain = COOKIE_DOMAIN ? `; Domain=${COOKIE_DOMAIN}` : '';
        const secure = window.location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `${key}=${encodeURIComponent(value)}; Path=/; SameSite=Lax${domain}${secure}; Max-Age=31536000`;
    },
    removeItem: (key) => {
        const domain = COOKIE_DOMAIN ? `; Domain=${COOKIE_DOMAIN}` : '';
        document.cookie = `${key}=; Path=/; SameSite=Lax${domain}; Max-Age=0`;
    },
};

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { storage: cookieStorage },
});

// NOUVEAU : Variables d'état pour les données et le tri
let modifiedFiles = [];
let tableData = []; // Stocke les données extraites pour le tri
let currentSort = { column: null, direction: 'asc' };


// -------------------------------------------------------------------
// ÉTAPE 2 : GESTION DE LA SESSION UTILISATEUR (Inchangé)
// -------------------------------------------------------------------
async function handleLogin(event) { /* ... */ }
async function handleLogout() { /* ... */ }
async function checkSession() { /* ... */ }
function updateUI(user) { /* ... */ }
// (Le code de ces fonctions est identique à la version précédente)
async function handleLogin(event) {
    event.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
        errorNotification.textContent = "Erreur d'authentification : " + error.message;
    } else {
        errorNotification.textContent = '';
        loginForm.reset();
        checkSession();
    }
}
async function handleLogout() {
    await supabaseClient.auth.signOut();
    checkSession();
}
// Guard d'accès (équivalent vanilla du ServiceGate @multibrasservices/auth).
// La RLS du portail ne retourne la ligne user_services que si l'utilisateur est
// rattaché à ce service. Absente (sans erreur réseau) = pas d'accès.
async function checkAccess(userId) {
    try {
        const { data, error } = await supabaseClient
            .from('user_services')
            .select('service_id')
            .eq('user_id', userId)
            .eq('service_id', SERVICE_ID)
            .maybeSingle();
        if (error) {
            // Erreur réseau/serveur : fail-open. La RLS sur les données reste la vraie barrière.
            console.warn('checkAccess: erreur réseau, fail-open —', error.message);
            return true;
        }
        return data !== null;
    } catch (e) {
        console.warn('checkAccess: exception, fail-open —', e.message);
        return true;
    }
}

async function checkSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const user = session?.user;
    if (!user) {
        updateUI(false, false);
        return;
    }
    const granted = await checkAccess(user.id);
    updateUI(true, granted);
}

function updateUI(isAuthenticated, accessGranted) {
    if (!isAuthenticated) {
        // Non connecté : page de login uniquement
        authContainer.classList.remove('hidden');
        servicesContainer.classList.add('hidden');
        accessDenied.classList.add('hidden');
        logoutButton.classList.add('hidden');
        return;
    }
    // Connecté : la page de login disparaît dans tous les cas
    authContainer.classList.add('hidden');
    logoutButton.classList.remove('hidden');
    if (accessGranted) {
        servicesContainer.classList.remove('hidden');
        accessDenied.classList.add('hidden');
    } else {
        servicesContainer.classList.add('hidden');
        accessDenied.classList.remove('hidden');
    }
}

// -------------------------------------------------------------------
// ÉTAPE 3 : MICRO-SERVICE - PROCESSEUR DE FICHIERS XML
// -------------------------------------------------------------------

// Traitement 100% local (navigateur) via DOMParser/XMLSerializer natifs.
// Remplace l'ancienne Edge Function process-xml : aucune donnée ne quitte le
// poste (fichiers SEPA traités en mémoire), donc plus de dépendance serveur ni
// de point de panne. "Simple is better than complex."
function processXmlContent(fileContent) {
    if (!fileContent) {
        throw new Error("Fichier vide : contenu XML requis.");
    }

    const xmlDoc = new DOMParser().parseFromString(fileContent, "application/xml");

    if (xmlDoc.querySelector('parsererror')) {
        throw new Error("Fichier XML mal formé.");
    }

    const ctrlSumNode = xmlDoc.querySelector('CtrlSum');
    if (!ctrlSumNode) {
        throw new Error("Balise <CtrlSum> introuvable dans le fichier XML.");
    }

    const ctrlSum = parseFloat(ctrlSumNode.textContent || '0');
    const reqdExctnDtNode = xmlDoc.querySelector('ReqdExctnDt');
    const execDate = reqdExctnDtNode ? reqdExctnDtNode.textContent : '';

    // Numérotation des MsgId — compteur réinitialisé à chaque fichier.
    let msgIdCounter = 1;
    xmlDoc.querySelectorAll('MsgId').forEach(node => {
        const originalMsgId = node.textContent || '';
        node.textContent = `${originalMsgId.trim()} ${msgIdCounter}`;
        msgIdCounter++;
    });

    const modifiedContent = new XMLSerializer().serializeToString(xmlDoc);

    return { modifiedContent, ctrlSum, execDate };
}

async function handleFileProcessing() {
    const files = fileInput.files;
    if (files.length === 0) {
        showXmlError("Veuillez sélectionner au moins un fichier.");
        return;
    }

    // Réinitialisation
    modifiedFiles = [];
    tableData = [];
    showXmlError('');
    resultsContainer.classList.add('hidden');
    processButton.disabled = true; // Désactiver le bouton pendant le traitement
    processButton.textContent = 'Traitement en cours...';

    let fileCounter = 1;
    let totalCtrlSum = 0;

    for (const file of files) {
        try {
            const fileContent = await file.text();

            // Traitement local (navigateur), plus d'appel réseau.
            const { modifiedContent, ctrlSum, execDate } = processXmlContent(fileContent);

            totalCtrlSum += ctrlSum;

            // Stockage des données pour l'affichage et le téléchargement
            tableData.push({
                ctrlSum: ctrlSum,
                execDate: execDate,
                fileCounter: fileCounter,
                fileName: file.name
            });

            modifiedFiles.push({ name: file.name, content: modifiedContent });
            fileCounter++;

        } catch (error) {
            showXmlError(`Erreur avec le fichier ${file.name}: ${error.message}`);
            // Réactiver le bouton en cas d'erreur
            processButton.disabled = false;
            processButton.textContent = 'Traiter les Fichiers';
            return;
        }
    }

    // Affichage des résultats si tout s'est bien passé
    if (tableData.length > 0) {
        const totalSumElement = document.getElementById('total-sum');
        totalSumElement.textContent = `Total des opérations : ${totalCtrlSum.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`;
        
        renderTable();
        resultsContainer.classList.remove('hidden');
    }

    // Réactiver le bouton à la fin du traitement
    processButton.disabled = false;
    processButton.textContent = 'Traiter les Fichiers';
}

// NOUVEAU : Fonction dédiée à l'affichage du tableau
function renderTable() {
    resultsTableBody.innerHTML = ''; // On vide le tableau
    tableData.forEach(rowData => {
        const row = resultsTableBody.insertRow();
        row.innerHTML = `
            <td>${rowData.ctrlSum.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>
            <td>${rowData.execDate ? new Date(rowData.execDate).toLocaleDateString('fr-FR') : 'N/A'}</td>
            <td>${rowData.fileCounter}</td>
            <td>${rowData.fileName}</td>
        `;
    });
}

// NOUVEAU : Fonction de tri
function sortTable(column) {
    const isAsc = currentSort.column === column && currentSort.direction === 'asc';
    currentSort.direction = isAsc ? 'desc' : 'asc';
    currentSort.column = column;

    tableData.sort((a, b) => {
        const valA = a[column];
        const valB = b[column];
        let comparison = 0;

        if (typeof valA === 'number' && typeof valB === 'number') {
            comparison = valA - valB;
        } else {
            comparison = String(valA).localeCompare(String(valB));
        }

        return currentSort.direction === 'asc' ? comparison : -comparison;
    });

    // Mettre à jour les indicateurs visuels
    document.querySelectorAll('#results-table th[data-column]').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        if (th.dataset.column === column) {
            th.classList.add(`sort-${currentSort.direction}`);
        }
    });

    renderTable(); // Ré-afficher le tableau trié
}

function downloadModifiedFilesAsZip() { /* ... */ }
function showXmlError(message) { /* ... */ }
// (Le code de ces fonctions est identique à la version précédente)
function downloadModifiedFilesAsZip() {
    const zip = new JSZip();
    modifiedFiles.forEach(file => {
        zip.file(file.name, file.content);
    });
    zip.generateAsync({ type: "blob" }).then(content => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = "fichiers_modifies.zip";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}
function showXmlError(message) {
    xmlErrorNotification.textContent = message;
}

// -------------------------------------------------------------------
// ÉTAPE 4 : POINT D'ENTRÉE ET ÉCOUTEURS D'ÉVÉNEMENTS
// -------------------------------------------------------------------

loginForm.addEventListener('submit', handleLogin);
logoutButton.addEventListener('click', handleLogout);
processButton.addEventListener('click', handleFileProcessing);
downloadZipButton.addEventListener('click', downloadModifiedFilesAsZip);

// Popup accès non autorisé : lien admin + retour portail
adminEmailLink.textContent = ADMIN_EMAIL;
adminEmailLink.href = `mailto:${ADMIN_EMAIL}`;
backToPortalButton.addEventListener('click', () => { window.location.href = PORTAL_URL; });

// NOUVEAU : Écouteur d'événement pour le tri (délégation d'événement)
resultsTable.querySelector('thead').addEventListener('click', (event) => {
    const header = event.target.closest('th');
    if (header && header.dataset.column) {
        sortTable(header.dataset.column);
    }
});

document.addEventListener('DOMContentLoaded', checkSession);