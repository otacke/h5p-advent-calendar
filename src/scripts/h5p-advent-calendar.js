import AdventCalendarDoor from './h5p-advent-calendar-door';
import Overlay from './h5p-advent-calendar-overlay';
import Util from './h5p-advent-calendar-util';

export default class AdventCalendar extends H5P.EventDispatcher {
  /**
   * @constructor
   * @param {object} params Parameters passed by the editor.
   * @param {number} contentId Content's id.
   * @param {object} [extras] Saved state, metadata, etc.
   */
  constructor(params, contentId, extras = {}) {
    super();

    this.params = Util.extend({
      behaviour: {
        autoplay: false,
        snow: false,
        hideDoorBorder: false,
        hideNumbers: false,
        hideDoorKnobs: false,
        hideDoorFrame: false,
        randomize: false,
        keepImageOrder: false
      },
      l10n: {
        closeWindow: 'Close window',
        mute: 'Mute audio',
        unmute: 'Unmute audio'
      },
      a11y: {
        door: 'Door',
        locked: 'Locked. It is not time to open this one yet.',
        content: 'Content of @door'
      }
    }, params);

    // Fill up missing doors
    while (params.doors.length < 24) {
      params.doors.push({});
    }

    // Add day to doors
    this.doors = params.doors.map((door, index) => {
      return {
        day: index + 1,
        content: door
      };
    });

    // Check for previous state and shuffling
    if (extras.previousState && Array.isArray(extras.previousState)) {
      this.doors = extras.previousState.map(state => {
        const door = this.doors[state.day - 1];
        door.open = state.open;
        return door;
      });
    }
    else if (params.behaviour.randomize) {
      Util.shuffleArray(this.doors);
    }

    const coverPool = this.doors.map(door => ({
      day: door.day,
      doorCover: door.content.doorCover
    }));

    // Reassign door covers to fixed positions
    if (params.behaviour.keepImageOrder) {
      this.doors.forEach((door, index) => {
        door.content.doorCover = (coverPool.filter(door => door.day === index + 1)[0]).doorCover;
      });
    }

    this.instances = Array(25);

    this.muted = !this.params.behaviour.autoplay;

    // Container
    this.container = document.createElement('div');
    this.container.classList.add('h5p-advent-calendar-container');

    // Main table
    this.table = document.createElement('div');
    this.table.classList.add('h5p-advent-calendar-table');
    if (params.behaviour.backgroundImage && params.behaviour.backgroundImage.path) {
      const backgroundImage = document.createElement('img');
      H5P.setSource(backgroundImage, params.behaviour.backgroundImage, contentId);
      this.table.style.backgroundImage = `url('${backgroundImage.src}')`;
    }
    this.container.appendChild(this.table);

    // Doors
    this.doors.forEach(door => {
      const column = document.createElement('div');
      column.classList.add('h5p-advent-calendar-square');
      this.table.appendChild(column);

      door.door = new AdventCalendarDoor(
        {
          contentId: contentId,
          day: door.day,
          content: door.content,
          open: door.open,
          hideDoorBorder: params.behaviour.hideDoorBorder,
          hideNumbers: params.behaviour.hideNumbers,
          hideDoorKnobs: params.behaviour.hideDoorKnobs,
          hideDoorFrame: params.behaviour.hideDoorFrame,
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
          }
        }
      );
      column.appendChild(door.door.getDOM());
    });

    // Add audio button if backgroundMusic is assigned
    if (params.behaviour.backgroundMusic) {
      this.backgroundMusic = this.createAudio(params.behaviour.backgroundMusic, contentId);

      this.buttonAudio = document.createElement('button');
      this.buttonAudio.classList.add('h5p-advent-calendar-audio-button');
      if (this.muted) {
        this.buttonAudio.classList.add('muted');
        this.buttonAudio.setAttribute('title', this.params.l10n.unmute);
      }
      else {
        this.buttonAudio.classList.add('unmuted');
        this.buttonAudio.setAttribute('title', this.params.l10n.mute);
      }

      this.buttonAudio.addEventListener('click', () => {
        const muted = this.toggleButtonAudio();
        if (!muted) {
          this.buttonAudio.setAttribute('title', this.params.l10n.mute);
          this.playAudio();
        }
        else {
          this.buttonAudio.setAttribute('title', this.params.l10n.unmute);
          this.stopAudio();
        }
      });
      this.container.appendChild(this.buttonAudio);

      if (params.behaviour.autoplay) {
        this.playAudio();
      }
    }

