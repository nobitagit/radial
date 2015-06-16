let stateClass = 'menu-open';

export class Menu {
  constructor(opts){
    if(!opts){
      var opts = {}
    }
    // menu is closed unless otherwise stated at init
    this.isOpen = opts.open || false;
    this.elem = document.getElementById('menu');
    this.toggler = document.getElementById('menu-toggle')
  }

  changeClass(action){
    this.elem.classList[action](stateClass);
    return this;
  }

  toggle(){
    return this.changeClass('toggle');
  }

  open(){
    return this.changeClass('add');
  }

  close(){
    return this.changeClass('remove');
  }

  init(opts){
    this.toggler.addEventListener('click', this.toggle.bind(this), false);
    if(opts && opts.open){
      this.elem.classList.add(stateClass);
    }
    return this;
  }
}
