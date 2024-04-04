#!/bin/bash
export PATH="$PATH:$PWD/tmp/binaryen/bin:$PWD/tmp/extismjs/bin" 
export extismjs="$PWD/tmp/extismjs/bin/extism-js"
cd src/test/plugin
node esbuild.cjs
RUST_BACKTRACE=1 $extismjs  bundle/index.js -i ./index.d.ts -o ./plugin.wasm
cd ../../..
npm run build
cp -Rvf src/test/plugin/ build/js/test/
cd build/js/test/
node --experimental-specifier-resolution=node  Test.js
