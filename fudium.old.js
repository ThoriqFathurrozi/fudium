// ==UserScript==
// @name         fudium
// @namespace    https://github.com/ThoriqFathurrozi/
// @version      1.0
// @description  Tampermonkey/Greasemonkey script hack for Medium articles – zaps paywalls overlays nags so you can read without the noise. Not affiliated with Medium. Use at your own risk.
// @author       frrzyriq
// @match        https://medium.com
// @match        https://*.medium.com/*
// @match        https://*/*
// @icon         https://miro.medium.com/v2/5d8de952517e8160e40ef9841c781cdc14a5db313057fa3c3de41c6f5b494b19
// @grant        none
// @run-at       document-end
// @noframes
// @homepageURL  https://github.com/ThoriqFathurrozi/fudium
// @updateURL    https://openuserjs.org/meta/frrzyriq/fudium.meta.js
// @downloadURL  https://openuserjs.org/src/scripts/frrzyriq/fudium.user.js
// @license      MIT; https://raw.githubusercontent.com/ThoriqFathurrozi/fudium/refs/heads/main/LICENSE
// ==/UserScript==

(async function () {
    'use strict';

    const freedium = 'https://freedium.cfd/'

    function iconUnlock() {
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="16" fill="white"><!--!Font Awesome Free v7.0.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M320 96c-35.3 0-64 28.7-64 64v64h192c35.3 0 64 28.7 64 64v224c0 35.3-28.7 64-64 64H192c-35.3 0-64-28.7-64-64V288c0-35.3 28.7-64 64-64v-64c0-70.7 57.3-128 128-128 63.5 0 116.1 46.1 126.2 106.7 2.9 17.4-8.8 33.9-26.3 36.9s-33.9-8.8-36.9-26.3c-5-30.2-31.3-53.3-63-53.3m40 328c13.3 0 24-10.7 24-24s-10.7-24-24-24h-80c-13.3 0-24 10.7-24 24s10.7 24 24 24z"/></svg>`;
    }

    function bannerTagArticle(link) {
        const banner = document.createElement("a");
        banner.href = freedium + link
        banner.id = "fudium-article-banner";
        banner.style.position = "absolute";
        banner.style.padding = "10px";
        banner.style.borderRadius = "5px";
        banner.style.color = "white";
        banner.style.zIndex = "498";
        banner.style.top = "0";
        banner.style.right = "0";
        banner.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
        banner.innerHTML = `${iconUnlock()} Open Free`;
        return banner;
    }

    function bannerPageArticle(link) {
        const banner = document.createElement("a");
        banner.href = freedium + link
        banner.id = "fudium-page-banner";
        banner.style.position = "fixed";
        banner.style.padding = "10px";
        banner.style.borderRadius = "5px";
        banner.style.color = "white";
        banner.style.zIndex = "498";
        banner.style.bottom = "50vh";
        banner.style.right = "20px";
        banner.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
        banner.innerHTML = `${iconUnlock()} Open Free`;
        return banner;
    }

    function waitForElement(selector, options = {}) {
        const {
            timeout = 5000,
            multiple = false,
            root = document.body,
            attributes = false, // for attribute changes
            attributeOldValue = false, // for attribute old value
            characterData = false, // for character data /text content changes
            characterDataOldValue = false // for character data/text content old value
        } = options;

        return new Promise((resolve, reject) => {
            const queryMethod = multiple ? 'querySelectorAll' : 'querySelector';

            // Check if element already exists
            const existingElement = document[queryMethod](selector);
            if (multiple ? existingElement.length > 0 : existingElement) {
                resolve(existingElement);
                return;
            }

            const observer = new MutationObserver((mutationsList, observer) => {
                const element = document[queryMethod](selector);
                if (multiple ? element.length > 0 : element) {
                    observer.disconnect();
                    clearTimeout(timeoutId);
                    resolve(element);
                }
            });

            observer.observe(root, {
                childList: true,
                subtree: true,
                attributes,
                attributeOldValue,
                characterData,
                characterDataOldValue
            });

            const timeoutId = setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Element with selector "${selector}" not found within ${timeout}ms.`));
            }, timeout);
        });
    }


    async function firstInitElement() {
        try {
            const elements = await waitForElement('article', { multiple: true, timeout: 10000 });
            elements.forEach(async (e) => {
                const linkElement = e.querySelector('div[role="link"]');
                if (linkElement && !linkElement.querySelector('#fudium-article-banner') && await checkMemberArticle(linkElement)) {
                    const rawLink = linkElement.dataset.href
                    linkElement.append(bannerTagArticle(rawLink));
                }
            });
        } catch (e) {
            console.error(e);
        }
    }

    function checkHeight() {
        return (document.height !== undefined) ? document.height : document.body.offsetHeight;
    }

    async function appendElementInEachArticle() {
        try {
            const articlesFound = await waitForElement('article', { multiple: true, timeout: 4000 });
            if (articlesFound.length === 0) {
                console.log("No articles found");
                return;
            }
            const articles = [...articlesFound];
            if (articles.length > 0) {
                articles.forEach(async (e) => {
                    const linkElement = e.querySelector('div[role="link"]');
                    if (linkElement && !linkElement.querySelector('#fudium-article-banner') && await checkMemberArticle(linkElement)) {
                        const rawLink = linkElement.dataset.href
                        linkElement.append(bannerTagArticle(rawLink));
                    }
                });
            }
        } catch (error) {
            console.error(error)
        }
    }

    async function appendElementInPageArticle() {
        if (await checkMemberArticle()) {
            const heading = await waitForElement('h1', { timeout: 4000 });
            setTimeout(() => {
                heading.parentElement.append(bannerPageArticle(document.URL));
            }, 1000);
        }
    }

    async function checkMediumChildArticle() {
        try {
            const mediumLogo = await waitForElement('#wordmark-medium-desc', { timeout: 4000 });
            return mediumLogo !== null;
        } catch (e) {
            console.error(e);
        }
    }


    async function checkMemberArticle(element) {
        if (!element) {
            const isMemberPaywall = await waitForElement('#paywallButton-programming', { timeout: 4000 });
            const isMemberPage = [...document.querySelectorAll('div>p')].some(p => p.innerText.includes("Member-only story"));
            return isMemberPaywall !== null || isMemberPage;
        }

        const isMemberButton = element.querySelector('button[aria-label="Member-only story"]');
        return isMemberButton !== null;


    }

    function isHash(str) {
        // Common hash lengths in hex
        const hashLengths = [12, 32, 40, 64, 128];
        // Check only hex characters and length
        return /^[a-f0-9]+$/i.test(str) && hashLengths.includes(str.length);
    }

    function checkIsPageArticle() {
        const url = document.URL.split('/').slice(2);
        return url.length >= 2 && isHash(url[url.length - 1].split('-').reverse()[0])
    }


    function fudiumInit() {
        let screen = checkHeight();
        let ticking = false;

        window.addEventListener("scroll", async () => {
            if (checkIsPageArticle()) {
                ticking = true;
                if (!document.querySelector('#fudium-page-banner')) {
                    await appendElementInPageArticle();
                }
            } else {
                if (document.querySelector('#fudium-page-banner')) {
                    document.querySelector('#fudium-page-banner').remove();
                }
                ticking = false;
            }

            if (!ticking) {
                window.requestAnimationFrame(async () => {
                    appendElementInEachArticle();
                    if (screen !== checkHeight()) {
                        appendElementInEachArticle();
                        screen = checkHeight();
                    }
                    ticking = false;
                });
                ticking = true;
            }
        });
    }

    async function init() {
        if (await checkMediumChildArticle()) {
            if (checkIsPageArticle()) {
                if (!document.querySelector('#fudium-page-banner')) {
                    await appendElementInPageArticle();
                }
            } else {
                firstInitElement();
            }
            fudiumInit();
        }
    }

    window.addEventListener('popstate', async () => {
        await init();
    });

    window.addEventListener('pushstate', async () => {
        await init();
    });

    window.addEventListener('locationchange', async () => {
        await init();
    });

    await init();

})();