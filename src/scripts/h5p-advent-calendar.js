import semantics from '@root/semantics.json';
import AdventCalendarDoor from '@components/h5p-advent-calendar-door.js';
import Overlay from '@components/h5p-advent-calendar-overlay.js';
import Spinner from '@components/h5p-advent-calendar-spinner.js';
import Util from '@services/h5p-advent-calendar-util.js';

export default class AdventCalendar extends H5P.EventDispatcher {
  /**
   * @class
   * @param {object} [params] Parameters passed by the editor.
   * @param {number} contentId Content's id.
   * @param {object} [extras] Saved state, metadata, etc.
   */
  constructor(params = {}, contentId, extras = {}) {
    super();

    this.params = Util.extend({
      modeDoorImage: 'automatic',
      visuals: {
        hideDoorBorder: false,
        hideNumbers: false,
        hideDoorKnobs: false,
        hideDoorFrame: false,
        snow: false
      },
      audio: {
        autoplay: false
      },
      behaviour: {
        modeDoorPlacement: 'fixed',
        doorPlacementRatio: '6x4',
        randomize: false,
        keepImageOrder: false
      },
      l10n: {
        nothingToSee: 'There is nothing to see here!\ud83c\udf84'
      },
      a11y: {
        door: 'Door',
        locked: 'Locked. It is not time to open this one yet.',
        content: 'Content of @door',
        closeWindow: 'Close window',
        mute: 'Mute audio',
        unmute: 'Unmute audio'
      }
    }, params);

    this.doorsLoaded = 0;

    this.continueBackgroundMusic = null;

    // Decode HTML
    for (let key in this.params.l10n) {
      this.params.l10n[key] = Util.htmlDecode(this.params.l10n[key]);
    }
    for (let key in this.params.a11y) {
      this.params.a11y[key] = Util.htmlDecode(this.params.a11y[key]);
    }

    // Sanitize doors if user set less than 24
    const advancedTextField = Util.findSemanticsField('text', semantics);
    const advancedTextName = advancedTextField?.options[0] ||
      'H5P.AdvancedText 1.1';
    while (this.params.doors.length < 24) {
      this.params.doors.push({
        text: {
          library: advancedTextName,
          params: { text: this.params.l10n.nothingToSee },
          subContentId: H5P.createUUID()
        },
        type: 'text'
      });
    }

    const doorImageTemplate = (params.visuals.doorImageTemplate?.path) ?
      params.visuals.doorImageTemplate :
      null;

    if (params.visuals?.backgroundImage?.path) {
      const source = H5P.getPath(
        params.visuals.backgroundImage.path, contentId
      );

      if (source) {
        this.backgroundImage = document.createElement('img');
        this.backgroundImage.addEventListener('load', () => {
          this.trigger('resize');
        });
        this.backgroundImage.src = source;
      }
    }

    this.columns = [];

    // Add day to doors
    this.doors = this.params.doors.map((door, index) => {
      if (doorImageTemplate && !door.doorCover) {
        door.doorCover = doorImageTemplate;
      }

      if (!door.type) {
        door.type = 'text';
        door.text.params.text = this.params.l10n.nothingToSee;
      }

      return {
        day: index + 1,
        content: door
      };
    });

    // Check for previous state and shuffling
    if (extras.previousState && Array.isArray(extras.previousState)) {
      this.doors = extras.previousState.map((state) => {
        const door = this.doors[state.day - 1];
        door.open = state.open;
        return door;
      });
    }
    else if (params.behaviour.randomize) {
      Util.shuffleArray(this.doors);
    }

    const coverPool = this.doors.map((door) => ({
      day: door.day,
      doorCover: door.content.doorCover
    }));

    // Reassign door covers to fixed positions
    if (params.behaviour.keepImageOrder) {
      this.doors.forEach((door, index) => {
        door.content.doorCover =
          (coverPool.filter((door) => door.day === index + 1)[0]).doorCover;
      });
    }

    this.instances = Array(25);

    this.muted = !this.params.audio.autoplay;

    // Container
    this.container = document.createElement('div');
    this.container.classList.add('h5p-advent-calendar-container');

    // Spinner to indicate loading
    this.spinner = new Spinner('h5p-advent-calendar-spinner');
    this.container.appendChild(this.spinner.getDOM());

    // Main table
    this.table = document.createElement('div');
    this.table.classList.add('h5p-advent-calendar-table');
    this.table.classList.add('h5p-advent-calendar-display-none');

    if (this.backgroundImage) {
      this.table.style.backgroundImage = `url('${this.backgroundImage.src}')`;
    }
    this.container.appendChild(this.table);

    // Doors
    this.doors.forEach((door) => {
      const column = document.createElement('div');
      column.classList.add('h5p-advent-calendar-square');

      door.door = new AdventCalendarDoor(
        {
          contentId: contentId,
          day: door.day,
          content: door.content,
          open: door.open,
          hideDoorBorder: params.visuals.hideDoorBorder,
          hideNumbers: params.visuals.hideNumbers,
          hideDoorKnobs: params.visuals.hideDoorKnobs,
          hideDoorFrame: params.visuals.hideDoorFrame,
          designMode: params.behaviour.designMode,
          a11y: {
            door: this.params.a11y.door,
            locked: this.params.a11y.locked,
            content: this.params.a11y.content,
          }
        },
        {
          onOpened: (day, delay) => {
            this.handleOverlayOpened(day, delay);
          },
          onLoaded: () => {
            this.handleDoorLoaded();
          }
        }
      );
      column.appendChild(door.door.getDOM());

      this.columns.push(column);
      this.table.appendChild(column);
    });

    // Add audio button if backgroundMusic is assigned
    if (params.audio.backgroundMusic) {
      this.backgroundMusic = this.createAudio(
        params.audio.backgroundMusic, contentId
      );

      this.buttonAudio = document.createElement('button');
      this.buttonAudio.classList.add('h5p-advent-calendar-audio-button');
      if (this.muted) {
        this.buttonAudio.classList.add('muted');
        this.buttonAudio.setAttribute('aria-label', this.params.a11y.unmute);
      }
      else {
        this.buttonAudio.classList.add('unmuted');
        this.buttonAudio.setAttribute('aria-label', this.params.a11y.mute);
      }

      this.buttonAudio.addEventListener('click', () => {
        const muted = this.toggleButtonAudio();
        if (!muted) {
          this.buttonAudio.setAttribute('aria-label', this.params.a11y.mute);
          this.playAudio();
        }
        else {
          this.buttonAudio.setAttribute('aria-label', this.params.a11y.unmute);
          this.stopAudio();
        }
      });
      this.container.appendChild(this.buttonAudio);

      if (params.audio.autoplay) {
        this.playAudio();
      }
    }

    // Add snow effect if set
    const date = new Date();
    if (params.visuals.snow || date.getMonth() === 11 && date.getDate() >= 24) {
      const sky = document.createElement('div');
      sky.classList.add('h5p-advent-calendar-sky');
      this.container.appendChild(sky);

      const snow = document.createElement('div');
      snow.classList.add('h5p-advent-calendar-snow');
      sky.appendChild(snow);

      for (let i = 0; i < 30; i++) { // 30 seems to be enough snow
        const snowFlake = document.createElement('span');
        snow.appendChild(snowFlake);
      }
    }

    // Overlay
    this.overlay = new Overlay(
      {
        a11y: {
          closeWindow: this.params.a11y.closeWindow
        }
      },
      {
        onClose: () => {
          this.handleOverlayClosed();
        }
      }
    );
    this.container.appendChild(this.overlay.getDOM());

    this.on('resize', () => {
      this.resize();
    });
  }

