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

## Déploiement

L'application est hébergée et accessible via GitHub Pages à l'adresse suivante :

[https://multibrasservices.github.io/xml_rename_for_chab/](https://multibrasservices.github.io/xml_rename_for_chab/)

## Licence

Ce projet est distribué sous la licence MIT. Voir le fichier `LICENSE` pour plus de détails.

Copyright (c) 2025 MultiBrasServices