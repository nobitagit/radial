export function generateCSS(coords, parentSize) {
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

export let byId = elId => document.getElementById(elId);




