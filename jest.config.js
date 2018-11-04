module.exports = {
	testEnvironment: 'node',
	testMatch: ['**/?(*.)+(test).ts?(x)'],
	transform: { '^.+\\.(ts)$': 'ts-jest' },
	moduleFileExtensions: ['ts', 'js', 'json', 'node']
}
