import { defineToolbox } from '@roenlie/package-toolbox/toolbox';


export default defineToolbox(async () => ({
	indexBuilder: {
		entrypoints: [
			{
				path:    './src/index.ts',
				filters: [
					path => [
						'.demo',
						'.test',
						'.bench',
					].every(seg => !path.includes(seg)),
				],
			},
		],
	},
}));
