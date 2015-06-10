import * as printers from './js/helpers';
import * as elem from './js/selectors';
import * as formValue from './js/formValues';
import * as logic from './js/logic';

var test = printers.generateCSS();

console.log(test)

function init(evt) {
  let size = formValue.get(elem.size)
    , num = formValue.get(elem.childrenLen);

  var a = logic.calcPosition(num, 40, 498);
  console.log(a)

}

elem.form.addEventListener('submit', init, false);

