import eslintConfig from '@roenlie/eslint-config';


export default [
	...eslintConfig.base,
	{
		rules: {
			'@stylistic/max-len': [
				'warn',
				{
					code:                   155,
					ignoreStrings:          true,
					ignoreTemplateLiterals: true,
					ignoreRegExpLiterals:   true,
					ignoreComments:         true,
					ignoreUrls:             true,
					// This allows imports to be longer
					ignorePattern:          'import .*?;',
				},
			],
		},
	},
];
