export function generateCSS(coords) {
  let str = "";
  coords.forEach( (coord, idx) =>{
    str += `\ndiv:nth-child(${idx + 1}){ left: ${coord.x}px; top: ${coord.y}px; }`;
  });
  return str;
}



