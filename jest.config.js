/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  transform: {},
<<<<<<< HEAD
=======
  extensionsToTreatAsEsm: ['.js'],
>>>>>>> origin/main
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};

export default config; 