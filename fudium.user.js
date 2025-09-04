// ==UserScript==
// @name         fudium
// @namespace    https://github.com/ThoriqFathurrozi/
// @version      1.1
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

(async () => {
    'use strict';

    const FREEDIUM_URL = 'https://freedium.cfd/';
    const BANNER_ID_ARTICLE = 'fudium-article-banner';
    const BANNER_ID_PAGE = 'fudium-page-banner';

    // Utility function to wait for elements
    const waitForElement = async (selector, timeout = 5000, multiple = false) => {
        const queryMethod = multiple ? 'querySelectorAll' : 'querySelector';
        const existing = document[queryMethod](selector);
        if (multiple ? existing.length > 0 : existing) return existing;

        return new Promise((resolve, reject) => {
            const observer = new MutationObserver(() => {
                const element = document[queryMethod](selector);
                if (multiple ? element.length > 0 : element) {
                    observer.disconnect();
                    clearTimeout(timeoutId);
                    resolve(element);
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });

            const timeoutId = setTimeout(() => {
                observer.disconnect();
                resolve(multiple ? [] : null);
            }, timeout);
        });
    };

    // Create banner elements
    const createBanner = (link, isPageBanner = false) => {
        const banner = document.createElement('a');
        banner.href = FREEDIUM_URL + link;
        banner.id = isPageBanner ? BANNER_ID_PAGE : BANNER_ID_ARTICLE;

        Object.assign(banner.style, {
            position: isPageBanner ? 'fixed' : 'absolute',
            padding: '10px',
            borderRadius: '5px',
            color: 'white',
            zIndex: '498',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 'bold',
            ...(isPageBanner
                ? { bottom: '50vh', right: '20px' }
                : { top: '0', right: '0' }
            )
        });

        banner.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="16" fill="white" style="vertical-align: middle; margin-right: 5px;">
                <path d="M320 96c-35.3 0-64 28.7-64 64v64h192c35.3 0 64 28.7 64 64v224c0 35.3-28.7 64-64 64H192c-35.3 0-64-28.7-64-64V288c0-35.3 28.7-64 64-64v-64c0-70.7 57.3-128 128-128 63.5 0 116.1 46.1 126.2 106.7 2.9 17.4-8.8 33.9-26.3 36.9s-33.9-8.8-36.9-26.3c-5-30.2-31.3-53.3-63-53.3m40 328c13.3 0 24-10.7 24-24s-10.7-24-24-24h-80c-13.3 0-24 10.7-24 24s10.7 24 24 24z"/>
            </svg>
            Open Free
        `;

        return banner;
    };

    // Check if article is member-only
    const isMemberOnlyArticle = async (element) => {
        if (element) {
            return element.querySelector('button[aria-label="Member-only story"]') !== null;
        }

        // Check for page-level paywall indicators
        const paywallButton = await waitForElement('#paywallButton-programming', 2000);

        if (!paywallButton) {
            return false;
        }

        return [...document.querySelectorAll('div>p')]
            .some(p => p.innerText.includes('Member-only story'));
    };

    // Check if current page is an full article page
    const isFullArticlePage = () => {
        const locationPath = window.location.pathname;

        const exceptPath = ['/@MediumStaff/list'];
        if (exceptPath.some(except => locationPath.includes(except))) return false;

        const pathParts = locationPath.split('/').filter(Boolean);
        if (pathParts.length === 0) return false;

        const lastPart = pathParts[pathParts.length - 1];
        const possibleHash = lastPart.split('-').pop();

        return /^[a-f0-9]{12,}$/i.test(possibleHash);
    };

    // Check if we're on Medium
    const isMediumSite = async () => {
        try {
            const logo = await waitForElement('#wordmark-medium-desc', 2000);
            return logo !== null;
        } catch {
            return false;
        }
    };

    // Add banners to article cards
    const addArticleBanners = async () => {
        try {
            const articles = await waitForElement('article', 4000, true);

            if (!articles.length) return;

            for (const article of articles) {
                const linkElement = article.querySelector('div[role="link"]');
                if (!linkElement || linkElement.querySelector(`#${BANNER_ID_ARTICLE}`)) continue;

                if (await isMemberOnlyArticle(linkElement)) {
                    linkElement.style.position = 'relative';
                    linkElement.appendChild(createBanner(linkElement.dataset.href));
                }
            }
        } catch (error) {
            console.error('Error adding article banners:', error);
        }
    };

    // Add banner to article page
    const addPageBanner = async () => {
        if (document.querySelector(`#${BANNER_ID_PAGE}`) || !await isMemberOnlyArticle()) {
            return;
        }

        try {
            const heading = await waitForElement('h1', 4000);
            if (heading?.parentElement) {
                heading.parentElement.style.position = 'relative';
                heading.parentElement.appendChild(createBanner(window.location.href, true));
            }
        } catch (error) {
            console.error('Error adding page banner:', error);
        }
    };

    // Remove page banner if not on article page
    const cleanupPageBanner = () => {
        const banner = document.querySelector(`#${BANNER_ID_PAGE}`);
        if (banner) banner.remove();
    };

    // Throttled scroll handler
    let scrollTimeout;
    const handleScroll = () => {
        if (scrollTimeout) return;

        scrollTimeout = setTimeout(async () => {
            if (isFullArticlePage()) {
                await addPageBanner();
            } else {
                cleanupPageBanner();
                await addArticleBanners();
            }
            scrollTimeout = null;
        }, 150);
    };

    // Initialize the script
    const initialize = async () => {
        if (!await isMediumSite()) return;

        if (isFullArticlePage()) {
            await addPageBanner();
        } else {
            await addArticleBanners();
        }

        // Set up scroll listener with throttling
        window.addEventListener('scroll', handleScroll, { passive: true });
    };

    // Handle navigation changes (SPA)
    const handleNavigation = async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        await initialize();
    };

    // Listen for navigation events
    ['popstate', 'pushstate', 'locationchange'].forEach(event => {
        window.addEventListener(event, handleNavigation);
    });

    // Start the script
    await initialize();
})();