export
  var container = document.getElementById('container')
  , imgSize = document.getElementById('imgSize')
  , circleSize = document.getElementById('circleSize')
  , distance = document.getElementById('distance')
  , childrenLen = document.getElementById('childrenLen')
  , liveFlag = document.getElementById('update')
  , icon = document.getElementById('icon')
  , genCSS = document.getElementById('generateCSS')
  , well = document.getElementById('well')
  , form = document.forms['optForm']
  , setSizes = setSizes
  , createImgs = createImgs

  function setSizes (values) {
    container.style.width = container.style.height = values.outer + 'px';
  }

  function clearStage () {
    container.innerHTML = ''; // use the (brute) force
  }

  function createImgs (len, size, coords, icon) {
    // make sure stage is always empty before injecting
    clearStage();

    for(let i = 0; i < len; i++){
      let div = document.createElement('div');
      div.className = icon;
      div.style.width = div.style.height = div.style.fontSize = size + 'px';
      div.style.left = coords[i].x + 'px';
      div.style.top = coords[i].y + 'px';
      container.appendChild(div);
    }
  }