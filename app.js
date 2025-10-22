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

// Configuration Supabase
const SUPABASE_URL = "https://supabase.admin.multibrasservices.com"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzQ5NzY1NjAwLCJleHAiOjE5MDc1MzIwMDB9.9ddhM7Tsjainc8QOYmhtz9VQqXBZgRUpPFUeOa-ApjE";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
async function checkSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const user = session?.user;
    updateUI(user);
}
function updateUI(user) {
    if (user) {
        authContainer.classList.add('hidden');
        servicesContainer.classList.remove('hidden');
        logoutButton.classList.remove('hidden');
    } else {
        authContainer.classList.remove('hidden');
        servicesContainer.classList.add('hidden');
        logoutButton.classList.add('hidden');
    }
}

// -------------------------------------------------------------------
// ÉTAPE 3 : MICRO-SERVICE - PROCESSEUR DE FICHIERS XML
// -------------------------------------------------------------------

async function handleFileProcessing() {
    const files = fileInput.files;
    if (files.length === 0) {
        showXmlError("Veuillez sélectionner au moins un fichier.");
        return;
    }

    // Réinitialisation
    modifiedFiles = [];
    tableData = []; // Vider les données précédentes
    showXmlError('');
    resultsContainer.classList.add('hidden');

    let fileCounter = 1;
    let totalCtrlSum = 0;

    for (const file of files) {
        try {
            const fileContent = await file.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(fileContent, "application/xml");

            if (xmlDoc.querySelector('parsererror')) throw new Error(`Fichier malformé : ${file.name}`);

            const ctrlSumNode = xmlDoc.querySelector('CtrlSum');
            const reqdExctnDtNode = xmlDoc.querySelector('ReqdExctnDt'); // NOUVEAU : Extraction de la date

            if (!ctrlSumNode) {
                console.warn(`Balise <CtrlSum> non trouvée dans ${file.name}. Fichier ignoré.`);
                continue;
            }
            
            const ctrlSumValue = parseFloat(ctrlSumNode.textContent);
            const execDateValue = reqdExctnDtNode ? reqdExctnDtNode.textContent : ''; // Gère si la balise est absente
            totalCtrlSum += ctrlSumValue;

            // NOUVEAU : On stocke les données dans notre tableau au lieu de générer le HTML directement
            tableData.push({
                ctrlSum: ctrlSumValue,
                execDate: execDateValue,
                fileCounter: fileCounter,
                fileName: file.name
            });

            // La modification du fichier reste la même
            let msgIdCounter = fileCounter;
            const modifiedContent = fileContent.replace(/<MsgId>(.*?)<\/MsgId>/g, (match, originalMsgId) => {
                const newMsgId = `${originalMsgId.trim()} ${msgIdCounter}`;
                msgIdCounter++;
                return `<MsgId>${newMsgId}</MsgId>`;
            });
            modifiedFiles.push({ name: file.name, content: modifiedContent });
            fileCounter++;
        } catch (error) {
            showXmlError(`Erreur avec le fichier ${file.name}: ${error.message}`);
            return;
        }
    }

    if (tableData.length > 0) {
        const totalSumElement = document.getElementById('total-sum');
        totalSumElement.textContent = `Total des opérations : ${totalCtrlSum.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`;
        
        renderTable(); // NOUVEAU : On appelle la fonction d'affichage
        resultsContainer.classList.remove('hidden');
    }
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

// NOUVEAU : Écouteur d'événement pour le tri (délégation d'événement)
resultsTable.querySelector('thead').addEventListener('click', (event) => {
    const header = event.target.closest('th');
    if (header && header.dataset.column) {
        sortTable(header.dataset.column);
    }
});

document.addEventListener('DOMContentLoaded', checkSession);