  /**
   * Attach library to wrapper.
   * @param {H5P.jQuery} $wrapper Content's container.
   */
  attach($wrapper) {
    $wrapper.get(0).classList.add('h5p-advent-calendar');
    $wrapper.get(0).appendChild(this.container);

    this.trigger('resize');
  }

  /**
   * Determine good row-to-column ratio heuristically.
   * @returns {string} Row-to-column ratio.
   */
  determineRowColumnRatio() {
    const containerWidth = (this.container.getBoundingClientRect()).width;
    const columnsFittingCount = Math.floor(
      containerWidth / AdventCalendar.COLUMN_WIDTH_MIN
    );

    if (columnsFittingCount >= 6) {
      return '6x4';
    }
    else if (columnsFittingCount >= 4) {
      return '4x6';
    }
    else if (columnsFittingCount >= 3) {
      return '3x8';
    }
    else if (columnsFittingCount >= 2) {
      return '2x12';
    }

    return '6x4'; // Fallback
  }

  /**
   * Set row-to-column ratio.
   * @param {string} targetRatio Aspired ratio or empty string for none.
   */
  setRowColumnRatio(targetRatio) {
    if (!targetRatio || !['', ...AdventCalendar.ROW_COLUMN_RATIOS].includes(targetRatio)) {
      return; // no valid value
    }

    this.columns.forEach((column) => {
      AdventCalendar.ROW_COLUMN_RATIOS.forEach((ratio) => {
        column.classList.remove(`h5p-advent-calendar-row-column-ratio-${ratio}`);
      });

      if (targetRatio !== '') {
        column.classList.add(`h5p-advent-calendar-row-column-ratio-${targetRatio}`);
      }
    });
  }

