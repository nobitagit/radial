export let calcPosition = (total, imgW, difference, outerDiameter) => {
  let coords = []
      , outerRadius = outerDiameter / 2
      , innerRadius = (outerRadius - difference) - imgW
      , alpha = Math.PI / 2
      , corner = 2 * Math.PI / total
      ;

  for ( let i = 0; i < total; i++ ){

    coords.push({
      x: parseInt( ( outerRadius - imgW / 2 ) + ( innerRadius * Math.cos( alpha ) ) )
      , y: parseInt( ( outerRadius - imgW / 2 ) - ( innerRadius * Math.sin( alpha ) ) )
    });

    alpha = alpha - corner;
  }
  return coords;
};
