export
  var container = document.getElementById('container')
  , imgSize = document.getElementById('imgSize')
  , circleSize = document.getElementById('circleSize')
  , childrenLen = document.getElementById('childrenLen')
  , children = container.getElementsByTagName('span')
  , form = document.forms['optForm']
  , setSizes = setSizes
  , createImgs = createImgs
  , clearStage = clearStage


  function setSizes (values) {
    container.style.width = container.style.height = values.outer + 'px';
  }

  function clearStage () {
    container.innerHTML = '';
  }

  function createImgs (len, coords, size) {
    let chosenImg = 'http://icongal.com/gallery/image/278651/person_customer_user_face_comment.png';

    clearStage();

    for(let i = 0; i < len; i++){
      let img = document.createElement('img');
      img.className = 'myImg';
      img.setAttribute('src', chosenImg);
      img.style.width = size + 'px';
      img.style.height = size + 'px';
      img.style.left = coords[i].x + 'px';
      img.style.top = coords[i].y + 'px';
      container.appendChild(img);
    }
  }