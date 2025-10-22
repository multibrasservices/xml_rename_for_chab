@echo off
rem Script pour automatiser les commandes git add, commit, et push

echo.
echo =================================================
echo    Assistant de Commit et Push pour GitHub
echo =================================================
echo.

rem Ajoute tous les changements au staging
echo --- Ajout de tous les fichiers en cours... ---
git add .
echo.

rem Demande a l'utilisateur d'entrer un message de commit
set /p commit_message="Entrez le message de commit : "

rem Verifie si le message est vide
if "%commit_message%"=="" (
    echo.
    echo ERREUR : Le message de commit ne peut pas etre vide.
    echo Annulation de l'operation.
    goto end
)

rem Execute le commit
echo.
echo --- Commit en cours... ---
git commit -m "%commit_message%"
echo.

rem Pousse les changements vers le depot distant
echo --- Push vers origin main... ---
git push origin main
echo.

:end
echo =================================================
echo                 OPERATION TERMINEE
echo =================================================
echo.
pause
