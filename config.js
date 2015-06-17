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
  }
});

System.config({
  "map": {
    "babel": "npm:babel-core@5.3.3",
    "babel-runtime": "npm:babel-runtime@5.3.3",
    "core-js": "npm:core-js@0.9.8",
    "prism": "github:PrismJS/prism@1.0.0",
    "github:jspm/nodelibs-process@0.1.1": {
      "process": "npm:process@0.10.1"
    },
    "npm:core-js@0.9.8": {
      "process": "github:jspm/nodelibs-process@0.1.1"
    }
  }
});

