import prism from 'prism';

export let generateCSS = (coords, parentSize) => {
  let str = `/\* parent width and height */
div.parent{
  width:${parentSize}px;
  height:${parentSize}px;
  position: relative;
} \n\n/\* child divs positions */`;

  coords.forEach( (coord, idx) =>{
    str += `\ndiv:nth-child(${idx + 1}){ left: ${coord.x}px; top: ${coord.y}px; }`;
  });

  return str;
}

export let appendCSS = (target, code) => {

  target.innerHTML = '';

  let div = document.createElement('code');
  div.className = 'language-css';
  div.innerHTML = code;
  target.appendChild(div)
  prism.highlightElement(div);
  return code;
}

export let byId = elId => document.getElementById(elId);
