// Content script for analyzing Shopify stores
(function() {
    'use strict';

    // Function to detect if current page is a Shopify store
    function detectShopifyStore() {
        const indicators = {
            // Meta tags that indicate Shopify
            metaTags: [
                'shopify',
                'shopify-theme',
                'shopify-section'
            ],
            
            // Scripts that indicate Shopify
            scripts: [
                'shopify.com',
                'myshopify.com',
                'cdn.shopify.com'
            ],
            
            // CSS classes that indicate Shopify
            cssClasses: [
                'shopify',
                'shopify-section',
                'shopify-product'
            ],
            
            // Data attributes that indicate Shopify
            dataAttributes: [
                'data-shopify',
                'data-product-id',
                'data-variant-id'
            ]
        };

        let score = 0;
        const maxScore = 10;

        // Check meta tags
        const metaTags = document.querySelectorAll('meta');
        metaTags.forEach(meta => {
            const content = (meta.getAttribute('content') || '').toLowerCase();
            const name = (meta.getAttribute('name') || '').toLowerCase();
            const property = (meta.getAttribute('property') || '').toLowerCase();
            
            indicators.metaTags.forEach(indicator => {
                if (content.includes(indicator) || name.includes(indicator) || property.includes(indicator)) {
                    score += 2;
                }
            });
        });

        // Check scripts
        const scripts = document.querySelectorAll('script');
        scripts.forEach(script => {
            const src = (script.getAttribute('src') || '').toLowerCase();
            const content = (script.textContent || '').toLowerCase();
            
            indicators.scripts.forEach(indicator => {
                if (src.includes(indicator) || content.includes(indicator)) {
                    score += 2;
                }
            });
        });

        // Check CSS classes
        indicators.cssClasses.forEach(className => {
            if (document.querySelector(`.${className}`)) {
                score += 1;
            }
        });

        // Check data attributes
        indicators.dataAttributes.forEach(attr => {
            if (document.querySelector(`[${attr}]`)) {
                score += 1;
            }
        });

        // Check for Shopify-specific elements
        if (document.querySelector('[data-shopify="section"]')) score += 3;
        if (document.querySelector('[data-product-id]')) score += 2;
        if (document.querySelector('[data-variant-id]')) score += 2;
        if (document.querySelector('.shopify-section')) score += 2;
        if (document.querySelector('.shopify-product')) score += 2;

        // Check for Shopify admin bar (if logged in)
        if (document.querySelector('#shopify-section-header') || 
            document.querySelector('.shopify-section-header')) {
            score += 5;
        }

        return {
            isShopify: score >= 3,
            confidence: Math.min(score / maxScore, 1),
            score: score
        };
    }

    // Function to extract Shopify store URL from current page
    function extractCurrentShopifyUrl() {
        const url = window.location.href;
        const hostname = window.location.hostname.toLowerCase();
        
        // If already on a Shopify URL, return it
        if (hostname.includes('myshopify.com') || hostname.includes('shopify.com')) {
            return url;
        }

        // Try to find Shopify store name from various sources
        let storeName = '';

        // Method 1: Check for Shopify store name in meta tags
        const shopifyMeta = document.querySelector('meta[property="og:site_name"], meta[name="application-name"]');
        if (shopifyMeta) {
            const siteName = shopifyMeta.getAttribute('content') || shopifyMeta.getAttribute('value');
            if (siteName) {
                storeName = siteName.toLowerCase().replace(/[^a-z0-9]/g, '');
            }
        }

        // Method 2: Extract from domain name
        if (!storeName) {
            const domainParts = hostname.split('.');
            if (domainParts.length >= 2) {
                storeName = domainParts[0].toLowerCase().replace(/[^a-z0-9]/g, '');
            }
        }

        // Method 3: Look for Shopify store name in scripts
        if (!storeName) {
            const scripts = document.querySelectorAll('script');
            for (const script of scripts) {
                const content = script.textContent || '';
                const shopifyMatch = content.match(/shopify\.com\/s\/([a-zA-Z0-9-]+)/);
                if (shopifyMatch) {
                    storeName = shopifyMatch[1];
                    break;
                }
            }
        }

        if (storeName && storeName.length > 2) {
            return `https://${storeName}.myshopify.com`;
        }

        return null;
    }

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'detectShopify') {
            const detection = detectShopifyStore();
            const shopifyUrl = extractCurrentShopifyUrl();
            
            sendResponse({
                isShopify: detection.isShopify,
                confidence: detection.confidence,
                score: detection.score,
                shopifyUrl: shopifyUrl,
                currentUrl: window.location.href
            });
        }
    });

    // Auto-detect and notify if this is a Shopify store
    const detection = detectShopifyStore();
    if (detection.isShopify) {
        const shopifyUrl = extractCurrentShopifyUrl();
        
        // Store detection results for popup to access
        window.shopifyDetection = {
            isShopify: detection.isShopify,
            confidence: detection.confidence,
            score: detection.score,
            shopifyUrl: shopifyUrl,
            currentUrl: window.location.href
        };
    }
})(); 