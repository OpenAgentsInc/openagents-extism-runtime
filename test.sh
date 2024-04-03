#!/bin/bash
export PATH="$PATH:$PWD/tmp/binaryen/bin:$PWD/tmp/extismjs/bin" 
export extismjs="$PWD/tmp/extismjs/bin/extism-js"
cd src/test/plugin
node esbuild.cjs
RUST_BACKTRACE=1 $extismjs  bundle/index.js -i ./index.d.ts -o ./plugin.wasm