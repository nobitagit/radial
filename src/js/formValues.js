let validate = {
  number: function (val) {
    return parseInt(val);
  }
  , range: function (val) {
    return this.number(val);
  }
  , 'select-one': function (val) {
    return val;
  }
};

export function get(elem) {
  return validate[elem.type](elem.value);
}

