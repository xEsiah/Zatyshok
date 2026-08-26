FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app

ARG USER_ID=1001
ARG GROUP_ID=1001

RUN apk add --no-cache shadow && \
    usermod -u ${USER_ID} node && \
    groupmod -g ${GROUP_ID} node && \
    apk del shadow

RUN mkdir -p uploads/profiles && chown -R node:node /app

USER node

COPY --chown=node:node package*.json ./
RUN npm ci --only=production

COPY --chown=node:node --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/index.js"]