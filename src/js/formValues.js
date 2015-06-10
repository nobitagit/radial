function getVal(elem) {
  console.dir(elem);
  return {
    val : parseInt(elem.value),
    type: elem.type
  }
}

let validate = {
  number : function (val) {
    return !!val;
  },
  range : function (val) {
    return this.number(val);
  }
}

export function get(elem) {
  let value = getVal(elem);
  return validate[value.type](value.val) ? value.val : false;
}

