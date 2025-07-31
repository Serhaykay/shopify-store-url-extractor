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
            const shopifyStoreUrl = await extractShopifyUrl(url);
            showResult(url, shopifyStoreUrl);
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

    function showResult(originalUrlText, shopifyUrlText) {
        hideLoading();
        originalUrl.textContent = originalUrlText;
        shopifyUrl.textContent = shopifyUrlText;
        resultSection.style.display = 'block';
    }

    function hideResult() {
        resultSection.style.display = 'none';
    }

    async function extractShopifyUrl(url) {
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
            return await analyzeUrlPatterns(url);
        }
    }

    async function analyzePageSource(url, html) {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        
        // Method 1: Look for Shopify store URL in meta tags
        const shopifyUrl = extractFromMetaTags(html);
        if (shopifyUrl) {
            return shopifyUrl;
        }

        // Method 2: Look for Shopify store URL in scripts
        const scriptUrl = extractFromScripts(html);
        if (scriptUrl) {
            return scriptUrl;
        }

        // Method 3: Look for Shopify store URL in JSON-LD structured data
        const jsonLdUrl = extractFromJsonLd(html);
        if (jsonLdUrl) {
            return jsonLdUrl;
        }

        // Method 4: Look for Shopify store URL in link tags
        const linkUrl = extractFromLinkTags(html);
        if (linkUrl) {
            return linkUrl;
        }

        // Method 5: Look for Shopify store URL in comments
        const commentUrl = extractFromComments(html);
        if (commentUrl) {
            return commentUrl;
        }

        // Method 6: Look for Shopify store URL in inline styles
        const styleUrl = extractFromInlineStyles(html);
        if (styleUrl) {
            return styleUrl;
        }

        // Method 7: Look for Shopify store URL in data attributes
        const dataUrl = extractFromDataAttributes(html);
        if (dataUrl) {
            return dataUrl;
        }

        // If no Shopify URL found in page source, try pattern matching
        return await analyzeUrlPatterns(url);
    }

    function extractFromMetaTags(html) {
        const metaPatterns = [
            /<meta[^>]*content=["']([^"']*shopify[^"']*)["'][^>]*>/gi,
            /<meta[^>]*property=["']og:url["'][^>]*content=["']([^"']*shopify[^"']*)["'][^>]*>/gi,
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

    function extractFromScripts(html) {
        const scriptPatterns = [
            /"shopify\.com\/s\/([a-zA-Z0-9-]+)"/g,
            /'shopify\.com\/s\/([a-zA-Z0-9-]+)'/g,
            /shopify\.com\/s\/([a-zA-Z0-9-]+)/g,
            /"myshopify\.com"/g,
            /'myshopify\.com'/g,
            /myshopify\.com/g,
            /"cdn\.shopify\.com"/g,
            /'cdn\.shopify\.com'/g,
            /cdn\.shopify\.com/g
        ];

        for (const pattern of scriptPatterns) {
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
            /<link[^>]*href=["']([^"']*shopify[^"']*)["'][^>]*>/gi,
            /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*shopify[^"']*)["'][^>]*>/gi
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
        const stylePattern = /style=["']([^"']*shopify[^"']*)["']/gi;
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
            /data-store=["']([^"']*shopify[^"']*)["']/gi,
            /data-url=["']([^"']*shopify[^"']*)["']/gi
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

        // Look for shopify.com/s/ URLs
        const shopifySPattern = /https?:\/\/shopify\.com\/s\/([a-zA-Z0-9-]+)/gi;
        const shopifySMatch = str.match(shopifySPattern);
        if (shopifySMatch) {
            return shopifySMatch[0];
        }

        // Look for store names that could be converted to myshopify.com
        const storeNamePattern = /"([a-zA-Z0-9-]+)"[^"]*shopify/gi;
        const storeNameMatch = str.match(storeNamePattern);
        if (storeNameMatch) {
            const storeName = storeNameMatch[1];
            if (storeName.length > 2) {
                return `https://${storeName}.myshopify.com`;
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