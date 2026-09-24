FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app

RUN apk upgrade --no-cache

ARG USER_ID=1001
ARG GROUP_ID=1001

RUN apk add --no-cache shadow && \
    usermod -u ${USER_ID} node && \
    groupmod -g ${GROUP_ID} node && \
    apk del shadow

RUN mkdir -p uploads/profiles uploads/audio && chown -R node:node /app

USER node

COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev

COPY --chown=node:node --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/index.js"]