#!/bin/bash
# eg. bash inj.sh /PROJ/DEV/openagents-server-config/mvp-pool/.env
if [ -z "$1" ]; then
    echo "Usage: source inj.sh <server .env file>"
    return
fi
source $1
export POOL_ADDRESS=${POOL_ADDRESS}
export POOL_PORT=${POOL_PORT}
export POOL_SSL=${POOL_SSL}
export EXTISM_RUNTIME_SECRETS_PROVIDERS=https://openagents.com/api/v1/plugins/secrets?secret=${EXTISM_RUNTIME_PLUGINS_SECRET}
export PLUGINS_REPO=https://openagents.com/api/v1/plugins
export NODE_TOKEN=${EXTISM_RUNTIME_NODE_TOKEN}
export OPENOBSERVE_ENDPOINT=${OPENOBSERVE_ENDPOINT}
export OPENOBSERVE_ORG=${OPENOBSERVE_ORG}
export OPENOBSERVE_STREAM=${OPENOBSERVE_STREAM}
export OPENOBSERVE_USERNAME=${OPENOBSERVE_USERNAME}
export OPENOBSERVE_PASSWORD=${OPENOBSERVE_PASSWORD}
export OPENOBSERVE_BATCHSIZE=${OPENOBSERVE_BATCHSIZE}
export OPENOBSERVE_FLUSH_INTERVAL=${OPENOBSERVE_FLUSH_INTERVAL}
export OPENOBSERVE_LOG_LEVEL=${OPENOBSERVE_LOG_LEVEL}
export LOG_LEVEL=finest
npm run debug