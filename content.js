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

        // Method 1: Look for Shopify store URL in scripts (most reliable)
        const shopifyUrl = extractFromScripts();
        if (shopifyUrl) {
            return shopifyUrl;
        }

        // Method 2: Look for Shopify store URL in meta tags
        const metaUrl = extractFromMetaTags();
        if (metaUrl) {
            return metaUrl;
        }

        // Method 3: Look for Shopify store URL in JSON-LD structured data
        const jsonLdUrl = extractFromJsonLd();
        if (jsonLdUrl) {
            return jsonLdUrl;
        }

        // Method 4: Look for Shopify store URL in link tags
        const linkUrl = extractFromLinkTags();
        if (linkUrl) {
            return linkUrl;
        }

        // Method 5: Look for Shopify store URL in comments
        const commentUrl = extractFromComments();
        if (commentUrl) {
            return commentUrl;
        }

        // Method 6: Look for Shopify store URL in inline styles
        const styleUrl = extractFromInlineStyles();
        if (styleUrl) {
            return styleUrl;
        }

        // Method 7: Look for Shopify store URL in data attributes
        const dataUrl = extractFromDataAttributes();
        if (dataUrl) {
            return dataUrl;
        }

        // Method 8: Extract from domain name
        return extractFromDomain();
    }

    // Function to extract theme name from current page
    function extractCurrentThemeName() {
        // Method 1: Look for theme name in scripts
        const scriptTheme = extractThemeFromScripts();
        if (scriptTheme) {
            return scriptTheme;
        }

        // Method 2: Look for theme name in meta tags
        const metaTheme = extractThemeFromMetaTags();
        if (metaTheme) {
            return metaTheme;
        }

        // Method 3: Look for theme name in data attributes
        const dataTheme = extractThemeFromDataAttributes();
        if (dataTheme) {
            return dataTheme;
        }

        // Method 4: Look for theme name in comments
        const commentTheme = extractThemeFromComments();
        if (commentTheme) {
            return commentTheme;
        }

        return null;
    }

    function extractFromScripts() {
        const scripts = document.querySelectorAll('script');
        
        for (const script of scripts) {
            const src = script.getAttribute('src') || '';
            const content = script.textContent || '';
            
            // Look for Shopify store IDs in script content
            const storeId = extractStoreIdFromString(content);
            if (storeId) {
                return `https://${storeId}.myshopify.com`;
            }
            
            // Look for Shopify URLs in script src
            const shopifyUrl = extractShopifyUrlFromString(src);
            if (shopifyUrl) return shopifyUrl;
        }
        
        return null;
    }

    function extractFromMetaTags() {
        const metaTags = document.querySelectorAll('meta');
        
        for (const meta of metaTags) {
            const content = meta.getAttribute('content') || '';
            const property = meta.getAttribute('property') || '';
            const name = meta.getAttribute('name') || '';
            
            // Look for Shopify URLs in meta content
            const shopifyUrl = extractShopifyUrlFromString(content);
            if (shopifyUrl) return shopifyUrl;
            
            // Look for Shopify URLs in og:url
            if (property === 'og:url') {
                const shopifyUrl = extractShopifyUrlFromString(content);
                if (shopifyUrl) return shopifyUrl;
            }
        }
        
        return null;
    }

    function extractFromJsonLd() {
        const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
        
        for (const script of jsonLdScripts) {
            try {
                const jsonData = JSON.parse(script.textContent);
                const shopifyUrl = findShopifyUrlInObject(jsonData);
                if (shopifyUrl) return shopifyUrl;
            } catch (e) {
                // Invalid JSON, continue
            }
        }
        
        return null;
    }

    function extractFromLinkTags() {
        const linkTags = document.querySelectorAll('link');
        
        for (const link of linkTags) {
            const href = link.getAttribute('href') || '';
            const rel = link.getAttribute('rel') || '';
            
            // Look for Shopify URLs in link href
            const shopifyUrl = extractShopifyUrlFromString(href);
            if (shopifyUrl) return shopifyUrl;
            
            // Look for canonical URLs that might be Shopify
            if (rel === 'canonical') {
                const shopifyUrl = extractShopifyUrlFromString(href);
                if (shopifyUrl) return shopifyUrl;
            }
        }
        
        return null;
    }

    function extractFromComments() {
        // Get all comments from the document
        const walker = document.createTreeWalker(
            document,
            NodeFilter.SHOW_COMMENT,
            null,
            false
        );
        
        let comment;
        while (comment = walker.nextNode()) {
            const shopifyUrl = extractShopifyUrlFromString(comment.textContent);
            if (shopifyUrl) return shopifyUrl;
        }
        
        return null;
    }

    function extractFromInlineStyles() {
        const elementsWithStyle = document.querySelectorAll('[style*="shopify"]');
        
        for (const element of elementsWithStyle) {
            const style = element.getAttribute('style') || '';
            const shopifyUrl = extractShopifyUrlFromString(style);
            if (shopifyUrl) return shopifyUrl;
        }
        
        return null;
    }

    function extractFromDataAttributes() {
        const dataAttributes = [
            'data-shopify',
            'data-store',
            'data-url',
            'data-shop'
        ];
        
        for (const attr of dataAttributes) {
            const elements = document.querySelectorAll(`[${attr}]`);
            for (const element of elements) {
                const value = element.getAttribute(attr) || '';
                const shopifyUrl = extractShopifyUrlFromString(value);
                if (shopifyUrl) return shopifyUrl;
            }
        }
        
        return null;
    }

    function extractFromDomain() {
        const hostname = window.location.hostname.toLowerCase();
        const domainParts = hostname.split('.');
        
        if (domainParts.length >= 2) {
            const subdomain = domainParts[0];
            return `https://${subdomain}.myshopify.com`;
        }
        
        return null;
    }

    function extractShopifyUrlFromString(str) {
        if (!str) return null;
        
        // Look for myshopify.com URLs
        const myshopifyPattern = /https?:\/\/([a-zA-Z0-9-]+)\.myshopify\.com/gi;
        const myshopifyMatch = str.match(myshopifyPattern);
        if (myshopifyMatch) {
            return myshopifyMatch[0];
        }

        return null;
    }

    function extractStoreIdFromString(str) {
        if (!str) return null;
        
        // Look for Shopify store ID patterns
        const patterns = [
            /"shop":"([a-zA-Z0-9-]+)"/,
            /'shop':'([a-zA-Z0-9-]+)'/,
            /shop:"([a-zA-Z0-9-]+)"/,
            /shop:'([a-zA-Z0-9-]+)'/,
            /"store":"([a-zA-Z0-9-]+)"/,
            /'store':'([a-zA-Z0-9-]+)'/,
            /store:"([a-zA-Z0-9-]+)"/,
            /store:'([a-zA-Z0-9-]+)'/,
            /"shop_id":"([a-zA-Z0-9-]+)"/,
            /'shop_id':'([a-zA-Z0-9-]+)'/,
            /shop_id:"([a-zA-Z0-9-]+)"/,
            /shop_id:'([a-zA-Z0-9-]+)'/,
            /https?:\/\/([a-zA-Z0-9-]+)\.myshopify\.com/,
            /"([a-zA-Z0-9-]+)\.myshopify\.com"/,
            /'([a-zA-Z0-9-]+)\.myshopify\.com'/,
            /shopify\.com\/admin\/stores\/([a-zA-Z0-9-]+)/,
            /shopify\.com\/s\/([a-zA-Z0-9-]+)/,
            /cdn\.shopify\.com\/s\/files\/[^\/]+\/([a-zA-Z0-9-]+)/,
            /cdn\.shopify\.com\/s\/[^\/]+\/([a-zA-Z0-9-]+)/
        ];

        for (const pattern of patterns) {
            const match = str.match(pattern);
            if (match && match[1]) {
                const storeId = match[1];
                // Validate store ID format (should be alphanumeric with hyphens)
                if (/^[a-zA-Z0-9-]+$/.test(storeId) && storeId.length > 3) {
                    return storeId;
                }
            }
        }

        return null;
    }

    function findShopifyUrlInObject(obj) {
        if (typeof obj === 'string') {
            const shopifyUrl = extractShopifyUrlFromString(obj);
            if (shopifyUrl) return shopifyUrl;
        } else if (typeof obj === 'object' && obj !== null) {
            for (const key in obj) {
                const result = findShopifyUrlInObject(obj[key]);
                if (result) return result;
            }
        }
        return null;
    }

    // Theme extraction functions
    function extractThemeFromScripts() {
        const scripts = document.querySelectorAll('script');
        
        for (const script of scripts) {
            const content = script.textContent || '';
            
            // Look for theme name patterns in script content
            const themeName = extractThemeNameFromString(content);
            if (themeName) return themeName;
        }
        
        return null;
    }

    function extractThemeFromMetaTags() {
        const metaTags = document.querySelectorAll('meta');
        
        for (const meta of metaTags) {
            const name = meta.getAttribute('name') || '';
            const property = meta.getAttribute('property') || '';
            const content = meta.getAttribute('content') || '';
            
            // Look for theme-related meta tags
            if (name === 'theme' || property === 'theme') {
                if (content && content.trim()) {
                    return content.trim();
                }
            }
        }
        
        return null;
    }

    function extractThemeFromDataAttributes() {
        const dataAttributes = [
            'data-theme',
            'data-theme-name'
        ];
        
        for (const attr of dataAttributes) {
            const elements = document.querySelectorAll(`[${attr}]`);
            for (const element of elements) {
                const value = element.getAttribute(attr) || '';
                if (value && value.trim()) {
                    return value.trim();
                }
            }
        }
        
        return null;
    }

    function extractThemeFromComments() {
        // Get all comments from the document
        const walker = document.createTreeWalker(
            document,
            NodeFilter.SHOW_COMMENT,
            null,
            false
        );
        
        let comment;
        while (comment = walker.nextNode()) {
            const themeName = extractThemeNameFromString(comment.textContent);
            if (themeName) return themeName;
        }
        
        return null;
    }

    function extractThemeNameFromString(str) {
        if (!str) return null;
        
        // Look for theme name patterns
        const patterns = [
            /Shopify\.theme\s*=\s*["']([^"']+)["']/gi,
            /Shopify\.theme\s*=\s*{[\s\S]*?"name":\s*["']([^"']+)["'][\s\S]*?}/gi,
            /"theme":\s*["']([^"']+)["']/gi,
            /'theme':\s*['"]([^'"]+)['"]/gi,
            /theme:\s*["']([^"']+)["']/gi,
            /theme:\s*'([^']+)'/gi,
            /"theme_name":\s*["']([^"']+)["']/gi,
            /'theme_name':\s*['"]([^'"]+)['"]/gi,
            /"themeName":\s*["']([^"']+)["']/gi,
            /'themeName':\s*['"]([^'"]+)['"]/gi,
            /var\s+theme\s*=\s*["']([^"']+)["']/gi,
            /let\s+theme\s*=\s*["']([^"']+)["']/gi,
            /const\s+theme\s*=\s*["']([^"']+)["']/gi
        ];

        for (const pattern of patterns) {
            const matches = str.match(pattern);
            if (matches) {
                for (const match of matches) {
                    const themeName = extractThemeNameFromMatch(match);
                    if (themeName) return themeName;
                }
            }
        }

        return null;
    }

    function extractThemeNameFromMatch(match) {
        // Extract theme name from the matched string
        const patterns = [
            /Shopify\.theme\s*=\s*["']([^"']+)["']/i,
            /Shopify\.theme\s*=\s*{[\s\S]*?"name":\s*["']([^"']+)["'][\s\S]*?}/i,
            /"theme":\s*["']([^"']+)["']/i,
            /'theme':\s*['"]([^'"]+)['"]/i,
            /theme:\s*["']([^"']+)["']/i,
            /theme:\s*'([^']+)'/i,
            /"theme_name":\s*["']([^"']+)["']/i,
            /'theme_name':\s*['"]([^'"]+)['"]/i,
            /"themeName":\s*["']([^"']+)["']/i,
            /'themeName':\s*['"]([^'"]+)['"]/i,
            /var\s+theme\s*=\s*["']([^"']+)["']/i,
            /let\s+theme\s*=\s*["']([^"']+)["']/i,
            /const\s+theme\s*=\s*["']([^"']+)["']/i
        ];

        for (const pattern of patterns) {
            const themeMatch = match.match(pattern);
            if (themeMatch && themeMatch[1]) {
                const themeName = themeMatch[1].trim();
                if (themeName.length > 0) {
                    return themeName;
                }
            }
        }

        return null;
    }

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'detectShopify') {
            const detection = detectShopifyStore();
            const shopifyUrl = extractCurrentShopifyUrl();
            const themeName = extractCurrentThemeName();
            
            sendResponse({
                isShopify: detection.isShopify,
                confidence: detection.confidence,
                score: detection.score,
                shopifyUrl: shopifyUrl,
                themeName: themeName,
                currentUrl: window.location.href
            });
        }
    });

    // Auto-detect and notify if this is a Shopify store
    const detection = detectShopifyStore();
    if (detection.isShopify) {
        const shopifyUrl = extractCurrentShopifyUrl();
        const themeName = extractCurrentThemeName();
        
        // Store detection results for popup to access
        window.shopifyDetection = {
            isShopify: detection.isShopify,
            confidence: detection.confidence,
            score: detection.score,
            shopifyUrl: shopifyUrl,
            themeName: themeName,
            currentUrl: window.location.href
        };
    }
})(); 