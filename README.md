# XML Rename for CHAB

## Contexte

Cet outil a été développé pour répondre à une problématique spécifique rencontrée avec le logiciel comptable GADM (Gestion Comptable et Financière) du Groupement des Mousquetaires.

Certaines banques exigent que les fichiers de paiement XML téléversés au cours d'une même journée aient un identifiant de message (`MsgId`) unique pour chaque transaction. 
Le logiciel GADM ne garantit pas cette unicité, ce qui peut entraîner le rejet des fichiers de paiement.

## Solution

Cette application web simple permet de modifier les fichiers XML exportés depuis GADM avant de les téléverser à la banque.

Elle effectue les opérations suivantes :

1.  **Lecture des fichiers XML** : Chargez un ou plusieurs fichiers XML (ou `.txt` contenant du XML).
2.  **Modification du `MsgId`** : Ajoute un compteur unique à chaque balise `<MsgId>` pour garantir son unicité sur l'ensemble des fichiers traités.
3.  **Calcul de la somme de contrôle** : Affiche la somme des montants (`CtrlSum`) de tous les fichiers pour vérification.
4.  **Téléchargement** : Permet de télécharger une archive `.zip` contenant tous les fichiers modifiés, prêts à être téléversés.

## Architecture

Le traitement des fichiers est effectué **100 % côté navigateur** (`DOMParser` / `XMLSerializer` natifs, dans `app.js`). Les fichiers de paiement ne sont **jamais envoyés sur le réseau** : ils sont lus, modifiés et re-générés en mémoire sur le poste de l'utilisateur — plus simple, plus robuste (aucune dépendance serveur) et plus confidentiel.

Supabase n'est utilisé que pour l'**authentification** (SSO `.zoomali.io`) et le **contrôle d'accès** (table `user_services`, équivalent vanilla de `ServiceGate`). Il n'y a **pas d'Edge Function** : une version antérieure déléguait le traitement à une fonction `process-xml`, supprimée car inutile.

## Déploiement

L'application est conteneurisée (`Dockerfile` nginx) et déployée sur le **VPS OVH via Coolify**, accessible à l'adresse :

[https://xml-rename.zoomali.io](https://xml-rename.zoomali.io)

Le déploiement est automatique : tout `push` sur `main` déclenche un rebuild Coolify. La configuration runtime (`config.js` : `SERVICE_ID`, clés Supabase) est injectée au démarrage du conteneur depuis les variables Coolify et n'est jamais versionnée.

La config Nginx (dans le `Dockerfile`) impose `Cache-Control: no-cache` sur les fichiers `.html`/`.js`/`.css` : le navigateur revalide via ETag à chaque chargement (`304` si inchangé, nouvelle version sinon), ce qui garantit que les utilisateurs reçoivent toujours la dernière version après un déploiement, sans cache périmé.

## Licence

Ce projet est distribué sous la licence MIT. Voir le fichier `LICENSE` pour plus de détails.

Copyright (c) 2025 MultiBrasServices