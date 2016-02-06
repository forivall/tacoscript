// An extension to Map that allows for "dynamic data" - that is, data that is
// returned by a function instead of being just stored in the map

export default class Store extends Map {
  constructor() {
    super();
    this.dynamicData = {};
  }

  dynamicData: Object;

  setDynamic(key, fn) {
    this.dynamicData[key] = fn;
  }

  get(key: string): any {
    if (this.has(key)) {
      return super.get(key);
    } else {
      if (Object.prototype.hasOwnProperty.call(this.dynamicData, key)) {
        let val =  this.dynamicData[key]();
        this.set(key, val);
        return val;
      }
    }
  }
}
