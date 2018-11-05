module.exports = config => {
  config.set({
    frameworks: ['jasmine', 'karma-typescript'],

    files: [{ pattern: 'src/**/*.ts' }],

    preprocessors: {
      'src/**/*.ts': ['karma-typescript']
    },

    reporters: ['dots', 'karma-typescript'],

    karmaTypescriptConfig: {
      tsconfig: './tsconfig.json'
    },

    browsers: ['ChromeHeadless'],

    singleRun: !!process.env.RUN_ONCE
  })
}
