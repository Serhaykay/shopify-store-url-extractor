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
            // First, try to fetch the page content
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const html = await response.text();
            return await analyzePageSource(url, html);
        } catch (error) {
            console.log('Fetch failed, trying alternative methods:', error.message);
            // If fetch fails due to CORS, try alternative methods
            const fallbackResult = await analyzeUrlPatterns(url);
            return { shopifyUrl: fallbackResult, themeName: null };
        }
    }

    async function analyzePageSource(url, html) {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        
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
        const fallbackUrl = await analyzeUrlPatterns(url);
        const themeName = extractThemeName(html);
        return { shopifyUrl: fallbackUrl, themeName };
    }

    function extractFromScripts(html) {
        // Look for Shopify store ID patterns in scripts
        const patterns = [
            // Shopify store ID patterns
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
            // Shopify store URL patterns
            /https?:\/\/([a-zA-Z0-9-]+)\.myshopify\.com/g,
            /"([a-zA-Z0-9-]+)\.myshopify\.com"/g,
            /'([a-zA-Z0-9-]+)\.myshopify\.com'/g,
            // Shopify API patterns
            /shopify\.com\/admin\/stores\/([a-zA-Z0-9-]+)/g,
            /shopify\.com\/s\/([a-zA-Z0-9-]+)/g,
            // CDN patterns
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
                    
                    // Look for Shopify URLs in JSON-LD data
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
        // Look for myshopify.com URLs
        const myshopifyPattern = /https?:\/\/([a-zA-Z0-9-]+)\.myshopify\.com/gi;
        const myshopifyMatch = str.match(myshopifyPattern);
        if (myshopifyMatch) {
            return myshopifyMatch[0];
        }

        return null;
    }

    function extractStoreId(str) {
        // Extract store ID from various patterns
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
        // Look for theme name in various patterns
        const themePatterns = [
            // Shopify.theme patterns
            /Shopify\.theme\s*=\s*["']([^"']+)["']/gi,
            /Shopify\.theme\s*=\s*{[\s\S]*?"name":\s*["']([^"']+)["'][\s\S]*?}/gi,
            /"theme":\s*["']([^"']+)["']/gi,
            /'theme':\s*['"]([^'"]+)['"]/gi,
            /theme:\s*["']([^"']+)["']/gi,
            /theme:\s*'([^']+)'/gi,
            // Theme name in meta tags
            /<meta[^>]*name=["']theme["'][^>]*content=["']([^"']+)["'][^>]*>/gi,
            /<meta[^>]*property=["']theme["'][^>]*content=["']([^"']+)["'][^>]*>/gi,
            // Theme name in data attributes
            /data-theme=["']([^"']+)["']/gi,
            /data-theme-name=["']([^"']+)["']/gi,
            // Theme name in comments
            /<!--[^>]*theme[^>]*name[^>]*:([^>]+)-->/gi,
            /<!--[^>]*theme[^>]*:([^>]+)-->/gi,
            // Theme name in script variables
            /var\s+theme\s*=\s*["']([^"']+)["']/gi,
            /let\s+theme\s*=\s*["']([^"']+)["']/gi,
            /const\s+theme\s*=\s*["']([^"']+)["']/gi,
            // Theme name in JSON
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
        // Extract theme name from the matched string
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

    async function analyzeUrlPatterns(url) {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        
        // If already a Shopify URL, return it
        if (hostname.includes('myshopify.com') || hostname.includes('shopify.com')) {
            return url;
        }

        // Try to construct the myshopify.com URL from domain
        const domainParts = hostname.split('.');
        if (domainParts.length >= 2) {
            const subdomain = domainParts[0];
            const myshopifyUrl = `https://${subdomain}.myshopify.com`;
            
            // Test if the myshopify URL exists
            try {
                const testResponse = await fetch(myshopifyUrl, {
                    method: 'HEAD',
                    mode: 'no-cors'
                });
                return myshopifyUrl;
            } catch (error) {
                // If direct test fails, try alternative patterns
            }
        }

        // Extract potential store name from domain
        let storeName = '';
        if (domainParts.length >= 2) {
            storeName = domainParts[0];
        }

        // Common Shopify store naming patterns
        const potentialStoreNames = [
            storeName,
            storeName.replace(/[^a-zA-Z0-9]/g, ''),
            storeName.replace(/[^a-zA-Z0-9]/g, '-'),
            storeName.toLowerCase(),
            storeName.toLowerCase().replace(/[^a-z0-9]/g, '')
        ];

        // Try each potential store name
        for (const name of potentialStoreNames) {
            if (name.length > 2) {
                const testUrl = `https://${name}.myshopify.com`;
                try {
                    const testResponse = await fetch(testUrl, {
                        method: 'HEAD',
                        mode: 'no-cors'
                    });
                    return testUrl;
                } catch (error) {
                    continue;
                }
            }
        }

        // If no direct match found, provide the most likely candidate
        const mostLikelyStoreName = storeName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        if (mostLikelyStoreName.length > 2) {
            return `https://${mostLikelyStoreName}.myshopify.com`;
        }

        throw new Error('Could not determine Shopify store URL. The site might not be a Shopify store or uses a custom domain.');
    }
}); 