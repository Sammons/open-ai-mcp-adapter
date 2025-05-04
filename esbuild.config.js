const esbuild = require('esbuild');
const { nodeExternalsPlugin } = require('esbuild-node-externals');

// Main process build configuration
const mainConfig = {
  entryPoints: ['electron/main.ts'],
  bundle: true,
  platform: 'node',
  target: 'node16',
  outfile: 'dist/main.js',
  external: ['electron'],
  plugins: [nodeExternalsPlugin()],
};

// Preload script build configuration
const preloadConfig = {
  entryPoints: ['electron/preload.ts'],
  bundle: true,
  platform: 'node',
  target: 'node16',
  outfile: 'dist/preload.js',
  external: ['electron'],
  plugins: [nodeExternalsPlugin()],
};

// Renderer process build configuration
const rendererConfig = {
  entryPoints: ['src/index.tsx'],
  bundle: true,
  platform: 'browser',
  target: 'es2020',
  outfile: 'dist/renderer.js',
  loader: {
    '.tsx': 'tsx',
    '.ts': 'ts',
    '.js': 'jsx',
  },
  define: {
    'process.env.NODE_ENV': '"development"'
  },
};

// Production build
const buildAll = async () => {
  try {
    // Build main process
    await esbuild.build({
      ...mainConfig,
      minify: true,
      sourcemap: false,
      define: {
        'process.env.NODE_ENV': '"production"'
      },
    });
    
    // Build preload script
    await esbuild.build({
      ...preloadConfig,
      minify: true,
      sourcemap: false,
      define: {
        'process.env.NODE_ENV': '"production"'
      },
    });
    
    // Build renderer process
    await esbuild.build({
      ...rendererConfig,
      minify: true,
      sourcemap: false,
      define: {
        'process.env.NODE_ENV': '"production"'
      },
    });
    
    console.log('⚡ Build complete! ⚡');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
};

// Development build with watch
const devAll = async () => {
  try {
    // Build main process with watch
    const mainContext = await esbuild.context({
      ...mainConfig,
      sourcemap: true,
    });
    
    // Build preload script with watch
    const preloadContext = await esbuild.context({
      ...preloadConfig,
      sourcemap: true,
    });
    
    // Build renderer process with watch
    const rendererContext = await esbuild.context({
      ...rendererConfig,
      sourcemap: true,
    });
    
    await mainContext.watch();
    await preloadContext.watch();
    await rendererContext.watch();
    
    console.log('⚡ Development build started with watch mode ⚡');
  } catch (error) {
    console.error('Development build failed:', error);
    process.exit(1);
  }
};

// Select build mode based on command line arguments
const args = process.argv.slice(2);
if (args.includes('--dev')) {
  devAll();
} else {
  buildAll();
} 