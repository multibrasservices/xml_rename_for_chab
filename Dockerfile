# Utiliser une image Nginx légère comme base
FROM nginx:alpine

# Copier le contenu du répertoire local (html, css, js) dans le répertoire web de Nginx
COPY . /usr/share/nginx/html
