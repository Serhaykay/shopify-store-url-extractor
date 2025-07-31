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
            // First, try to fetch the page and analyze it
            const response = await fetch(url, {
                method: 'GET',
                mode: 'no-cors' // This might not work due to CORS, so we'll have fallback methods
            });

            // Since CORS might block us, we'll use multiple strategies
            return await analyzeUrlForShopify(url);
        } catch (error) {
            // If fetch fails, use URL analysis only
            return await analyzeUrlForShopify(url);
        }
    }

    async function analyzeUrlForShopify(url) {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        
        // Common Shopify patterns
        const shopifyPatterns = [
            // Direct Shopify store URLs
            /\.myshopify\.com$/,
            /\.shopify\.com$/,
            
            // Custom domains that might be Shopify
            /\.com$/,
            /\.net$/,
            /\.org$/,
            /\.co$/,
            /\.io$/,
            /\.store$/,
            /\.shop$/
        ];

        // Check if it's already a Shopify URL
        if (hostname.includes('myshopify.com') || hostname.includes('shopify.com')) {
            return url;
        }

        // Try to construct the myshopify.com URL
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

        // Alternative: try to find Shopify store name from the domain
        let storeName = '';
        
        // Extract potential store name from domain
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
            if (name.length > 2) { // Minimum length for Shopify store names
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