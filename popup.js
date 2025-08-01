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
            // First, try to get the current tab and analyze the page
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                throw new Error('No active tab found');
            }

            // Navigate to the URL if needed
            if (tab.url !== url) {
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

            // Execute content script to get page info
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: getPageInfo
            });

            if (results && results[0] && results[0].result) {
                const pageInfo = results[0].result;
                console.log('Page info:', pageInfo);

                // Try multiple methods to get Shopify info
                const shopifyInfo = await tryShopifyAPIMethods(url, pageInfo);
                return shopifyInfo;
            } else {
                throw new Error('Failed to get page information');
            }

        } catch (error) {
            console.error('Error extracting Shopify info:', error);
            // Fallback to URL pattern analysis
            const fallbackUrl = await analyzeUrlPatterns(url);
            return { shopifyUrl: fallbackUrl, themeName: null };
        }
    }

    // Function to be executed in content script context
    function getPageInfo() {
        const html = document.documentElement.outerHTML;
        const url = window.location.href;
        const hostname = window.location.hostname.toLowerCase();
        
        // Extract potential store ID from page source
        const storeId = extractStoreIdFromPage(html);
        
        // Extract theme name
        const themeName = extractThemeNameFromPage(html);
        
        console.log('Page analysis results:');
        console.log('- URL:', url);
        console.log('- Hostname:', hostname);
        console.log('- Store ID found:', storeId);
        console.log('- Theme name found:', themeName);
        console.log('- HTML length:', html.length);
        
        return {
            url,
            hostname,
            storeId,
            themeName,
            html: html.substring(0, 10000) // First 10KB for analysis
        };
    }

    function extractStoreIdFromPage(html) {
        const patterns = [
            // Shopify JSON-LD structured data
            /"@type":"Organization"[^}]*"url":"https:\/\/([a-zA-Z0-9-]+)\.myshopify\.com"/,
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
            /"myshopifyDomain":"([a-zA-Z0-9-]+)"/,
            /'myshopifyDomain':'([a-zA-Z0-9-]+)'/,
            /myshopifyDomain:"([a-zA-Z0-9-]+)"/,
            /myshopifyDomain:'([a-zA-Z0-9-]+)'/,
            // Direct myshopify.com URLs
            /https?:\/\/([a-zA-Z0-9-]+)\.myshopify\.com/,
            /"([a-zA-Z0-9-]+)\.myshopify\.com"/,
            /'([a-zA-Z0-9-]+)\.myshopify\.com'/,
            // Shopify admin and store URLs
            /shopify\.com\/admin\/stores\/([a-zA-Z0-9-]+)/,
            /shopify\.com\/s\/([a-zA-Z0-9-]+)/,
            // CDN patterns
            /cdn\.shopify\.com\/s\/files\/[^\/]+\/([a-zA-Z0-9-]+)/,
            /cdn\.shopify\.com\/s\/[^\/]+\/([a-zA-Z0-9-]+)/,
            // Shopify API endpoints
            /\/api\/[^\/]+\/graphql\.json[^}]*"shop"[^}]*"myshopifyDomain":"([a-zA-Z0-9-]+)"/,
            // Meta tags
            /<meta[^>]*property="og:url"[^>]*content="[^"]*myshopify\.com\/([a-zA-Z0-9-]+)"/,
            // Script variables
            /window\.Shopify\s*=\s*{[^}]*"shop":"([a-zA-Z0-9-]+)"/,
            /window\.shop\s*=\s*"([a-zA-Z0-9-]+)"/,
            // Shopify theme settings
            /"shopify_shop":"([a-zA-Z0-9-]+)"/,
            /'shopify_shop':'([a-zA-Z0-9-]+)'/,
            // Data attributes
            /data-shop="([a-zA-Z0-9-]+)"/,
            /data-shop-id="([a-zA-Z0-9-]+)"/,
            // Comments
            /<!--[^>]*shop[^>]*([a-zA-Z0-9-]+)[^>]*-->/,
            // Inline styles
            /background-image:\s*url\([^)]*myshopify\.com\/([a-zA-Z0-9-]+)[^)]*\)/,
            // Additional patterns for better detection
            /"domain":"([a-zA-Z0-9-]+)\.myshopify\.com"/,
            /'domain':'([a-zA-Z0-9-]+)\.myshopify\.com'/,
            /domain:"([a-zA-Z0-9-]+)\.myshopify\.com"/,
            /domain:'([a-zA-Z0-9-]+)\.myshopify\.com'/,
            // Shopify theme assets
            /\/themes\/[^\/]+\/assets\/[^"]*shop\/([a-zA-Z0-9-]+)/,
            // Shopify checkout URLs
            /checkout\.shopify\.com\/c\/[^\/]+\/([a-zA-Z0-9-]+)/,
            // Shopify admin URLs
            /admin\.shopify\.com\/stores\/([a-zA-Z0-9-]+)/,
            // Shopify app URLs
            /apps\.shopify\.com\/[^\/]+\/([a-zA-Z0-9-]+)/,
            // Shopify partner URLs
            /partners\.shopify\.com\/[^\/]+\/([a-zA-Z0-9-]+)/,
            // Shopify community URLs
            /community\.shopify\.com\/[^\/]+\/([a-zA-Z0-9-]+)/
        ];

        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match && match[1]) {
                const storeId = match[1];
                // Validate store ID format (should be alphanumeric with hyphens, 3+ chars)
                if (/^[a-zA-Z0-9-]+$/.test(storeId) && storeId.length >= 3 && storeId.length <= 50) {
                    console.log('Found store ID:', storeId, 'using pattern:', pattern.source);
                    return storeId;
                }
            }
        }

        // Fallback: Search for any myshopify.com pattern in the entire HTML
        const myshopifyPattern = /([a-zA-Z0-9-]+)\.myshopify\.com/g;
        const matches = html.match(myshopifyPattern);
        if (matches) {
            for (const match of matches) {
                const storeId = match.replace('.myshopify.com', '');
                if (/^[a-zA-Z0-9-]+$/.test(storeId) && storeId.length >= 3 && storeId.length <= 50) {
                    console.log('Found store ID from fallback search:', storeId);
                    return storeId;
                }
            }
        }

        return null;
    }

    function extractThemeNameFromPage(html) {
        const themePatterns = [
            /Shopify\.theme\s*=\s*["']([^"']+)["']/gi,
            /Shopify\.theme\s*=\s*{[\s\S]*?"name":\s*["']([^"']+)["'][\s\S]*?}/gi,
            /"theme":\s*["']([^"']+)["']/gi,
            /'theme':\s*['"]([^'"]+)['"]/gi,
            /theme:\s*["']([^"']+)["']/gi,
            /theme:\s*'([^']+)'/gi,
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

    async function tryShopifyAPIMethods(url, pageInfo) {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();

        // If already a Shopify URL, return it
        if (hostname.includes('myshopify.com') || hostname.includes('shopify.com')) {
            return { shopifyUrl: url, themeName: pageInfo.themeName };
        }

        // Method 1: Try using the store ID from page source (highest priority)
        if (pageInfo.storeId) {
            const shopifyUrl = `https://${pageInfo.storeId}.myshopify.com`;
            console.log('Using store ID from page source:', pageInfo.storeId);
            return { shopifyUrl, themeName: pageInfo.themeName };
        }

        // Method 2: Try Shopify Storefront API to detect the store
        try {
            const storefrontResult = await tryStorefrontAPI(url);
            if (storefrontResult) {
                console.log('Using Storefront API result:', storefrontResult.shopifyUrl);
                return { shopifyUrl: storefrontResult.shopifyUrl, themeName: pageInfo.themeName || storefrontResult.themeName };
            }
        } catch (error) {
            console.log('Storefront API failed:', error.message);
        }

        // Method 3: Try to extract store ID from page HTML more aggressively
        if (pageInfo.html) {
            const extractedStoreId = extractStoreIdFromPage(pageInfo.html);
            if (extractedStoreId) {
                const shopifyUrl = `https://${extractedStoreId}.myshopify.com`;
                console.log('Using extracted store ID from HTML:', extractedStoreId);
                return { shopifyUrl, themeName: pageInfo.themeName };
            }
        }

        // Method 4: Try to construct myshopify.com URL from domain (DISABLED - causes wrong results)
        // This method was causing incorrect URLs like palina.myshopify.com
        // Instead, we'll rely on the API and page source analysis only
        console.log('Skipping domain-based fallback to avoid incorrect results');

        // Method 5: Try common store name patterns (DISABLED - causes wrong results)
        // This method was causing incorrect URLs like palina.myshopify.com
        console.log('Skipping generated store names to avoid incorrect results');

        throw new Error('Could not determine Shopify store URL. The site might not be a Shopify store.');
    }

    async function tryStorefrontAPI(url) {
        // Try to access the Shopify Storefront API
        const storefrontEndpoints = [
            '/api/2023-10/graphql.json',
            '/api/2023-07/graphql.json',
            '/api/2023-04/graphql.json',
            '/api/2023-01/graphql.json'
        ];

        for (const endpoint of storefrontEndpoints) {
            try {
                const apiUrl = `${url}${endpoint}`;
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        query: `
                            query {
                                shop {
                                    name
                                    myshopifyDomain
                                }
                            }
                        `
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.data && data.data.shop && data.data.shop.myshopifyDomain) {
                        return {
                            shopifyUrl: `https://${data.data.shop.myshopifyDomain}`,
                            themeName: null
                        };
                    }
                }
            } catch (error) {
                continue;
            }
        }

        return null;
    }

    async function testShopifyURL(url) {
        try {
            const response = await fetch(url, {
                method: 'HEAD',
                mode: 'no-cors'
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    function generatePotentialStoreNames(hostname) {
        const domainParts = hostname.split('.');
        const baseName = domainParts[0];
        
        return [
            baseName,
            baseName.replace(/[^a-zA-Z0-9]/g, ''),
            baseName.replace(/[^a-zA-Z0-9]/g, '-'),
            baseName.toLowerCase(),
            baseName.toLowerCase().replace(/[^a-z0-9]/g, ''),
            baseName.toLowerCase().replace(/[^a-z0-9]/g, '-')
        ].filter(name => name.length > 2);
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