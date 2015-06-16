import {byId} from './helpers';

export let container = byId('container')
     , imgSize = byId('imgSize')
     , circleSize = byId('circleSize')
     , distance = byId('distance')
     , childrenLen = byId('childrenLen')
     , liveFlag = byId('update')
     , icon = byId('icon')
     , genCSS = byId('generateCSS')
     , well = byId('well')
     , form = document.forms['optForm']

  let clearStage = () => {
    container.innerHTML = ''; // use the (brute) force
  }

  export let setSizes = values => {
    container.style.width = container.style.height = values.outer + 'px';
  }

  export let createImgs = (len, size, coords, icon) => {
    // make sure stage is always clean before injecting
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