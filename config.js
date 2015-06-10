System.config({
  "baseURL": "/",
  "transpiler": "babel",
  "babelOptions": {
    "optional": [
      "runtime"
    ]
  },
  "paths": {
    "*": "*.js",
    "github:*": "jspm_packages/github/*.js",
    "npm:*": "jspm_packages/npm/*.js"
  },
  "bundles": {
    "build": [
      "npm:process@0.10.1/browser",
      "src/js/selectors",
      "npm:process@0.10.1",
      "github:jspm/nodelibs-process@0.1.1/index",
      "github:jspm/nodelibs-process@0.1.1",
      "npm:lodash@3.8.0/index",
      "npm:lodash@3.8.0",
      "src/js/helpers",
      "src/app"
    ]
  }
});

System.config({
  "map": {
    "babel": "npm:babel-core@5.3.3",
    "babel-runtime": "npm:babel-runtime@5.3.3",
    "core-js": "npm:core-js@0.9.8",
    "lodash": "npm:lodash@3.8.0",
    "github:jspm/nodelibs-process@0.1.1": {
      "process": "npm:process@0.10.1"
    },
    "npm:core-js@0.9.8": {
      "process": "github:jspm/nodelibs-process@0.1.1"
    },
    "npm:lodash@3.8.0": {
      "process": "github:jspm/nodelibs-process@0.1.1"
    }
  }
});

