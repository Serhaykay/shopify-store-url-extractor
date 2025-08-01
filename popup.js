document.addEventListener('DOMContentLoaded', function() {
    const urlInput = document.getElementById('urlInput');
    const extractBtn = document.getElementById('extractBtn');
    const resultSection = document.getElementById('resultSection');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const originalUrl = document.getElementById('originalUrl');
    const shopifyUrl = document.getElementById('shopifyUrl');
    const copyBtn = document.getElementById('copyBtn');
    const errorMessage = document.getElementById('errorMessage');

    // Extract button click handler
    extractBtn.addEventListener('click', async function() {
        const url = urlInput.value.trim();
        
        if (!url) {
            showError('Please enter a valid URL');
            return;
        }

        if (!isValidUrl(url)) {
            showError('Please enter a valid URL format (e.g., https://example.com)');
            return;
        }

        showLoading();
        hideError();
        hideResult();

        try {
            const result = await extractShopifyInfo(url);
            showResult(url, result.shopifyUrl, result.themeName);
        } catch (err) {
            showError(err.message);
        }
    });

    // Enter key handler
    urlInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            extractBtn.click();
        }
    });

    // Copy button handler
    copyBtn.addEventListener('click', function() {
        const textToCopy = shopifyUrl.textContent;
        navigator.clipboard.writeText(textToCopy).then(() => {
            shopifyUrl.classList.add('copied');
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
                shopifyUrl.classList.remove('copied');
                copyBtn.textContent = 'Copy';
            }, 2000);
        }).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = textToCopy;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            shopifyUrl.classList.add('copied');
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
                shopifyUrl.classList.remove('copied');
                copyBtn.textContent = 'Copy';
            }, 2000);
        });
    });

    // Helper functions
    function isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    function showLoading() {
        loading.style.display = 'block';
        extractBtn.disabled = true;
    }

    function hideLoading() {
        loading.style.display = 'none';
        extractBtn.disabled = false;
    }

    function showError(message) {
        hideLoading();
        errorMessage.textContent = message;
        error.style.display = 'block';
    }

    function hideError() {
        error.style.display = 'none';
    }

    function showResult(originalUrlText, shopifyUrlText, themeName) {
        hideLoading();
        originalUrl.textContent = originalUrlText;
        shopifyUrl.textContent = shopifyUrlText;
        
        // Show/hide theme name section
        const themeItem = document.getElementById('themeItem');
        const themeNameElement = document.getElementById('themeName');
        
        if (themeName) {
            themeNameElement.textContent = themeName;
            themeItem.style.display = 'block';
        } else {
            themeItem.style.display = 'none';
        }
        
        resultSection.style.display = 'block';
    }

    function hideResult() {
        resultSection.style.display = 'none';
        // Hide theme section
        const themeItem = document.getElementById('themeItem');
        themeItem.style.display = 'none';
    }

    async function extractShopifyInfo(url) {
        try {
            // Get the current active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                throw new Error('No active tab found');
            }

            // Check if the current tab URL matches the input URL
            if (tab.url !== url) {
                // Navigate to the URL first
                await chrome.tabs.update(tab.id, { url: url });
                
                // Wait for the page to load
                await new Promise(resolve => {
                    chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
                        if (tabId === tab.id && changeInfo.status === 'complete') {
                            chrome.tabs.onUpdated.removeListener(listener);
                            resolve();
                        }
                    });
                });
            }

            // Execute content script to analyze the page
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: analyzePageSource
            });

            if (results && results[0] && results[0].result) {
                const result = results[0].result;
                console.log('Content script results:', result);
                return result;
            } else {
                throw new Error('Failed to analyze page source');
            }

        } catch (error) {
            console.error('Error extracting Shopify info:', error);
            // Fallback to URL pattern analysis
            const fallbackUrl = await analyzeUrlPatterns(url);
            return { shopifyUrl: fallbackUrl, themeName: null };
        }
    }

    // Function to be executed in content script context
    function analyzePageSource() {
        const html = document.documentElement.outerHTML;
        const url = window.location.href;
        const hostname = window.location.hostname.toLowerCase();
        
        console.log('Analyzing page source for:', url);
        
        // If already on a Shopify URL, return it
        if (hostname.includes('myshopify.com') || hostname.includes('shopify.com')) {
            const themeName = extractThemeName(html);
            return { shopifyUrl: url, themeName };
        }

        // Method 1: Look for Shopify store URL in scripts (most reliable)
        const shopifyUrl = extractFromScripts(html);
        if (shopifyUrl) {
            const themeName = extractThemeName(html);
            return { shopifyUrl, themeName };
        }

        // Method 2: Look for Shopify store URL in meta tags
        const metaUrl = extractFromMetaTags(html);
        if (metaUrl) {
            const themeName = extractThemeName(html);
            return { shopifyUrl: metaUrl, themeName };
        }

        // Method 3: Look for Shopify store URL in JSON-LD structured data
        const jsonLdUrl = extractFromJsonLd(html);
        if (jsonLdUrl) {
            const themeName = extractThemeName(html);
            return { shopifyUrl: jsonLdUrl, themeName };
        }

        // Method 4: Look for Shopify store URL in link tags
        const linkUrl = extractFromLinkTags(html);
        if (linkUrl) {
            const themeName = extractThemeName(html);
            return { shopifyUrl: linkUrl, themeName };
        }

        // Method 5: Look for Shopify store URL in comments
        const commentUrl = extractFromComments(html);
        if (commentUrl) {
            const themeName = extractThemeName(html);
            return { shopifyUrl: commentUrl, themeName };
        }

        // Method 6: Look for Shopify store URL in inline styles
        const styleUrl = extractFromInlineStyles(html);
        if (styleUrl) {
            const themeName = extractThemeName(html);
            return { shopifyUrl: styleUrl, themeName };
        }

        // Method 7: Look for Shopify store URL in data attributes
        const dataUrl = extractFromDataAttributes(html);
        if (dataUrl) {
            const themeName = extractThemeName(html);
            return { shopifyUrl: dataUrl, themeName };
        }

        // If no Shopify URL found in page source, try pattern matching
        const fallbackUrl = analyzeUrlPatterns(url);
        const themeName = extractThemeName(html);
        return { shopifyUrl: fallbackUrl, themeName };

        // Helper functions for content script
        function extractFromScripts(html) {
            const patterns = [
                /"shop":"([a-zA-Z0-9-]+)"/g,
                /'shop':'([a-zA-Z0-9-]+)'/g,
                /shop:"([a-zA-Z0-9-]+)"/g,
                /shop:'([a-zA-Z0-9-]+)'/g,
                /"store":"([a-zA-Z0-9-]+)"/g,
                /'store':'([a-zA-Z0-9-]+)'/g,
                /store:"([a-zA-Z0-9-]+)"/g,
                /store:'([a-zA-Z0-9-]+)'/g,
                /"shop_id":"([a-zA-Z0-9-]+)"/g,
                /'shop_id':'([a-zA-Z0-9-]+)'/g,
                /shop_id:"([a-zA-Z0-9-]+)"/g,
                /shop_id:'([a-zA-Z0-9-]+)'/g,
                /https?:\/\/([a-zA-Z0-9-]+)\.myshopify\.com/g,
                /"([a-zA-Z0-9-]+)\.myshopify\.com"/g,
                /'([a-zA-Z0-9-]+)\.myshopify\.com'/g,
                /shopify\.com\/admin\/stores\/([a-zA-Z0-9-]+)/g,
                /shopify\.com\/s\/([a-zA-Z0-9-]+)/g,
                /cdn\.shopify\.com\/s\/files\/[^\/]+\/([a-zA-Z0-9-]+)/g,
                /cdn\.shopify\.com\/s\/[^\/]+\/([a-zA-Z0-9-]+)/g
            ];

            for (const pattern of patterns) {
                const matches = html.match(pattern);
                if (matches) {
                    for (const match of matches) {
                        const storeId = extractStoreId(match);
                        if (storeId) {
                            console.log('Found store ID:', storeId);
                            return `https://${storeId}.myshopify.com`;
                        }
                    }
                }
            }

            console.log('No store ID found in scripts');
            return null;
        }

        function extractFromMetaTags(html) {
            const metaPatterns = [
                /<meta[^>]*content=["']([^"']*myshopify\.com[^"']*)["'][^>]*>/gi,
                /<meta[^>]*property=["']og:url["'][^>]*content=["']([^"']*myshopify\.com[^"']*)["'][^>]*>/gi,
                /<meta[^>]*name=["']application-name["'][^>]*content=["']([^"']*shopify[^"']*)["'][^>]*>/gi
            ];

            for (const pattern of metaPatterns) {
                const matches = html.match(pattern);
                if (matches) {
                    for (const match of matches) {
                        const shopifyUrl = extractShopifyUrlFromString(match);
                        if (shopifyUrl) return shopifyUrl;
                    }
                }
            }

            return null;
        }

        function extractFromJsonLd(html) {
            const jsonLdPattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
            const matches = html.match(jsonLdPattern);
            
            if (matches) {
                for (const match of matches) {
                    try {
                        const jsonContent = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
                        const jsonData = JSON.parse(jsonContent);
                        
                        const shopifyUrl = findShopifyUrlInObject(jsonData);
                        if (shopifyUrl) return shopifyUrl;
                    } catch (e) {
                        // Invalid JSON, continue
                    }
                }
            }

            return null;
        }

        function extractFromLinkTags(html) {
            const linkPatterns = [
                /<link[^>]*href=["']([^"']*myshopify\.com[^"']*)["'][^>]*>/gi,
                /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*myshopify\.com[^"']*)["'][^>]*>/gi
            ];

            for (const pattern of linkPatterns) {
                const matches = html.match(pattern);
                if (matches) {
                    for (const match of matches) {
                        const shopifyUrl = extractShopifyUrlFromString(match);
                        if (shopifyUrl) return shopifyUrl;
                    }
                }
            }

            return null;
        }

        function extractFromComments(html) {
            const commentPattern = /<!--([\s\S]*?)-->/g;
            const matches = html.match(commentPattern);
            
            if (matches) {
                for (const match of matches) {
                    const shopifyUrl = extractShopifyUrlFromString(match);
                    if (shopifyUrl) return shopifyUrl;
                }
            }

            return null;
        }

        function extractFromInlineStyles(html) {
            const stylePattern = /style=["']([^"']*myshopify\.com[^"']*)["']/gi;
            const matches = html.match(stylePattern);
            
            if (matches) {
                for (const match of matches) {
                    const shopifyUrl = extractShopifyUrlFromString(match);
                    if (shopifyUrl) return shopifyUrl;
                }
            }

            return null;
        }

        function extractFromDataAttributes(html) {
            const dataPatterns = [
                /data-shopify=["']([^"']*)["']/gi,
                /data-store=["']([^"']*myshopify\.com[^"']*)["']/gi,
                /data-url=["']([^"']*myshopify\.com[^"']*)["']/gi
            ];

            for (const pattern of dataPatterns) {
                const matches = html.match(pattern);
                if (matches) {
                    for (const match of matches) {
                        const shopifyUrl = extractShopifyUrlFromString(match);
                        if (shopifyUrl) return shopifyUrl;
                    }
                }
            }

            return null;
        }

        function extractShopifyUrlFromString(str) {
            const myshopifyPattern = /https?:\/\/([a-zA-Z0-9-]+)\.myshopify\.com/gi;
            const myshopifyMatch = str.match(myshopifyPattern);
            if (myshopifyMatch) {
                return myshopifyMatch[0];
            }
            return null;
        }

        function extractStoreId(str) {
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
                    if (/^[a-zA-Z0-9-]+$/.test(storeId) && storeId.length > 3) {
                        console.log('Extracted store ID:', storeId, 'from pattern:', pattern);
                        return storeId;
                    }
                }
            }

            console.log('No valid store ID found in string');
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

        function extractThemeName(html) {
            const themePatterns = [
                /Shopify\.theme\s*=\s*["']([^"']+)["']/gi,
                /Shopify\.theme\s*=\s*{[\s\S]*?"name":\s*["']([^"']+)["'][\s\S]*?}/gi,
                /"theme":\s*["']([^"']+)["']/gi,
                /'theme':\s*['"]([^'"]+)['"]/gi,
                /theme:\s*["']([^"']+)["']/gi,
                /theme:\s*'([^']+)'/gi,
                /<meta[^>]*name=["']theme["'][^>]*content=["']([^"']+)["'][^>]*>/gi,
                /<meta[^>]*property=["']theme["'][^>]*content=["']([^"']+)["'][^>]*>/gi,
                /data-theme=["']([^"']+)["']/gi,
                /data-theme-name=["']([^"']+)["']/gi,
                /<!--[^>]*theme[^>]*name[^>]*:([^>]+)-->/gi,
                /<!--[^>]*theme[^>]*:([^>]+)-->/gi,
                /var\s+theme\s*=\s*["']([^"']+)["']/gi,
                /let\s+theme\s*=\s*["']([^"']+)["']/gi,
                /const\s+theme\s*=\s*["']([^"']+)["']/gi,
                /"theme_name":\s*["']([^"']+)["']/gi,
                /'theme_name':\s*['"]([^'"]+)['"]/gi,
                /"themeName":\s*["']([^"']+)["']/gi,
                /'themeName':\s*['"]([^'"]+)['"]/gi
            ];

            for (const pattern of themePatterns) {
                const matches = html.match(pattern);
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
            const patterns = [
                /Shopify\.theme\s*=\s*["']([^"']+)["']/i,
                /Shopify\.theme\s*=\s*{[\s\S]*?"name":\s*["']([^"']+)["'][\s\S]*?}/i,
                /"theme":\s*["']([^"']+)["']/i,
                /'theme':\s*['"]([^'"]+)['"]/i,
                /theme:\s*["']([^"']+)["']/i,
                /theme:\s*'([^']+)'/i,
                /<meta[^>]*name=["']theme["'][^>]*content=["']([^"']+)["'][^>]*>/i,
                /<meta[^>]*property=["']theme["'][^>]*content=["']([^"']+)["'][^>]*>/i,
                /data-theme=["']([^"']+)["']/i,
                /data-theme-name=["']([^"']+)["']/i,
                /<!--[^>]*theme[^>]*name[^>]*:([^>]+)-->/i,
                /<!--[^>]*theme[^>]*:([^>]+)-->/i,
                /var\s+theme\s*=\s*["']([^"']+)["']/i,
                /let\s+theme\s*=\s*["']([^"']+)["']/i,
                /const\s+theme\s*=\s*["']([^"']+)["']/i,
                /"theme_name":\s*["']([^"']+)["']/i,
                /'theme_name':\s*['"]([^'"]+)['"]/i,
                /"themeName":\s*["']([^"']+)["']/i,
                /'themeName':\s*['"]([^'"]+)['"]/i
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

        function analyzeUrlPatterns(url) {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname.toLowerCase();
            
            if (hostname.includes('myshopify.com') || hostname.includes('shopify.com')) {
                return url;
            }

            const domainParts = hostname.split('.');
            if (domainParts.length >= 2) {
                const subdomain = domainParts[0];
                return `https://${subdomain}.myshopify.com`;
            }

            return null;
        }
    }

    async function analyzeUrlPatterns(url) {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        
        if (hostname.includes('myshopify.com') || hostname.includes('shopify.com')) {
            return url;
        }

        const domainParts = hostname.split('.');
        if (domainParts.length >= 2) {
            const subdomain = domainParts[0];
            return `https://${subdomain}.myshopify.com`;
        }

        return null;
    }
}); 