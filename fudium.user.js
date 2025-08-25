// ==UserScript==
// @name         fudium
// @namespace    https://github.com/ThoriqFathurrozi/
// @version      1.0
// @description  Tampermonkey/Greasemonkey script hack for Medium articles – zaps paywalls overlays nags so you can read without the noise. Not affiliated with Medium. Use at your own risk.
// @author       frrzyriq
// @match        https://medium.com
// @match        https://*.medium.com/*
// @icon         https://miro.medium.com/v2/5d8de952517e8160e40ef9841c781cdc14a5db313057fa3c3de41c6f5b494b19
// @grant        none
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/ThoriqFathurrozi/fudium/refs/heads/main/fudium.user.js
// @downloadURL  https://raw.githubusercontent.com/ThoriqFathurrozi/fudium/refs/heads/main/fudium.user.js
// @license      MIT
// ==/UserScript==

await(async function () {
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

    function waitForElementWithMutationObserver(selector, timeout) {
        return new Promise((resolve, reject) => {
            const observer = new MutationObserver((mutationsList, observer) => {
                const element = document.querySelectorAll(selector);
                if (element.length > 0) {
                    observer.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });

            // Set a timeout to prevent infinite waiting
            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Element with selector "${selector}" not found within timeout.`));
            }, timeout);
        });
    }

    function initElement() {
        waitForElementWithMutationObserver('article', 10000)
            .then(element => {
                element.forEach((e) => {
                    const linkElement = e.querySelector('div[role="link"]');
                    if (linkElement && !linkElement.querySelector('#fudium-article-banner') && checkMemberArticle(linkElement)) {
                        const rawLink = linkElement.dataset.href
                        linkElement.append(bannerTagArticle(rawLink));
                    }
                });
            })
            .catch(error => {
                console.error(error.message);
            });
    }

    function checkHeight() {
        return (document.height !== undefined) ? document.height : document.body.offsetHeight;
    }

    async function appendElement() {
        try {
            const articles = await waitForElementWithMutationObserver('article', 4000);
            if (articles.length === 0) {
                console.log("No articles found");
                return [];
            }
            return articles;
        } catch (error) {
            console.log(error)
            return [];
        }
    }


    function checkMemberArticle(element) {
        const isMember = element.querySelector('button[aria-label="Member-only story"]');
        return isMember !== null;

    }

    function isHash(str) {
        // Common hash lengths in hex
        const hashLengths = [12, 32, 40, 64, 128];
        // Check only hex characters and length
        return /^[a-f0-9]+$/i.test(str) && hashLengths.includes(str.length);
    }

    function checkIsPageArticle() {
        const url = document.URL.split('/');
        if (url.length >= 2 && isHash(url[url.length - 1].split('-').reverse()[0])) {
            return true;
        }
        return false;
    }

    function appendElementInPageArticle() {
        const isMember = document.querySelector('#paywallButton-programming');
        if (isMember) {
            document.querySelector("h1").after(bannerPageArticle(document.URL));
        }
    }

    async function init() {
        let screen = checkHeight();
        if (!checkIsPageArticle()) {
            initElement();
        } else {
            appendElementInPageArticle();
        }
        let ticking = false;

        window.addEventListener("scroll", () => {
            if (checkIsPageArticle()) {
                ticking = true;
                if (!document.querySelector('#fudium-page-banner')) {
                    appendElementInPageArticle();
                }
            } else {
                if (document.querySelector('#fudium-page-banner')) {
                    document.querySelector('#fudium-page-banner').remove();
                }
                ticking = false;
            }

            if (!ticking) {
                window.requestAnimationFrame(() => {
                    if (screen !== checkHeight()) {
                        appendElement().then(async (element) => {
                            const arrElement = [...element];
                            if (arrElement.length > 0) {
                                arrElement.forEach((e) => {
                                    const linkElement = e.querySelector('div[role="link"]');
                                    if (linkElement && !linkElement.querySelector('#fudium-article-banner') && checkMemberArticle(linkElement)) {
                                        const rawLink = linkElement.dataset.href

                                        linkElement.append(bannerTagArticle(rawLink));
                                    }
                                });
                            }
                            screen = checkHeight();

                        });
                    }
                    ticking = false;
                });
                ticking = true;
            }
        });
    }

    init();

})();