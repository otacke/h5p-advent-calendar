import Util from '@services/h5p-advent-calendar-util.js';
import './h5p-advent-calendar-door.scss';

export default class AdventCalendarDoor {
  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = params;

    this.callbacks = Util.extend({
      onOpened: () => {},
      onLoaded: () => {}
    }, callbacks);

    this.opened = false;
    this.toLoad = ['door', 'previewImage'];

    // Square content
    this.container = document.createElement('div');
    this.container.classList.add('h5p-advent-calendar-square-content');
    this.container.classList.add(`h5p-advent-calendar-color-scheme-${AdventCalendarDoor.colorSchemeNames[params.day % AdventCalendarDoor.colorSchemeNames.length]}`);
    if (params.hideDoorBorder) {
      this.container.classList.add('h5p-advent-calendar-hide-door-border');
    }
    if (params.hideDoorFrame) {
      this.container.classList.add('h5p-advent-calendar-hide-door-frame');
    }
    this.container.setAttribute('role', 'button');
    this.container.setAttribute('aria-label', params.day);
    this.container.setAttribute('tabIndex', 0);

    let ariaLabel = `${this.params.a11y.door} ${this.params.day}.`;
    if (!this.canBeOpened()) {
      ariaLabel += this.params.a11y.locked;
    }
    this.container.setAttribute('aria-label', ariaLabel);

    if (!this.canBeOpened()) {
      this.container.classList.add('h5p-advent-calendar-disabled');
    }
    this.container.addEventListener('click', (event) => {
      this.handleClick(event);
    });
    this.container.addEventListener('keypress', (event) => {
      this.handleKeypress(event);
    });

    // Door container
    const doorContainer = document.createElement('div');
    doorContainer.classList.add('h5p-advent-calendar-door-container');
    this.container.appendChild(doorContainer);

    const doorwayLeft = document.createElement('div');
    doorwayLeft.classList.add('h5p-advent-calendar-doorway');
    doorwayLeft.classList.add('h5p-advent-calendar-left');
    doorContainer.appendChild(doorwayLeft);

    const doorwayRight = document.createElement('div');
    doorwayRight.classList.add('h5p-advent-calendar-doorway');
    doorwayRight.classList.add('h5p-advent-calendar-right');
    doorContainer.appendChild(doorwayRight);

    // Left door
    this.doorLeft = document.createElement('div');
    this.doorLeft.classList.add('h5p-advent-calendar-door');
    this.doorLeft.classList.add('h5p-advent-calendar-left');
    doorwayLeft.appendChild(this.doorLeft);

    if (!params.hideNumbers) {
      const doorLeftNumber = document.createElement('div');
      doorLeftNumber.classList.add('h5p-advent-calendar-door-number');
      doorLeftNumber.innerText = params.day;
      this.doorLeft.appendChild(doorLeftNumber);
    }

    if (!params.hideDoorKnobs) {
      const doorLeftDoorknob = document.createElement('div');
      doorLeftDoorknob.classList.add('h5p-advent-calendar-doorknob');
      this.doorLeft.appendChild(doorLeftDoorknob);
    }

    // Right door
    this.doorRight = document.createElement('div');
    this.doorRight.classList.add('h5p-advent-calendar-door');
    this.doorRight.classList.add('h5p-advent-calendar-right');
    doorwayRight.appendChild(this.doorRight);

    if (!params.hideDoorKnobs) {
      const doorRightDoorknob = document.createElement('div');
      doorRightDoorknob.classList.add('h5p-advent-calendar-doorknob');
      this.doorRight.appendChild(doorRightDoorknob);
    }

    // Door cover
    if (this.params.content.doorCover && this.params.content.doorCover.path) {
      const source = H5P.getPath(this.params.content.doorCover.path, this.params.contentId);
      if (source) {
        let preloadImage = document.createElement('img');
        preloadImage.src = source;
        preloadImage.addEventListener('load', () => {
          this.doorLeft.style.backgroundImage = `url("${source}")`;
          this.doorRight.style.backgroundImage = `url("${source}")`;
          preloadImage = null;
          this.handleLoaded('door');
        });

        this.container.classList.add('h5p-advent-calendar-cover-image');
      }
    }
    else {
      this.toLoad = this.toLoad.filter((item) => item !== 'door');
    }

    // PreviewImage
    this.previewImage = document.createElement('button');
    this.previewImage.setAttribute('aria-label', this.params.a11y.content.replace('@door', `${this.params.a11y.door} ${this.params.day}.`));
    this.previewImage.setAttribute('tabIndex', -1);
    this.previewImage.classList.add('h5p-advent-calendar-preview-image');
    this.previewImage.classList.add(`h5p-advent-calendar-${params.content.type}-symbol`);

    this.container.appendChild(this.previewImage);
    if (this.params.content.previewImage && this.params.content.previewImage.path) {
      const source = H5P.getPath(this.params.content.previewImage.path, this.params.contentId);
      if (source) {
        let preloadImage = document.createElement('img');
        preloadImage.src = source;
        preloadImage.addEventListener('load', () => {
          this.previewImage.style.backgroundImage = `url("${source}")`;
          preloadImage = null;
          this.handleLoaded('previewImage');
        });
      }
    }
    else {
      this.toLoad = this.toLoad.filter((item) => item !== 'previewImage');
      this.previewImage.innerText = params.day;
    }

