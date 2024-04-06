#!/bin/bash
set -e
bash build-docker.sh

docker run \
--read-only \
--tmpfs /tmp \
--tmpfs /run \
--tmpfs /var/log \
-it \
--rm \
--name=openagents-extism-runtime \
openagents-extism-runtime