    // Add snow effect if set
    if (params.behaviour.snow) {
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
        l10n: {
          closeWindow: this.params.l10n.closeWindow
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
   * @param {jQuery} $wrapper Content's container.
   */
  attach($wrapper) {
    $wrapper.get(0).classList.add('h5p-advent-calendar');
    $wrapper.get(0).appendChild(this.container);

    this.trigger('resize');
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
        this.instances[this.currentDayOpened].wrapper.style.maxHeight = `calc(${this.h5pContainer.offsetHeight}px - 7em)`;
      }
    }
  }

  /**
   * Get current state for H5P core.
   * @return {object} Current state.
   */
  getCurrentState() {
    return this.doors.map(door => ({
      day: door.day,
      open: door.door.isOpen()
    }));
  }

  /**
   * Handle overlay opened.
   * @param {number} day Day on door.
   * @param {number} {delay=1000} Delay for overlay to be shown.
   */
  handleOverlayOpened(day, delay = 1000) {
    this.doors.forEach(door => door.door.lock()); // Prevent multiple overlay calls
    this.currentDayOpened = day;

    // Allow to add custom styling, no lookahead in CSS
    const params = this.doors.filter(door => door.day === day)[0];
    this.overlay.setModifierClass(`h5p-advent-calendar-content-type-${params.content.type}`);

    // Create instance if not done before
    if (!this.instances[day]) {
      const instanceWrapper = document.createElement('div');
      instanceWrapper.classList.add('h5p-advent-calendar-instance-wrapper');

      if (!params.content[params.content.type]) {
        // No content defined for this door
        this.doors.forEach(door => door.door.unlock());
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
          autoplay: false
        }, this.contentId);

        instance.attach(H5P.jQuery(instanceWrapper));
        instance.audio.style.width = '100%';
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
            autoplay: false,
            loop: false
          }
        }, this.contentId);

        instance.attach(H5P.jQuery(instanceWrapper));
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

        const opened = window.open(url, '_blank');
        if (!opened) {
          // Browser policy may prevent window.open asynchronously
          const door = this.doors.filter(door => door.day === day)[0];
          door.door.addLinkSymbol();
        }
      }
      else {
        this.resize();

        this.overlay.setContent(this.instances[day].wrapper);
        this.overlay.show();
        this.instances[day].instance.trigger('resize');
      }

      this.doors.forEach(door => door.door.unlock());
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
    this.doors.filter(door => door.day === this.currentDayOpened)[0].door.focus();
  }

  /**
   * Create audio elements.
   * @param {object} params Params.
   * @return {object} Audio element.
   */
  createAudio(params, contentId) {
    if (!params || params.length < 1 || !params[0].path) {
      return null;
    }

    const player = document.createElement('audio');
    player.src = H5P.getPath(params[0].path, contentId);
    return {
      player: player,
      promise: null
    };
  }

  /**
   * Toggle audio button mute state.
   * @param {boolean} [muted] If set, will override toggling.
   * @param {boolean} True, if muted, else false.
   */
  toggleButtonAudio(muted) {
    if (!this.buttonAudio) {
      return;
    }

    this.muted = (typeof muted === 'boolean') ? muted : !this.muted;

    if (this.muted) {
      this.buttonAudio.classList.remove('unmuted');
      this.buttonAudio.classList.add('muted');
      this.buttonAudio.title = this.params.l10n.unmute;
    }
    else {
      this.buttonAudio.classList.add('unmuted');
      this.buttonAudio.classList.remove('muted');
      this.buttonAudio.title = this.params.l10n.mute;
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
        this.backgroundMusic.player.load(); // Reset
        this.backgroundMusic.promise = null;
      });
    }
    else {
      this.backgroundMusic.player.pause();
      this.backgroundMusic.player.load(); // Reset
    }
  }
}
