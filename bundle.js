(function(global) {

  var defined = {};

  // indexOf polyfill for IE8
  var indexOf = Array.prototype.indexOf || function(item) {
    for (var i = 0, l = this.length; i < l; i++)
      if (this[i] === item)
        return i;
    return -1;
  }

  function dedupe(deps) {
    var newDeps = [];
    for (var i = 0, l = deps.length; i < l; i++)
      if (indexOf.call(newDeps, deps[i]) == -1)
        newDeps.push(deps[i])
    return newDeps;
  }

  function register(name, deps, declare, execute) {
    if (typeof name != 'string')
      throw "System.register provided no module name";

    var entry;

    // dynamic
    if (typeof declare == 'boolean') {
      entry = {
        declarative: false,
        deps: deps,
        execute: execute,
        executingRequire: declare
      };
    }
    else {
      // ES6 declarative
      entry = {
        declarative: true,
        deps: deps,
        declare: declare
      };
    }

    entry.name = name;

    // we never overwrite an existing define
    if (!(name in defined))
      defined[name] = entry; 

    entry.deps = dedupe(entry.deps);

    // we have to normalize dependencies
    // (assume dependencies are normalized for now)
    // entry.normalizedDeps = entry.deps.map(normalize);
    entry.normalizedDeps = entry.deps;
  }

  function buildGroups(entry, groups) {
    groups[entry.groupIndex] = groups[entry.groupIndex] || [];

    if (indexOf.call(groups[entry.groupIndex], entry) != -1)
      return;

    groups[entry.groupIndex].push(entry);

    for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
      var depName = entry.normalizedDeps[i];
      var depEntry = defined[depName];

      // not in the registry means already linked / ES6
      if (!depEntry || depEntry.evaluated)
        continue;

      // now we know the entry is in our unlinked linkage group
      var depGroupIndex = entry.groupIndex + (depEntry.declarative != entry.declarative);

      // the group index of an entry is always the maximum
      if (depEntry.groupIndex === undefined || depEntry.groupIndex < depGroupIndex) {

        // if already in a group, remove from the old group
        if (depEntry.groupIndex !== undefined) {
          groups[depEntry.groupIndex].splice(indexOf.call(groups[depEntry.groupIndex], depEntry), 1);

          // if the old group is empty, then we have a mixed depndency cycle
          if (groups[depEntry.groupIndex].length == 0)
            throw new TypeError("Mixed dependency cycle detected");
        }

        depEntry.groupIndex = depGroupIndex;
      }

      buildGroups(depEntry, groups);
    }
  }

  function link(name) {
    var startEntry = defined[name];

    startEntry.groupIndex = 0;

    var groups = [];

    buildGroups(startEntry, groups);

    var curGroupDeclarative = !!startEntry.declarative == groups.length % 2;
    for (var i = groups.length - 1; i >= 0; i--) {
      var group = groups[i];
      for (var j = 0; j < group.length; j++) {
        var entry = group[j];

        // link each group
        if (curGroupDeclarative)
          linkDeclarativeModule(entry);
        else
          linkDynamicModule(entry);
      }
      curGroupDeclarative = !curGroupDeclarative; 
    }
  }

  // module binding records
  var moduleRecords = {};
  function getOrCreateModuleRecord(name) {
    return moduleRecords[name] || (moduleRecords[name] = {
      name: name,
      dependencies: [],
      exports: {}, // start from an empty module and extend
      importers: []
    })
  }

  function linkDeclarativeModule(entry) {
    // only link if already not already started linking (stops at circular)
    if (entry.module)
      return;

    var module = entry.module = getOrCreateModuleRecord(entry.name);
    var exports = entry.module.exports;

    var declaration = entry.declare.call(global, function(name, value) {
      module.locked = true;
      exports[name] = value;

      for (var i = 0, l = module.importers.length; i < l; i++) {
        var importerModule = module.importers[i];
        if (!importerModule.locked) {
          var importerIndex = indexOf.call(importerModule.dependencies, module);
          importerModule.setters[importerIndex](exports);
        }
      }

      module.locked = false;
      return value;
    });

    module.setters = declaration.setters;
    module.execute = declaration.execute;

    if (!module.setters || !module.execute)
      throw new TypeError("Invalid System.register form for " + entry.name);

    // now link all the module dependencies
    for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
      var depName = entry.normalizedDeps[i];
      var depEntry = defined[depName];
      var depModule = moduleRecords[depName];

      // work out how to set depExports based on scenarios...
      var depExports;

      if (depModule) {
        depExports = depModule.exports;
      }
      else if (depEntry && !depEntry.declarative) {
        if (depEntry.module.exports && depEntry.module.exports.__esModule)
          depExports = depEntry.module.exports;
        else
          depExports = { 'default': depEntry.module.exports, __useDefault: true };
      }
      // in the module registry
      else if (!depEntry) {
        depExports = load(depName);
      }
      // we have an entry -> link
      else {
        linkDeclarativeModule(depEntry);
        depModule = depEntry.module;
        depExports = depModule.exports;
      }

      // only declarative modules have dynamic bindings
      if (depModule && depModule.importers) {
        depModule.importers.push(module);
        module.dependencies.push(depModule);
      }
      else
        module.dependencies.push(null);

      // run the setter for this dependency
      if (module.setters[i])
        module.setters[i](depExports);
    }
  }

  // An analog to loader.get covering execution of all three layers (real declarative, simulated declarative, simulated dynamic)
  function getModule(name) {
    var exports;
    var entry = defined[name];

    if (!entry) {
      exports = load(name);
      if (!exports)
        throw new Error("Unable to load dependency " + name + ".");
    }

    else {
      if (entry.declarative)
        ensureEvaluated(name, []);

      else if (!entry.evaluated)
        linkDynamicModule(entry);

      exports = entry.module.exports;
    }

    if ((!entry || entry.declarative) && exports && exports.__useDefault)
      return exports['default'];

    return exports;
  }

  function linkDynamicModule(entry) {
    if (entry.module)
      return;

    var exports = {};

    var module = entry.module = { exports: exports, id: entry.name };

    // AMD requires execute the tree first
    if (!entry.executingRequire) {
      for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
        var depName = entry.normalizedDeps[i];
        var depEntry = defined[depName];
        if (depEntry)
          linkDynamicModule(depEntry);
      }
    }

    // now execute
    entry.evaluated = true;
    var output = entry.execute.call(global, function(name) {
      for (var i = 0, l = entry.deps.length; i < l; i++) {
        if (entry.deps[i] != name)
          continue;
        return getModule(entry.normalizedDeps[i]);
      }
      throw new TypeError('Module ' + name + ' not declared as a dependency.');
    }, exports, module);

    if (output)
      module.exports = output;
  }

  /*
   * Given a module, and the list of modules for this current branch,
   *  ensure that each of the dependencies of this module is evaluated
   *  (unless one is a circular dependency already in the list of seen
   *  modules, in which case we execute it)
   *
   * Then we evaluate the module itself depth-first left to right 
   * execution to match ES6 modules
   */
  function ensureEvaluated(moduleName, seen) {
    var entry = defined[moduleName];

    // if already seen, that means it's an already-evaluated non circular dependency
    if (!entry || entry.evaluated || !entry.declarative)
      return;

    // this only applies to declarative modules which late-execute

    seen.push(moduleName);

    for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
      var depName = entry.normalizedDeps[i];
      if (indexOf.call(seen, depName) == -1) {
        if (!defined[depName])
          load(depName);
        else
          ensureEvaluated(depName, seen);
      }
    }

    if (entry.evaluated)
      return;

    entry.evaluated = true;
    entry.module.execute.call(global);
  }

  // magical execution function
  var modules = {};
  function load(name) {
    if (modules[name])
      return modules[name];

    var entry = defined[name];

    // first we check if this module has already been defined in the registry
    if (!entry)
      throw "Module " + name + " not present.";

    // recursively ensure that the module and all its 
    // dependencies are linked (with dependency group handling)
    link(name);

    // now handle dependency execution in correct order
    ensureEvaluated(name, []);

    // remove from the registry
    defined[name] = undefined;

    var module = entry.module.exports;

    if (!module || !entry.declarative && module.__esModule !== true)
      module = { 'default': module, __useDefault: true };

    // return the defined module object
    return modules[name] = module;
  };

  return function(mains, declare) {

    var System;
    var System = {
      register: register, 
      get: load, 
      set: function(name, module) {
        modules[name] = module; 
      },
      newModule: function(module) {
        return module;
      },
      global: global 
    };
    System.set('@empty', {});

    declare(System);

    for (var i = 0; i < mains.length; i++)
      load(mains[i]);
  }

})(typeof window != 'undefined' ? window : global)
/* (['mainModule'], function(System) {
  System.register(...);
}); */

