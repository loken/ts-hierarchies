import { libConfig } from '@roenlie/package-toolbox/vite-utils';
import { defineConfig } from 'vite';


export default defineConfig(libConfig({
	esbuild: {
		minifyIdentifiers: false,
	},
	build: {
		outDir: 'dist/lib/',
	},
}));
