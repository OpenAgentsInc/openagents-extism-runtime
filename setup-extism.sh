#!/bin/bash
set -e
mkdir -p tmp
cd tmp
export _sudo=""

if [ ! -d binaryen ]; then
  
  OS=''
  case `uname` in
    Darwin*)  OS="macos" ;;
    Linux*)   OS="linux" ;;
    *)        echo "unknown os: $OSTYPE" && exit 1 ;;
  esac

  ARCH=`uname -m`
  case "$ARCH" in
    ix86*|x86_64*)    ARCH="x86_64" ;;
    arm64*|aarch64*)  ARCH="aarch64" ;;
    *)                echo "unknown arch: $ARCH" && exit 1 ;;
  esac

  export TAG="v1.0.0-rc7"
  export BINARYEN_TAG="version_116"

  curl -L -O "https://github.com/extism/js-pdk/releases/download/$TAG/extism-js-$ARCH-$OS-$TAG.gz"

  mkdir -p extismjs/bin
  
  gunzip extism-js*.gz
  mv extism-js-* extismjs/bin/extism-js
  chmod +x extismjs/bin/extism-js

  echo "Installing wasm-merge..."

  # binaryen use arm64 instead where as extism-js uses aarch64 for release file naming
  case "$ARCH" in
    aarch64*)  ARCH="arm64" ;;
  esac

  # matches the case where the user installs extism-pdk in a Linux-based Docker image running on mac m1
  # binaryen didn't have arm64 release file for linux 
  if [ $ARCH = "arm64" ] && [ $OS = "linux" ]; then
    ARCH="x86_64"
  fi

  curl -L -O "https://github.com/WebAssembly/binaryen/releases/download/$BINARYEN_TAG/binaryen-$BINARYEN_TAG-$ARCH-$OS.tar.gz"
  tar xf "binaryen-$BINARYEN_TAG-$ARCH-$OS.tar.gz"
  mv "binaryen-$BINARYEN_TAG"/ binaryen/
 
fi

if [ ! -f extism-install ]; then
  curl -s https://get.extism.org/cli -o extism-install
  chmod +x extism-install
  mkdir -p extism/bin
  ./extism-install -o $PWD/extism/bin -y
fi