# Builder
FROM node:alpine as builder

ADD . /app
WORKDIR /app
RUN  apk add --no-cache bash curl gzip && \
npm i && npm run build

# Runner
FROM node:alpine
RUN mkdir -p /app
WORKDIR /app
COPY --from=builder /app/build /app/build
COPY package.json /app
COPY package-lock.json /app
RUN \
npm i --production && \
chown 1000:1000 -Rf /app 

ENV NOSTR_CONNECT_GRPC_BINDING_ADDRESS="127.0.0.1"
ENV NOSTR_CONNECT_GRPC_BINDING_PORT=5000

USER 1000
CMD ["npm","run", "start"]
