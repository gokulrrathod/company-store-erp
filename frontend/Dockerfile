FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/nginx.conf.template
# Default matches the Docker Compose service name; Railway overrides this
# to backend.railway.internal:4000 via a service variable.
ENV NGINX_BACKEND_HOST=backend:4000
EXPOSE 80
CMD ["/bin/sh", "-c", "export NGINX_RESOLVER=$(awk '/^nameserver/{print $2; exit}' /etc/resolv.conf) && envsubst '$$NGINX_BACKEND_HOST $$NGINX_RESOLVER' < /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
