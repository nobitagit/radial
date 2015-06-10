import * as printers from './helpers';
import * as elem from './selectors'
var test = printers.generateCSS();

console.log(test)

function init(evt) {
  console.log(evt)
  let children = elem.getChildren();
  console.log('init')
}

elem.form.addEventListener('submit', init, false);

