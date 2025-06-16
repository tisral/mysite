import {
  buildBlock,
  loadHeader,
  loadFooter,
  decorateButtons,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
} from './aem.js';

/**
 * Creates and sets up the Turnstile login form
 * @param {Element} main The container element
 */
function setupTurnstileForm(main) {
  console.log('Setting up Turnstile form...');

  const formContainer = document.createElement('div');
  formContainer.innerHTML = `
    <form id="login-form">
      <input type="text" id="username" placeholder="Username" required />
      <input type="password" id="password" placeholder="Password" required />
      <button id="submit" type="submit">Log in</button>
      <div class="cf-turnstile" data-sitekey="0x4AAAAAABgxJ_tKXTLSNDoO"></div>
    </form>
  `;

  // Add the form to the main element
  main.appendChild(formContainer);

  // Wait for Turnstile to be ready
  const checkTurnstile = setInterval(() => {
    if (typeof turnstile !== 'undefined') {
      clearInterval(checkTurnstile);
      console.log('Turnstile is now loaded, initializing...');

      // Initialize Turnstile
      turnstile.render('.cf-turnstile', {
        sitekey: '0x4AAAAAABgxJ_tKXTLSNDoO',
        callback(token) {
          console.log('Turnstile callback received token:', token);
        },
      });

      // Add event listener for form submission
      document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Form submitted');

        const form = e.target;
        const username = form.username.value;
        const password = form.password.value;

        // Retrieve Turnstile token from hidden input
        const token = form.querySelector('input[name="cf-turnstile-response"]').value;
        console.log('Turnstile token:', token);

        // Send data to backend
        const response = await fetch('https://api-gwu2ii6e6a-uc.a.run.app/turnstile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, token }),
        });

        const data = await response.text();
        alert(data);
      });
    }
  }, 100);
}

/**
 * Builds hero block and prepends to main in a new section.
 * @param {Element} main The container element
 */
function buildHeroBlock(main) {
  const h1 = main.querySelector('h1');
  const picture = main.querySelector('picture');
  // eslint-disable-next-line no-bitwise
  if (h1 && picture && (h1.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_PRECEDING)) {
    const section = document.createElement('div');
    section.append(buildBlock('hero', { elems: [picture, h1] }));
    main.prepend(section);
  }
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    buildHeroBlock(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
  // Add Turnstile form
  setupTurnstileForm(main);
  const hello = document.createElement('p');
  hello.textContent = 'Hello World Test';
  main?.appendChild(hello);
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadHeader(doc.querySelector('header'));
  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
