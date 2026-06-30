import Util from '@services/h5p-advent-calendar-util.js';
import './h5p-advent-calendar-spinner.scss';

/** Class for an activity indicator aka spinner */
class Spinner {
  /**
   * Constructor.
   * @param {object} [params] Parameters.
   * @param {string} [params.classNameBase] Class name base to define spinner visuals.
   * @param {object} [params.a11y] Accessibility strings.
   */
  constructor(params = {}) {
    this.params = Util.extend({
      loading: 'Loading...',
    }, params);

    this.classNameBase = this.params.classNameBase;

    this.container = document.createElement('div');
    this.container.classList.add(`${this.classNameBase}-container`);
    this.container.setAttribute('role', 'status');
    this.container.setAttribute('aria-label', this.params.a11y.loading);

    this.spinnerElement = document.createElement('div');
    this.spinnerElement.classList.add(this.classNameBase);

    // Circle parts with different delays for the grow/shrink animation
    const circleHead = document.createElement('div');
    circleHead.classList.add(`${this.classNameBase}-circle-head`);
    this.spinnerElement.appendChild(circleHead);

    const circleNeckUpper = document.createElement('div');
    circleNeckUpper.classList.add(`${this.classNameBase}-circle-neck-upper`);
    this.spinnerElement.appendChild(circleNeckUpper);

    const circleNeckLower = document.createElement('div');
    circleNeckLower.classList.add(`${this.classNameBase}-circle-neck-lower`);
    this.spinnerElement.appendChild(circleNeckLower);

    const circleBody = document.createElement('div');
    circleBody.classList.add(`${this.classNameBase}-circle-body`);
    this.spinnerElement.appendChild(circleBody);

    this.container.appendChild(this.spinnerElement);
  }

  /**
   * Get the DOM.
   * @returns {HTMLElement} Spinner container.
   */
  getDOM() {
    return this.container;
  }

  /**
   * Show spinner.
   */
  show() {
    this.container.classList.remove(`${this.classNameBase}-none`);
  }

  /**
   * Hide spinner.
   */
  hide() {
    this.container.classList.add(`${this.classNameBase}-none`);
  }
}

export default Spinner;
