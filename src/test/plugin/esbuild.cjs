const esbuild = require('esbuild');
const { NodeModulesPolyfillPlugin } = require('@esbuild-plugins/node-modules-polyfill')


esbuild
    .build({
        entryPoints: ['index.js'],
        outdir: './bundle',
        bundle: true,
        sourcemap: true,
        plugins: [NodeModulesPolyfillPlugin()],
        minify: false,
        format: 'cjs',
        target: ['es2020'],
        define: { 'process.env.NODE_ENV': '"production"' }
    })