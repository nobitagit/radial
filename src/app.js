import * as helpers from './js/helpers';
import * as elem from './js/selectors';
import * as formValue from './js/formValues';
import * as logic from './js/logic';

var test = helpers.generateCSS();

function draw() {
  let outerSize = formValue.get(elem.circleSize)
    , distance = formValue.get(elem.distance)
    , imgSize = formValue.get(elem.imgSize)
    , icon = formValue.get(elem.icon)
    , num = formValue.get(elem.childrenLen);

  var coords = logic.calcPosition(num, imgSize, distance, outerSize);

  elem.createImgs(num, imgSize, coords, icon);

  elem.setSizes({
    outer: outerSize,
    imgs: imgSize
  });

}

function init() {

  let action = elem.liveFlag.checked ? 'addEventListener' : 'removeEventListener';

  elem.form.addEventListener('submit', draw, false);
  elem.circleSize[action]('change', draw, false);
  elem.imgSize[action]('change', draw, false);
  elem.childrenLen[action]('change', draw, false);
  elem.distance[action]('change', draw, false);
  elem.icon[action]('change', draw, false);
}

elem.liveFlag.addEventListener('change', init, false);

init();
draw();

