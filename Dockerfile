FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig*.json vite.config.ts index.html ./
COPY public ./public
COPY src ./src
ARG OKOSCOPE_WEB_GIT_COMMIT=unknown
ENV OKOSCOPE_WEB_GIT_COMMIT=$OKOSCOPE_WEB_GIT_COMMIT
RUN npm run build

FROM nginx:1.27-alpine AS runtime
LABEL org.opencontainers.image.title="Okoscope Web UI"
COPY --from=build /app/dist /opt/okoscope/dist
COPY deploy/nginx.conf /etc/nginx/nginx.conf
COPY deploy/configure.sh /opt/okoscope/configure.sh
RUN chmod 0555 /opt/okoscope/configure.sh && chown -R 101:101 /opt/okoscope
USER 101:101
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
ENTRYPOINT ["/opt/okoscope/configure.sh"]
CMD ["nginx", "-g", "daemon off;"]
