/** Class for utility functions */
class Util {
  /**
   * Extend an array just like JQuery's extend.
   * @param {object} arguments Objects to be merged.
   * @return {object} Merged objects.
   */
  static extend() {
    for (let i = 1; i < arguments.length; i++) {
      for (let key in arguments[i]) {
        if (Object.prototype.hasOwnProperty.call(arguments[i], key)) {
          if (typeof arguments[0][key] === 'object' && typeof arguments[i][key] === 'object') {
            this.extend(arguments[0][key], arguments[i][key]);
          }
          else {
            arguments[0][key] = arguments[i][key];
          }
        }
      }
    }
    return arguments[0];
  }

  /**
   * Retrieve true string from HTML encoded string.
   * @param {string} input Input string.
   * @return {string} Output string.
   */
  static htmlDecode(input) {
    var dparser = new DOMParser().parseFromString(input, 'text/html');
    return dparser.documentElement.textContent;
  }

  /**
   * Shuffle array.
   * @param {object[]} array Array.
   * @return {object[]} Shuffled array.
   */
  static shuffleArray(array) {
    let j, x, i;
    for (i = array.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      x = array[i];
      array[i] = array[j];
      array[j] = x;
    }
  }

  /**
   * Find semantics field in the semantics structure by name of the field.
   * Returns first found by depth first search if name used repeatedly.
   *
   * @param {string} fieldName Name of the field to find.
   * @param {object|object[]} semanticsStructure Semantics to look in.
   * @returns {null|object} Returns the field if found, otherwise null.
   */
  static findSemanticsField(fieldName, semanticsStructure) {
    if (Array.isArray(semanticsStructure)) {
      for (let i = 0; i < semanticsStructure.length; i++) {
        const semanticsField = Util.findSemanticsField(fieldName, semanticsStructure[i]);
        if (semanticsField !== null) {
          // Return immediately if field is found
          return semanticsField;
        }
      }
      return null;
    }
    else if (semanticsStructure.name === fieldName) {
      return semanticsStructure;
    }
    else if (semanticsStructure.field) {
      // Process field
      return Util.findSemanticsField(fieldName, semanticsStructure.field);
    }
    else if (semanticsStructure.fields) {
      // Process fields
      return Util.findSemanticsField(fieldName, semanticsStructure.fields);
    }
    else {
      // No matching semantics found within known properties and list structures
      return null;
    }
  }
}

export default Util;
