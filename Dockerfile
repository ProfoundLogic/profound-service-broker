# Use the official Node.js image as the base image
FROM node:20 AS builder

WORKDIR /usr/src/app
COPY package.json yarn.lock tsconfig.json ./
RUN yarn install
COPY src ./src
RUN npm run build
RUN mkdir -p dist/assets && cp -r src/assets/* dist/assets/
RUN mkdir -p dist/certs && cp -r src/certs/* dist/certs/

FROM node:20

WORKDIR /app
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist

ENV NODE_ENV=production

EXPOSE 3001

ENTRYPOINT [ "node", "dist/app.js" ]