(['src/app'], function(System) {

System.register("github:PrismJS/prism@1.0.0/prism", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  self = (typeof window !== 'undefined') ? window : ((typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) ? self : {});
  var Prism = (function() {
    var lang = /\blang(?:uage)?-(?!\*)(\w+)\b/i;
    var _ = self.Prism = {
      util: {
        encode: function(tokens) {
          if (tokens instanceof Token) {
            return new Token(tokens.type, _.util.encode(tokens.content), tokens.alias);
          } else if (_.util.type(tokens) === 'Array') {
            return tokens.map(_.util.encode);
          } else {
            return tokens.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\u00a0/g, ' ');
          }
        },
        type: function(o) {
          return Object.prototype.toString.call(o).match(/\[object (\w+)\]/)[1];
        },
        clone: function(o) {
          var type = _.util.type(o);
          switch (type) {
            case 'Object':
              var clone = {};
              for (var key in o) {
                if (o.hasOwnProperty(key)) {
                  clone[key] = _.util.clone(o[key]);
                }
              }
              return clone;
            case 'Array':
              return o.map(function(v) {
                return _.util.clone(v);
              });
          }
          return o;
        }
      },
      languages: {
        extend: function(id, redef) {
          var lang = _.util.clone(_.languages[id]);
          for (var key in redef) {
            lang[key] = redef[key];
          }
          return lang;
        },
        insertBefore: function(inside, before, insert, root) {
          root = root || _.languages;
          var grammar = root[inside];
          if (arguments.length == 2) {
            insert = arguments[1];
            for (var newToken in insert) {
              if (insert.hasOwnProperty(newToken)) {
                grammar[newToken] = insert[newToken];
              }
            }
            return grammar;
          }
          var ret = {};
          for (var token in grammar) {
            if (grammar.hasOwnProperty(token)) {
              if (token == before) {
                for (var newToken in insert) {
                  if (insert.hasOwnProperty(newToken)) {
                    ret[newToken] = insert[newToken];
                  }
                }
              }
              ret[token] = grammar[token];
            }
          }
          _.languages.DFS(_.languages, function(key, value) {
            if (value === root[inside] && key != inside) {
              this[key] = ret;
            }
          });
          return root[inside] = ret;
        },
        DFS: function(o, callback, type) {
          for (var i in o) {
            if (o.hasOwnProperty(i)) {
              callback.call(o, i, o[i], type || i);
              if (_.util.type(o[i]) === 'Object') {
                _.languages.DFS(o[i], callback);
              } else if (_.util.type(o[i]) === 'Array') {
                _.languages.DFS(o[i], callback, i);
              }
            }
          }
        }
      },
      highlightAll: function(async, callback) {
        var elements = document.querySelectorAll('code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code');
        for (var i = 0,
            element; element = elements[i++]; ) {
          _.highlightElement(element, async === true, callback);
        }
      },
      highlightElement: function(element, async, callback) {
        var language,
            grammar,
            parent = element;
        while (parent && !lang.test(parent.className)) {
          parent = parent.parentNode;
        }
        if (parent) {
          language = (parent.className.match(lang) || [, ''])[1];
          grammar = _.languages[language];
        }
        if (!grammar) {
          return ;
        }
        element.className = element.className.replace(lang, '').replace(/\s+/g, ' ') + ' language-' + language;
        parent = element.parentNode;
        if (/pre/i.test(parent.nodeName)) {
          parent.className = parent.className.replace(lang, '').replace(/\s+/g, ' ') + ' language-' + language;
        }
        var code = element.textContent;
        if (!code) {
          return ;
        }
        code = code.replace(/^(?:\r?\n|\r)/, '');
        var env = {
          element: element,
          language: language,
          grammar: grammar,
          code: code
        };
        _.hooks.run('before-highlight', env);
        if (async && self.Worker) {
          var worker = new Worker(_.filename);
          worker.onmessage = function(evt) {
            env.highlightedCode = Token.stringify(JSON.parse(evt.data), language);
            _.hooks.run('before-insert', env);
            env.element.innerHTML = env.highlightedCode;
            callback && callback.call(env.element);
            _.hooks.run('after-highlight', env);
          };
          worker.postMessage(JSON.stringify({
            language: env.language,
            code: env.code
          }));
        } else {
          env.highlightedCode = _.highlight(env.code, env.grammar, env.language);
          _.hooks.run('before-insert', env);
          env.element.innerHTML = env.highlightedCode;
          callback && callback.call(element);
          _.hooks.run('after-highlight', env);
        }
      },
      highlight: function(text, grammar, language) {
        var tokens = _.tokenize(text, grammar);
        return Token.stringify(_.util.encode(tokens), language);
      },
      tokenize: function(text, grammar, language) {
        var Token = _.Token;
        var strarr = [text];
        var rest = grammar.rest;
        if (rest) {
          for (var token in rest) {
            grammar[token] = rest[token];
          }
          delete grammar.rest;
        }
        tokenloop: for (var token in grammar) {
          if (!grammar.hasOwnProperty(token) || !grammar[token]) {
            continue;
          }
          var patterns = grammar[token];
          patterns = (_.util.type(patterns) === "Array") ? patterns : [patterns];
          for (var j = 0; j < patterns.length; ++j) {
            var pattern = patterns[j],
                inside = pattern.inside,
                lookbehind = !!pattern.lookbehind,
                lookbehindLength = 0,
                alias = pattern.alias;
            pattern = pattern.pattern || pattern;
            for (var i = 0; i < strarr.length; i++) {
              var str = strarr[i];
              if (strarr.length > text.length) {
                break tokenloop;
              }
              if (str instanceof Token) {
                continue;
              }
              pattern.lastIndex = 0;
              var match = pattern.exec(str);
              if (match) {
                if (lookbehind) {
                  lookbehindLength = match[1].length;
                }
                var from = match.index - 1 + lookbehindLength,
                    match = match[0].slice(lookbehindLength),
                    len = match.length,
                    to = from + len,
                    before = str.slice(0, from + 1),
                    after = str.slice(to + 1);
                var args = [i, 1];
                if (before) {
                  args.push(before);
                }
                var wrapped = new Token(token, inside ? _.tokenize(match, inside) : match, alias);
                args.push(wrapped);
                if (after) {
                  args.push(after);
                }
                Array.prototype.splice.apply(strarr, args);
              }
            }
          }
        }
        return strarr;
      },
      hooks: {
        all: {},
        add: function(name, callback) {
          var hooks = _.hooks.all;
          hooks[name] = hooks[name] || [];
          hooks[name].push(callback);
        },
        run: function(name, env) {
          var callbacks = _.hooks.all[name];
          if (!callbacks || !callbacks.length) {
            return ;
          }
          for (var i = 0,
              callback; callback = callbacks[i++]; ) {
            callback(env);
          }
        }
      }
    };
    var Token = _.Token = function(type, content, alias) {
      this.type = type;
      this.content = content;
      this.alias = alias;
    };
    Token.stringify = function(o, language, parent) {
      if (typeof o == 'string') {
        return o;
      }
      if (_.util.type(o) === 'Array') {
        return o.map(function(element) {
          return Token.stringify(element, language, o);
        }).join('');
      }
      var env = {
        type: o.type,
        content: Token.stringify(o.content, language, parent),
        tag: 'span',
        classes: ['token', o.type],
        attributes: {},
        language: language,
        parent: parent
      };
      if (env.type == 'comment') {
        env.attributes['spellcheck'] = 'true';
      }
      if (o.alias) {
        var aliases = _.util.type(o.alias) === 'Array' ? o.alias : [o.alias];
        Array.prototype.push.apply(env.classes, aliases);
      }
      _.hooks.run('wrap', env);
      var attributes = '';
      for (var name in env.attributes) {
        attributes += name + '="' + (env.attributes[name] || '') + '"';
      }
      return '<' + env.tag + ' class="' + env.classes.join(' ') + '" ' + attributes + '>' + env.content + '</' + env.tag + '>';
    };
    if (!self.document) {
      if (!self.addEventListener) {
        return self.Prism;
      }
      self.addEventListener('message', function(evt) {
        var message = JSON.parse(evt.data),
            lang = message.language,
            code = message.code;
        self.postMessage(JSON.stringify(_.util.encode(_.tokenize(code, _.languages[lang]))));
        self.close();
      }, false);
      return self.Prism;
    }
    var script = document.getElementsByTagName('script');
    script = script[script.length - 1];
    if (script) {
      _.filename = script.src;
      if (document.addEventListener && !script.hasAttribute('data-manual')) {
        document.addEventListener('DOMContentLoaded', _.highlightAll);
      }
    }
    return self.Prism;
  })();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Prism;
  }
  Prism.languages.markup = {
    'comment': /<!--[\w\W]*?-->/,
    'prolog': /<\?.+?\?>/,
    'doctype': /<!DOCTYPE.+?>/,
    'cdata': /<!\[CDATA\[[\w\W]*?]]>/i,
    'tag': {
      pattern: /<\/?[\w:-]+\s*(?:\s+[\w:-]+(?:=(?:("|')(\\?[\w\W])*?\1|[^\s'">=]+))?\s*)*\/?>/i,
      inside: {
        'tag': {
          pattern: /^<\/?[\w:-]+/i,
          inside: {
            'punctuation': /^<\/?/,
            'namespace': /^[\w-]+?:/
          }
        },
        'attr-value': {
          pattern: /=(?:('|")[\w\W]*?(\1)|[^\s>]+)/i,
          inside: {'punctuation': /=|>|"/}
        },
        'punctuation': /\/?>/,
        'attr-name': {
          pattern: /[\w:-]+/,
          inside: {'namespace': /^[\w-]+?:/}
        }
      }
    },
    'entity': /&#?[\da-z]{1,8};/i
  };
  Prism.hooks.add('wrap', function(env) {
    if (env.type === 'entity') {
      env.attributes['title'] = env.content.replace(/&amp;/, '&');
    }
  });
  Prism.languages.css = {
    'comment': /\/\*[\w\W]*?\*\//,
    'atrule': {
      pattern: /@[\w-]+?.*?(;|(?=\s*\{))/i,
      inside: {'punctuation': /[;:]/}
    },
    'url': /url\((?:(["'])(\\\n|\\?.)*?\1|.*?)\)/i,
    'selector': /[^\{\}\s][^\{\};]*(?=\s*\{)/,
    'string': /("|')(\\\n|\\?.)*?\1/,
    'property': /(\b|\B)[\w-]+(?=\s*:)/i,
    'important': /\B!important\b/i,
    'punctuation': /[\{\};:]/,
    'function': /[-a-z0-9]+(?=\()/i
  };
  if (Prism.languages.markup) {
    Prism.languages.insertBefore('markup', 'tag', {'style': {
        pattern: /<style[\w\W]*?>[\w\W]*?<\/style>/i,
        inside: {
          'tag': {
            pattern: /<style[\w\W]*?>|<\/style>/i,
            inside: Prism.languages.markup.tag.inside
          },
          rest: Prism.languages.css
        },
        alias: 'language-css'
      }});
    Prism.languages.insertBefore('inside', 'attr-value', {'style-attr': {
        pattern: /\s*style=("|').*?\1/i,
        inside: {
          'attr-name': {
            pattern: /^\s*style/i,
            inside: Prism.languages.markup.tag.inside
          },
          'punctuation': /^\s*=\s*['"]|['"]\s*$/,
          'attr-value': {
            pattern: /.+/i,
            inside: Prism.languages.css
          }
        },
        alias: 'language-css'
      }}, Prism.languages.markup.tag);
  }
  Prism.languages.clike = {
    'comment': [{
      pattern: /(^|[^\\])\/\*[\w\W]*?\*\//,
      lookbehind: true
    }, {
      pattern: /(^|[^\\:])\/\/.*/,
      lookbehind: true
    }],
    'string': /("|')(\\\n|\\?.)*?\1/,
    'class-name': {
      pattern: /((?:(?:class|interface|extends|implements|trait|instanceof|new)\s+)|(?:catch\s+\())[a-z0-9_\.\\]+/i,
      lookbehind: true,
      inside: {punctuation: /(\.|\\)/}
    },
    'keyword': /\b(if|else|while|do|for|return|in|instanceof|function|new|try|throw|catch|finally|null|break|continue)\b/,
    'boolean': /\b(true|false)\b/,
    'function': {
      pattern: /[a-z0-9_]+\(/i,
      inside: {punctuation: /\(/}
    },
    'number': /\b-?(0x[\dA-Fa-f]+|\d*\.?\d+([Ee]-?\d+)?)\b/,
    'operator': /[-+]{1,2}|!|<=?|>=?|={1,3}|&{1,2}|\|?\||\?|\*|\/|~|\^|%/,
    'ignore': /&(lt|gt|amp);/i,
    'punctuation': /[{}[\];(),.:]/
  };
  Prism.languages.javascript = Prism.languages.extend('clike', {
    'keyword': /\b(break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|finally|for|function|get|if|implements|import|in|instanceof|interface|let|new|null|package|private|protected|public|return|set|static|super|switch|this|throw|true|try|typeof|var|void|while|with|yield)\b/,
    'number': /\b-?(0x[\dA-Fa-f]+|\d*\.?\d+([Ee][+-]?\d+)?|NaN|-?Infinity)\b/,
    'function': /(?!\d)[a-z0-9_$]+(?=\()/i
  });
  Prism.languages.insertBefore('javascript', 'keyword', {'regex': {
      pattern: /(^|[^/])\/(?!\/)(\[.+?]|\\.|[^/\r\n])+\/[gim]{0,3}(?=\s*($|[\r\n,.;})]))/,
      lookbehind: true
    }});
  if (Prism.languages.markup) {
    Prism.languages.insertBefore('markup', 'tag', {'script': {
        pattern: /<script[\w\W]*?>[\w\W]*?<\/script>/i,
        inside: {
          'tag': {
            pattern: /<script[\w\W]*?>|<\/script>/i,
            inside: Prism.languages.markup.tag.inside
          },
          rest: Prism.languages.javascript
        },
        alias: 'language-javascript'
      }});
  }
  (function() {
    if (!self.Prism || !self.document || !document.querySelector) {
      return ;
    }
    self.Prism.fileHighlight = function() {
      var Extensions = {
        'js': 'javascript',
        'html': 'markup',
        'svg': 'markup',
        'xml': 'markup',
        'py': 'python',
        'rb': 'ruby',
        'ps1': 'powershell',
        'psm1': 'powershell'
      };
      Array.prototype.slice.call(document.querySelectorAll('pre[data-src]')).forEach(function(pre) {
        var src = pre.getAttribute('data-src');
        var extension = (src.match(/\.(\w+)$/) || [, ''])[1];
        var language = Extensions[extension] || extension;
        var code = document.createElement('code');
        code.className = 'language-' + language;
        pre.textContent = '';
        code.textContent = 'Loading…';
        pre.appendChild(code);
        var xhr = new XMLHttpRequest();
        xhr.open('GET', src, true);
        xhr.onreadystatechange = function() {
          if (xhr.readyState == 4) {
            if (xhr.status < 400 && xhr.responseText) {
              code.textContent = xhr.responseText;
              Prism.highlightElement(code);
            } else if (xhr.status >= 400) {
              code.textContent = '✖ Error ' + xhr.status + ' while fetching file: ' + xhr.statusText;
            } else {
              code.textContent = '✖ Error: File does not exist or is empty';
            }
          }
        };
        xhr.send(null);
      });
    };
    self.Prism.fileHighlight();
  })();
  global.define = __define;
  return module.exports;
});

System.register("npm:core-js@0.9.8/library/modules/$.fw", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = function($) {
    $.FW = false;
    $.path = $.core;
    return $;
  };
  global.define = __define;
  return module.exports;
});

System.register("npm:babel-runtime@5.3.3/helpers/class-call-check", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  "use strict";
  exports["default"] = function(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };
  exports.__esModule = true;
  global.define = __define;
  return module.exports;
});

System.register("github:PrismJS/prism@1.0.0", ["github:PrismJS/prism@1.0.0/prism"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("github:PrismJS/prism@1.0.0/prism");
  global.define = __define;
  return module.exports;
});

System.register("npm:core-js@0.9.8/library/modules/$", ["npm:core-js@0.9.8/library/modules/$.fw"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var global = typeof self != 'undefined' ? self : Function('return this')(),
      core = {},
      defineProperty = Object.defineProperty,
      hasOwnProperty = {}.hasOwnProperty,
      ceil = Math.ceil,
      floor = Math.floor,
      max = Math.max,
      min = Math.min;
  var DESC = !!function() {
    try {
      return defineProperty({}, 'a', {get: function() {
          return 2;
        }}).a == 2;
    } catch (e) {}
  }();
  var hide = createDefiner(1);
  function toInteger(it) {
    return isNaN(it = +it) ? 0 : (it > 0 ? floor : ceil)(it);
  }
  function desc(bitmap, value) {
    return {
      enumerable: !(bitmap & 1),
      configurable: !(bitmap & 2),
      writable: !(bitmap & 4),
      value: value
    };
  }
  function simpleSet(object, key, value) {
    object[key] = value;
    return object;
  }
  function createDefiner(bitmap) {
    return DESC ? function(object, key, value) {
      return $.setDesc(object, key, desc(bitmap, value));
    } : simpleSet;
  }
  function isObject(it) {
    return it !== null && (typeof it == 'object' || typeof it == 'function');
  }
  function isFunction(it) {
    return typeof it == 'function';
  }
  function assertDefined(it) {
    if (it == undefined)
      throw TypeError("Can't call method on  " + it);
    return it;
  }
  var $ = module.exports = require("npm:core-js@0.9.8/library/modules/$.fw")({
    g: global,
    core: core,
    html: global.document && document.documentElement,
    isObject: isObject,
    isFunction: isFunction,
    it: function(it) {
      return it;
    },
    that: function() {
      return this;
    },
    toInteger: toInteger,
    toLength: function(it) {
      return it > 0 ? min(toInteger(it), 0x1fffffffffffff) : 0;
    },
    toIndex: function(index, length) {
      index = toInteger(index);
      return index < 0 ? max(index + length, 0) : min(index, length);
    },
    has: function(it, key) {
      return hasOwnProperty.call(it, key);
    },
    create: Object.create,
    getProto: Object.getPrototypeOf,
    DESC: DESC,
    desc: desc,
    getDesc: Object.getOwnPropertyDescriptor,
    setDesc: defineProperty,
    setDescs: Object.defineProperties,
    getKeys: Object.keys,
    getNames: Object.getOwnPropertyNames,
    getSymbols: Object.getOwnPropertySymbols,
    assertDefined: assertDefined,
    ES5Object: Object,
    toObject: function(it) {
      return $.ES5Object(assertDefined(it));
    },
    hide: hide,
    def: createDefiner(0),
    set: global.Symbol ? simpleSet : hide,
    mix: function(target, src) {
      for (var key in src)
        hide(target, key, src[key]);
      return target;
    },
    each: [].forEach
  });
  if (typeof __e != 'undefined')
    __e = core;
  if (typeof __g != 'undefined')
    __g = global;
  global.define = __define;
  return module.exports;
});

System.register("npm:core-js@0.9.8/library/fn/object/define-property", ["npm:core-js@0.9.8/library/modules/$"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  var $ = require("npm:core-js@0.9.8/library/modules/$");
  module.exports = function defineProperty(it, key, desc) {
    return $.setDesc(it, key, desc);
  };
  global.define = __define;
  return module.exports;
});

System.register("npm:babel-runtime@5.3.3/core-js/object/define-property", ["npm:core-js@0.9.8/library/fn/object/define-property"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": require("npm:core-js@0.9.8/library/fn/object/define-property"),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

System.register("npm:babel-runtime@5.3.3/helpers/create-class", ["npm:babel-runtime@5.3.3/core-js/object/define-property"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var _Object$defineProperty = require("npm:babel-runtime@5.3.3/core-js/object/define-property")["default"];
  exports["default"] = (function() {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor)
          descriptor.writable = true;
        _Object$defineProperty(target, descriptor.key, descriptor);
      }
    }
    return function(Constructor, protoProps, staticProps) {
      if (protoProps)
        defineProperties(Constructor.prototype, protoProps);
      if (staticProps)
        defineProperties(Constructor, staticProps);
      return Constructor;
    };
  })();
  exports.__esModule = true;
  global.define = __define;
  return module.exports;
});

System.register('src/js/selectors', ['src/js/helpers'], function (_export) {
  'use strict';

  var byId, container, imgSize, circleSize, distance, childrenLen, liveFlag, icon, genCSS, well, form, clearStage, setSizes, createImgs;
  return {
    setters: [function (_srcJsHelpers) {
      byId = _srcJsHelpers.byId;
    }],
    execute: function () {
      container = byId('container');
      imgSize = byId('imgSize');
      circleSize = byId('circleSize');
      distance = byId('distance');
      childrenLen = byId('childrenLen');
      liveFlag = byId('update');
      icon = byId('icon');
      genCSS = byId('generateCSS');
      well = byId('well');
      form = document.forms.optForm;

      _export('container', container);

      _export('imgSize', imgSize);

      _export('circleSize', circleSize);

      _export('distance', distance);

      _export('childrenLen', childrenLen);

      _export('liveFlag', liveFlag);

      _export('icon', icon);

      _export('genCSS', genCSS);

      _export('well', well);

      _export('form', form);

      clearStage = function clearStage() {
        container.innerHTML = ''; // use the (brute) force
      };

      setSizes = function setSizes(values) {
        container.style.width = container.style.height = values.outer + 'px';
      };

      _export('setSizes', setSizes);

      createImgs = function createImgs(len, size, coords, iconClass) {
        // make sure stage is always clean before injecting
        clearStage();

        for (var i = 0; i < len; i++) {
          var div = document.createElement('div');
          div.className = iconClass;
          div.style.width = div.style.height = div.style.fontSize = size + 'px';
          div.style.left = coords[i].x + 'px';
          div.style.top = coords[i].y + 'px';
          container.appendChild(div);
        }
      };

      _export('createImgs', createImgs);
    }
  };
});
System.register('src/js/formValues', [], function (_export) {
  'use strict';

  var validate;

  _export('get', get);

  function get(elem) {
    return validate[elem.type](elem.value);
  }

  return {
    setters: [],
    execute: function () {
      validate = {
        number: function number(val) {
          return parseInt(val);
        },
        range: function range(val) {
          return this.number(val);
        },
        'select-one': function selectOne(val) {
          return val;
        }
      };
    }
  };
});
System.register("src/js/logic", [], function (_export) {
  "use strict";

  var calcPosition;
  return {
    setters: [],
    execute: function () {
      calcPosition = function calcPosition(total, imgW, difference, outerDiameter) {
        var coords = [],
            outerRadius = outerDiameter / 2,
            innerRadius = outerRadius - difference - imgW,
            alpha = Math.PI / 2,
            corner = 2 * Math.PI / total;

        for (var i = 0; i < total; i++) {

          coords.push({
            x: parseInt(outerRadius - imgW / 2 + innerRadius * Math.cos(alpha)),
            y: parseInt(outerRadius - imgW / 2 - innerRadius * Math.sin(alpha))
          });

          alpha = alpha - corner;
        }
        return coords;
      };

      _export("calcPosition", calcPosition);
    }
  };
});
System.register('src/js/helpers', ['github:PrismJS/prism@1.0.0'], function (_export) {
  'use strict';

  var prism, generateCSS, appendCSS, byId;
  return {
    setters: [function (_githubPrismJSPrism100) {
      prism = _githubPrismJSPrism100['default'];
    }],
    execute: function () {
      generateCSS = function generateCSS(coords, parentSize) {
        var str = '/* parent width and height */\ndiv.parent{\n  width:' + parentSize + 'px;\n  height:' + parentSize + 'px;\n  position: relative;\n} \n\n/* child divs positions */';

        coords.forEach(function (coord, idx) {
          str += '\ndiv:nth-child(' + (idx + 1) + '){ left: ' + coord.x + 'px; top: ' + coord.y + 'px; }';
        });

        return str;
      };

      _export('generateCSS', generateCSS);

      appendCSS = function appendCSS(target, code) {

        target.innerHTML = '';

        var div = document.createElement('code');
        div.className = 'language-css';
        div.innerHTML = code;
        target.appendChild(div);
        prism.highlightElement(div);
        return code;
      };

      _export('appendCSS', appendCSS);

      byId = function byId(elId) {
        return document.getElementById(elId);
      };

      _export('byId', byId);
    }
  };
});
System.register('src/js/uiControls', ['npm:babel-runtime@5.3.3/helpers/create-class', 'npm:babel-runtime@5.3.3/helpers/class-call-check'], function (_export) {
  var _createClass, _classCallCheck, stateClass, Menu;

  return {
    setters: [function (_npmBabelRuntime533HelpersCreateClass) {
      _createClass = _npmBabelRuntime533HelpersCreateClass['default'];
    }, function (_npmBabelRuntime533HelpersClassCallCheck) {
      _classCallCheck = _npmBabelRuntime533HelpersClassCallCheck['default'];
    }],
    execute: function () {
      'use strict';

      stateClass = 'menu-open';

      Menu = (function () {
        function Menu() {
          var opts = arguments[0] === undefined ? {} : arguments[0];

          _classCallCheck(this, Menu);

          // menu is closed unless otherwise stated at init
          this.isOpen = opts.open || false;
          this.elem = document.getElementById('menu');
          this.toggler = document.getElementById('menu-toggle');
        }

        _createClass(Menu, [{
          key: 'changeClass',
          value: function changeClass(action) {
            this.elem.classList[action](stateClass);
            return this;
          }
        }, {
          key: 'toggle',
          value: function toggle() {
            return this.changeClass('toggle');
          }
        }, {
          key: 'open',
          value: function open() {
            return this.changeClass('add');
          }
        }, {
          key: 'close',
          value: function close() {
            return this.changeClass('remove');
          }
        }, {
          key: 'init',
          value: function init(opts) {
            this.toggler.addEventListener('click', this.toggle.bind(this), false);
            if (opts && opts.open) {
              this.elem.classList.add(stateClass);
            }
            return this;
          }
        }]);

        return Menu;
      })();

      _export('Menu', Menu);
    }
  };
});
System.register('src/app', ['src/js/helpers', 'src/js/selectors', 'src/js/formValues', 'src/js/logic', 'src/js/uiControls', 'github:PrismJS/prism@1.0.0'], function (_export) {
  'use strict';

  var generateCSS, appendCSS, elem, formValue, logic, Menu, prism;

  function draw() {
    var outerSize = formValue.get(elem.circleSize),
        distance = formValue.get(elem.distance),
        imgSize = formValue.get(elem.imgSize),
        icon = formValue.get(elem.icon),
        num = formValue.get(elem.childrenLen);

    var coords = logic.calcPosition(num, imgSize, distance, outerSize);

    elem.createImgs(num, imgSize, coords, icon);

    elem.setSizes({
      outer: outerSize,
      imgs: imgSize
    });

    return generateCSS(coords, outerSize);
  }

  function displayCSS() {
    var str = draw();
    appendCSS(elem.well, str);
  }

  function init() {

    var action = elem.liveFlag.checked ? 'addEventListener' : 'removeEventListener';

    elem.form.addEventListener('submit', draw, false);

    elem.circleSize[action]('change', draw, false);
    elem.imgSize[action]('change', draw, false);
    elem.childrenLen[action]('change', draw, false);
    elem.distance[action]('change', draw, false);
    elem.icon[action]('change', draw, false);
  }

  function startApp() {
    elem.liveFlag.addEventListener('change', init, false);
    elem.genCSS.addEventListener('click', displayCSS, false);

    var menu = new Menu();
    menu.init();

    init();
    draw();

    prism.highlightAll();
  }

  return {
    setters: [function (_srcJsHelpers) {
      generateCSS = _srcJsHelpers.generateCSS;
      appendCSS = _srcJsHelpers.appendCSS;
    }, function (_srcJsSelectors) {
      elem = _srcJsSelectors;
    }, function (_srcJsFormValues) {
      formValue = _srcJsFormValues;
    }, function (_srcJsLogic) {
      logic = _srcJsLogic;
    }, function (_srcJsUiControls) {
      Menu = _srcJsUiControls.Menu;
    }, function (_githubPrismJSPrism100) {
      prism = _githubPrismJSPrism100['default'];
    }],
    execute: function () {
      startApp();
    }
  };
});
});
//# sourceMappingURL=bundle.js.map