# --- Build-vaihe ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# --- Serve-vaihe ---
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# nginx korvaa /etc/nginx/templates/*.template -tiedostojen ympäristömuuttujat
# käynnistyksessä ja kirjoittaa tuloksen /etc/nginx/conf.d/:hen.
COPY nginx.conf /etc/nginx/templates/default.conf.template
# Railway antaa portin $PORT-muuttujassa; oletus paikallisesti 80.
ENV PORT=80
# Korvaa templatessa VAIN ${PORT}, jotta nginx-omat muuttujat ($uri ym.) säilyvät.
ENV NGINX_ENVSUBST_FILTER='PORT'
CMD ["nginx", "-g", "daemon off;"]