  /**
   * Update door covers.
   */
  updateDoorCovers() {
    if (
      this.params.modeDoorImage !== 'automatic' ||
      !this.backgroundImage ||
      this.backgroundImage.naturalWidth === 0 ||
      this.backgroundImage.naturalHeight === 0
    ) {
      return; // Not possible to automatically set door covers
    }

    // Compute size and position for door covers
    const containerRect = this.container.getBoundingClientRect();
    if (containerRect.height === 0) {
      return; // Not ready yet
    }

    const scaleByHeight = (containerRect.width / containerRect.height < this.backgroundImage.naturalWidth / this.backgroundImage.naturalHeight);
    const coverWidth = (scaleByHeight) ?
      this.backgroundImage.naturalWidth / this.backgroundImage.naturalHeight * containerRect.height :
      containerRect.width;
    const coverHeight = (scaleByHeight) ?
      containerRect.height :
      this.backgroundImage.naturalHeight / this.backgroundImage.naturalWidth * containerRect.width;

    this.doors.forEach((door) => {
      door.door.setDoorCover({
        image: this.backgroundImage,
        styles: {
          'background-size': `${coverWidth}px ${coverHeight}px`
        },
        offset: { left: containerRect.left, top: containerRect.top }
      });
    });
  }

  /**
   * Resize.
   */
  resize() {
    this.table.style.fontSize = `${this.container.offsetWidth / 48}px`;

    if (this.currentDayOpened) {
      if (this.instances[this.currentDayOpened]) {
        this.instances[this.currentDayOpened].instance.trigger('resize');
      }

      this.h5pContainer = this.h5pContainer || document.body.querySelector('.h5p-container');
      if (this.h5pContainer) {
        // Relative heights (100% on parents) don't work, content still overflows
        if (this.instances[this.currentDayOpened]) {
          const computedFontSize = parseInt(
            window.getComputedStyle(this.instances[this.currentDayOpened].wrapper).fontSize
          ) || 16;

          this.instances[this.currentDayOpened].wrapper.style.maxHeight = `calc(${this.h5pContainer.offsetHeight - 7 * computedFontSize}px)`;

          const instance = this.instances[this.currentDayOpened]?.instance;
          if (
            instance?.libraryInfo?.machineName === 'H5P.Image' &&
            instance.$img?.get(0)
          ) {
            this.instances[this.currentDayOpened].wrapper.style.maxWidth =
            (this.h5pContainer.offsetHeight - 7 * computedFontSize) / instance.$img?.get(0).offsetHeight * instance.$img?.get(0).offsetWidth + 'px';
          }
        }
      }
    }

    const ratio = (this.params.behaviour.modeDoorPlacement === 'fixed') ?
      this.params.behaviour.doorPlacementRatio :
      this.determineRowColumnRatio();
    this.setRowColumnRatio(ratio);

    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      this.updateDoorCovers();
    }, 0);
  }

  /**
   * Determine whether the task was answered already.
   * @returns {boolean} True if answer was given by user, else false.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-1}
   */
  getAnswerGiven() {
    return this.doors.some((door) => door.door.isOpen());
  }

  /**
   * Get current state for H5P core.
   * @returns {object|undefined} Current state.
   */
  getCurrentState() {
    if (!this.getAnswerGiven()) {
      return; // Nothing relevant to store. If ever resetTask is implemented, ensure to clear previous states in DB
    }

    return this.doors.map((door) => ({
      day: door.day,
      open: door.door.isOpen()
    }));
  }

  /**
   * Handle overlay opened.
   * @param {number} day Day on door.
   * @param {number} [delay] Delay for overlay to be shown.
   */
  handleOverlayOpened(day, delay = 1000) {
    this.doors.forEach((door) => door.door.lock()); // Prevent multiple overlay calls
    this.currentDayOpened = day;

    // Allow to add custom styling, no lookahead in CSS
    const params = this.doors.filter((door) => door.day === day)[0];
    this.overlay.setModifierClass(`h5p-advent-calendar-content-type-${params.content.type}`);

    // Create instance if not done before
    if (!this.instances[day]) {
      const instanceWrapper = document.createElement('div');
      instanceWrapper.classList.add('h5p-advent-calendar-instance-wrapper');

      if (!params.content[params.content.type]) {
        // No content defined for this door
        this.doors.forEach((door) => door.door.unlock());
        params.door.focus(); // Focus current door.

        return;
      }

      let instance;

      if (params.content.type === 'audio') {

        // Create H5P.Audio from audio
        instance = new H5P.Audio({
          files: params.content.audio,
          playerMode: 'full',
          fitToWrapper: false,
          controls: true,
          autoplay: params.content.autoplay || false
        }, this.contentId);

        instance.attach(H5P.jQuery(instanceWrapper));
        instance.audio.style.width = '100%';

        if (this.backgroundMusic) {
          // Listen to state changes
          instance.audio.addEventListener('play', () => {
            this.handleOverlayMedia('play');
          });
          instance.audio.addEventListener('pause', () => {
            this.handleOverlayMedia('stop');
          });
          instance.audio.addEventListener('ended', () => {
            this.handleOverlayMedia('stop');
          });
        }
      }
      else if (params.content.type === 'video') {

        // Create H5P.Video from video

        // YouTube does need fit, HTML5 doesn't
        const fit = !(params.content.video.length > 0 && params.content.video[0].mime === 'video/YouTube');

        instance = new H5P.Video({
          sources: params.content.video,
          visuals: {
            fit: fit,
            controls: true
          },
          playback: {
            autoplay: params.content.autoplay || false,
            loop: false
          }
        }, this.contentId, {});

        instance.attach(H5P.jQuery(instanceWrapper));

        if (this.backgroundMusic) {
          // Listen to state change
          instance.on('stateChange', (state) => {
            if (state.data === H5P.Video.PLAYING) {
              this.handleOverlayMedia('play');
            }
            else if (state.data === H5P.Video.PAUSED || state.data === H5P.Video.ENDED) {
              this.handleOverlayMedia('stop');
            }
          });
        }
      }
      else {

        // Create new instance
        instance = H5P.newRunnable(
          params.content[params.content.type],
          this.contentId,
          H5P.jQuery(instanceWrapper)
        );
      }

      if (params.content.type === 'image') {
        // Resize when images are loaded
        instance.on('loaded', () => {
          this.trigger('resize');
        });
      }

      this.instances[day] = {
        instance: instance,
        wrapper: instanceWrapper
      };
    }

    if (this.popupWaiting) {
      clearTimeout(this.popupWaiting);
    }

    this.popupWaiting = setTimeout(() => {
      // Special case: Links should open directly
      if (params.content.type === 'link') {
        const url = this.instances[day].wrapper
          .querySelector('.h5p-link a')
          .getAttribute('href');

        window.open(url, '_blank');
      }
      else {
        this.resize();

        this.overlay.setContent(this.instances[day].wrapper);
        this.overlay.show();
        this.instances[day].instance.trigger('resize');

        // Passing autoplay alone doesn't suffice
        if (params.content.type && params.content.autoplay && this.instances[day].instance.audio && this.instances[day].instance.audio.paused) {
          this.instances[day].instance.play();
        }
      }

      this.doors.forEach((door) => door.door.unlock());
    }, delay);
  }

  /**
   * Handle overlay closed.
   */
  handleOverlayClosed() {
    this.overlay.hide();

    // Stop media from playing
    const currentInstance = this.instances[this.currentDayOpened].instance;
    if (typeof currentInstance.pause === 'function') {
      currentInstance.pause();
    }

    // Give focus back to previously opened door
    this.doors.filter((door) => door.day === this.currentDayOpened)[0].door.focus();
  }

  /**
   * Handle media in overlay.
   * @param {string} state State the media are in.
   */
  handleOverlayMedia(state) {
    if (!this.backgroundMusic || !this.backgroundMusic.player) {
      return;
    }

    if (state === 'play') {
      this.continueBackgroundMusic = !this.backgroundMusic.player.paused;
      if (this.continueBackgroundMusic) {
        this.stopAudio();
      }
    }
    else if (state === 'stop') {
      if (this.continueBackgroundMusic) {
        this.playAudio();
      }
    }
  }

  /**
   * Handler for door loaded. Show calendar after all doors are done.
   */
  handleDoorLoaded() {
    this.doorsLoaded++;

    if (this.doorsLoaded === 24) {
      this.spinner.hide();
      this.table.classList.remove('h5p-advent-calendar-display-none');
      this.trigger('resize');
    }
  }

  /**
   * Create audio elements.
   * @param {object} params Params.
   * @param {number} contentId Content id.
   * @returns {object} Audio element.
   */
  createAudio(params, contentId) {
    if (!params || params.length < 1 || !params[0].path) {
      return null;
    }

    const player = document.createElement('audio');
    player.src = H5P.getPath(params[0].path, contentId);

    // Loop background music
    player.addEventListener('ended', () => {
      this.playAudio();
    });

    return {
      player: player,
      promise: null
    };
  }

  /**
   * Toggle audio button mute state.
   * @param {boolean} muted If set, will override toggling.
   * @returns {boolean|undefined} True, if muted, else false.
   */
  toggleButtonAudio(muted) {
    if (!this.buttonAudio) {
      return;
    }

    this.muted = (typeof muted === 'boolean') ? muted : !this.muted;

    if (this.muted) {
      this.buttonAudio.classList.remove('unmuted');
      this.buttonAudio.classList.add('muted');
      this.buttonAudio.setAttribute('aria-label', this.params.a11y.unmute);
    }
    else {
      this.buttonAudio.classList.add('unmuted');
      this.buttonAudio.classList.remove('muted');
      this.buttonAudio.setAttribute('aria-label', this.params.a11y.mute);
    }

    return this.muted;
  }

  /**
   * Play audio.
   */
  playAudio() {
    if (!this.backgroundMusic) {
      return;
    }

    // People might slide quickly ...
    if (!this.backgroundMusic.promise) {
      this.backgroundMusic.promise = this.backgroundMusic.player.play();

      if (this.backgroundMusic.promise) {
        this.backgroundMusic.promise
          .then(() => {
            this.backgroundMusic.promise = null;
            this.toggleButtonAudio(false);
          })
          .catch(() => {
            // Browser policy prevents playing
            this.backgroundMusic.promise = null;
            this.toggleButtonAudio(true);
          });
      }
    }
  }

  /**
   * Stop audio.
   */
  stopAudio() {
    /*
     * People may toggle quickly, and audio that should
     * be stopped may not have loaded yet
     */
    if (this.backgroundMusic.promise) {
      this.backgroundMusic.promise.then(() => {
        this.backgroundMusic.player.pause();
        this.backgroundMusic.promise = null;
        this.toggleButtonAudio(true);
      });
    }
    else {
      this.backgroundMusic.player.pause();
      this.toggleButtonAudio(true);
    }
  }
}

/** @constant {string[]} Row column ratios */
AdventCalendar.ROW_COLUMN_RATIOS = ['6x4', '4x6', '3x8', '2x12'];

/** @constant {number} Minimum column width */
AdventCalendar.COLUMN_WIDTH_MIN = 120;
