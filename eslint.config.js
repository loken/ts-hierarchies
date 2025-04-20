import eslintConfig from '@roenlie/eslint-config';


export default [
	...eslintConfig.base,
	{
		rules: {
			'@typescript-eslint/consistent-generic-constructors': [ 'warn', 'constructor' ],
			'@stylistic/comma-dangle':                            [ 'warn', 'always-multiline' ],
			'@stylistic/max-len':                                 [
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
