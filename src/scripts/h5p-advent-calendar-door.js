export default class AdventCalendarDoor {
  /**
   * @constructor
   * @param {object} params Parameters.
   */
  constructor(params, callbacks) {
    this.params = params;

    this.callbacks = callbacks || {};
    this.callbacks.onOpened = callbacks.onOpened || (() => {});
    this.callbacks.onLoaded = callbacks.onLoaded || (() => {});

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
    const doorLeft = document.createElement('div');
    doorLeft.classList.add('h5p-advent-calendar-door');
    doorLeft.classList.add('h5p-advent-calendar-left');
    doorwayLeft.appendChild(doorLeft);

    if (!params.hideNumbers) {
      const doorLeftNumber = document.createElement('div');
      doorLeftNumber.classList.add('h5p-advent-calendar-door-number');
      doorLeftNumber.innerText = params.day;
      doorLeft.appendChild(doorLeftNumber);
    }

    if (!params.hideDoorKnobs) {
      const doorLeftDoorknob = document.createElement('div');
      doorLeftDoorknob.classList.add('h5p-advent-calendar-doorknob');
      doorLeft.appendChild(doorLeftDoorknob);
    }

    // Right door
    const doorRight = document.createElement('div');
    doorRight.classList.add('h5p-advent-calendar-door');
    doorRight.classList.add('h5p-advent-calendar-right');
    doorwayRight.appendChild(doorRight);

    if (!params.hideDoorKnobs) {
      const doorRightDoorknob = document.createElement('div');
      doorRightDoorknob.classList.add('h5p-advent-calendar-doorknob');
      doorRight.appendChild(doorRightDoorknob);
    }

    // Door cover
    if (this.params.content.doorCover && this.params.content.doorCover.path) {
      const source = H5P.getPath(this.params.content.doorCover.path, this.params.contentId);
      if (source) {
        let preloadImage = document.createElement('img');
        preloadImage.src = source;
        preloadImage.addEventListener('load', () => {
          doorLeft.style.backgroundImage = `url("${source}")`;
          doorRight.style.backgroundImage = `url("${source}")`;
          preloadImage = null;
          this.handleLoaded('door');
        });

        this.container.classList.add('h5p-advent-calendar-cover-image');
      }
    }
    else {
      this.toLoad = this.toLoad.filter(item => item !== 'door');
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
      this.toLoad = this.toLoad.filter(item => item !== 'previewImage');
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
   * @return {HTMLElement} Door DOM.
   */
  getDOM() {
    return this.container;
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
   */
  handleLoaded(itemName) {
    this.toLoad = this.toLoad.filter(item => item !== itemName);

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
   * @return {boolean} True, if door is open. Else false.
   */
  isOpen() {
    return this.opened;
  }

  /**
   * Determine whether the door can be opened.
   * @return {boolean} True, if door can be opened. Else false.
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
