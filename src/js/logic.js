'use strict';

function getDiameter (elem) {
    return parseInt( window.getComputedStyle(elem).getPropertyValue('width') );
}

function getRadius (elem) {
    return getDiameter(elem) / 2;
}

function getImgWidth (img) {
    let image = img.length ? img[0] : img;
    return img.getBoundingClientRect().width;
}

export function calcPosition (totalImgs, imgWidth, outerDiameter) {

    let alpha = Math.PI / 2
      , coords = {}
      , total = totalImgs
      , imgW = imgWidth
      , outerRadius = outerDiameter / 2
      , innerRadius = outerRadius - imgW
      , corner = 2 * Math.PI / total;

    for ( let i = 0 ; i < total; i++ ){

      coords[i] = {
        x : parseInt( ( outerRadius - imgW / 2 ) + ( innerRadius * Math.cos( alpha ) ) ),
        y : parseInt( ( outerRadius - imgW / 2 ) - ( innerRadius * Math.sin( alpha ) ) )
      }

      alpha = alpha - corner;
    }
    return coords;
}