import * as helpers from './js/helpers';
import * as elem from './js/selectors';
import * as formValue from './js/formValues';
import * as logic from './js/logic';

var test = helpers.generateCSS();

console.log(test)

function init(evt) {
  let outerSize = formValue.get(elem.circleSize)
    , imgSize = formValue.get(elem.imgSize)
    , num = formValue.get(elem.childrenLen);

  var coords = logic.calcPosition(num, imgSize, outerSize);

  elem.createImgs(num, coords, imgSize);

  elem.setSizes({
    outer: outerSize,
    imgs: imgSize
  });

}

elem.form.addEventListener('submit', init, false);

