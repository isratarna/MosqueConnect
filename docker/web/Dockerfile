FROM node:22-alpine

WORKDIR /workspace

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json

RUN npm ci --workspace=apps/web --include-workspace-root

COPY apps/web apps/web

EXPOSE 5173

CMD ["npm", "run", "dev:web", "--", "--host", "0.0.0.0"]