    if (this.toLoad.length === 0) {
      this.callbacks.onLoaded();
    }

    // Execute open action on click on previewImage
    this.previewImage.addEventListener('click', () => {
      this.open({
        delay: 0
      });
    });

    // Door may have been open in previous state
    if (params.open) {
      this.open({
        skipCallback: true
      });
    }
  }

  /**
   * Get door DOM.
   * @returns {HTMLElement} Door DOM.
   */
  getDOM() {
    return this.container;
  }

  /**
   * Set door cover.
   * @param {object} params Parameters.
   * @param {Image} [params.image] HTML image element.
   * @param {string} [params.image.src] Image src.
   * @param {object} [params.styles] CSS properties for image.
   * @param {object} [params.offset] Offset of main container.
   * @param {number} [params.offset.left] Left offset of main container.
   * @param {number} [params.offset.top] Top offset of main container.
   */
  setDoorCover(params = {}) {
    params = Util.extend({
      styles: {},
      offset: { left: 0, top: 0 }
    }, params);
    params.image = params.image || { src: '' };

    this.container.classList.toggle('h5p-advent-calendar-cover-image', params.image.src !== '');

    // Set image as background
    this.doorLeft.style.backgroundImage = `url("${params.image.src}")`;
    this.doorRight.style.backgroundImage = `url("${params.image.src}")`;

    // Set background offset based of door position
    const doorLeftRect = this.doorLeft.getBoundingClientRect();
    this.doorLeft.style.backgroundPosition = `left ${params.offset.left - doorLeftRect.left}px top ${params.offset.top - doorLeftRect.top}px`;

    const doorRightRect = this.doorRight.getBoundingClientRect();
    const doorRightStyle = getComputedStyle(this.doorRight);
    const doorRightBorderLeft = parseFloat(doorRightStyle.getPropertyValue('border-left').split(' ')[0]);
    this.doorRight.style.backgroundPosition = `left ${params.offset.left - doorRightRect.left - doorRightBorderLeft}px top ${params.offset.top - doorRightRect.top}px`;

    // Apply properties
    for (let property in params.styles) {
      this.doorLeft.style[property] = params.styles[property];
      this.doorRight.style[property] = params.styles[property];
    }
  }

  /**
   * Handle open event by space/enter.
   * @param {Event} event Event.
   */
  handleKeypress(event) {
    if (event.keyCode === 13 || event.keyCode === 32) {
      // Forward to click handler, door has role="button".
      this.handleClick(event);
    }
  }

  /**
   * Handle open event by click.
   * @param {Event} event Event.
   */
  handleClick(event) {
    if (!this.canBeOpened() || this.isOpen()) {
      return;
    }

    event.preventDefault();

    this.open();

    this.container.removeEventListener('click', (event) => {
      this.handleClick(event);
    });
    this.container.removeEventListener('keypress', (event) => {
      this.handleKeypress(event);
    });
  }

  /**
   * Handle loading of items to determine when door loading is loaded.
   * @param {string} itemName Name of item to be loaded.
   */
  handleLoaded(itemName) {
    this.toLoad = this.toLoad.filter((item) => item !== itemName);

    if (this.toLoad.length === 0) {
      this.callbacks.onLoaded();
    }
  }

  /**
   * Focus door or content.
   */
  focus() {
    if (this.isOpen()) {
      this.previewImage.focus();
    }
    else {
      this.container.focus();
    }
  }

  /**
   * Open door.
   * @param {object} params Parameters.
   * @param {boolean} [params.skipCallback] If true, callback will be skipped.
   */
  open(params = {}) {
    this.opened = true;

    this.container.classList.add('h5p-advent-calendar-open');
    this.container.setAttribute('tabIndex', -1);
    this.container.removeAttribute('role'); // Will get focus otherwise
    this.previewImage.setAttribute('tabIndex', 0);

    if (!params.skipCallback) {
      this.callbacks.onOpened(this.params.day, params.delay);
    }
  }

  /**
   * Lock door.
   */
  lock() {
    this.locked = true;
    this.container.classList.add('h5p-advent-calendar-disabled');
  }

  /**
   * Unlock door.
   */
  unlock() {
    this.container.classList.remove('h5p-advent-calendar-disabled');
    this.locked = false;
  }

  /**
   * Determine whether the door is open.
   * @returns {boolean} True, if door is open. Else false.
   */
  isOpen() {
    return this.opened;
  }

  /**
   * Determine whether the door can be opened.
   * @returns {boolean} True, if door can be opened. Else false.
   */
  canBeOpened() {
    if (this.locked) {
      return false;
    }

    if (this.params.designMode) {
      return true;
    }

    // Check for date in december, keep open whole december
    const date = new Date();
    return date.getMonth() === 11 && date.getDate() >= this.params.day;
  }
}

AdventCalendarDoor.colorSchemeNames = ['red', 'white', 'lightgreen', 'darkgreen'];
