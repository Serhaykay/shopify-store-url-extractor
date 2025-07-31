# Shopify Store URL Extractor Chrome Extension

A Chrome extension that helps you extract the original Shopify store URL from any website URL. This tool is particularly useful for developers, marketers, and researchers who need to identify the underlying Shopify store behind custom domains.

## Features

- 🔍 **Smart URL Analysis**: Automatically detects Shopify stores from various URL patterns
- 🎯 **Multiple Detection Methods**: Uses domain analysis, meta tag scanning, and script detection
- 📋 **One-Click Copy**: Copy extracted URLs to clipboard with a single click
- 🎨 **Modern UI**: Clean, professional interface with smooth animations
- ⚡ **Fast Performance**: Lightweight and responsive design
- 🔒 **Privacy Focused**: No data collection or external API calls

## Installation

### Method 1: Load Unpacked Extension (Recommended for Development)

1. Download or clone this repository to your local machine
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the folder containing this extension
5. The extension should now appear in your extensions list

### Method 2: Install from Chrome Web Store (When Available)

1. Visit the Chrome Web Store (link will be provided when published)
2. Click "Add to Chrome"
3. Confirm the installation

## Usage

### Basic Usage

1. Click the extension icon in your Chrome toolbar
2. Enter a website URL in the input field
3. Click "Extract" to analyze the URL
4. View the results showing both the original URL and the extracted Shopify store URL
5. Use the "Copy" button to copy the Shopify URL to your clipboard

### Advanced Features

#### Auto-Detection on Shopify Stores

When you visit a Shopify store, the extension automatically detects it and can provide the original myshopify.com URL.

#### Multiple URL Patterns Supported

The extension can handle various URL formats:
- Custom domains (e.g., `https://mystore.com`)
- Subdomains (e.g., `https://shop.mystore.com`)
- Direct Shopify URLs (e.g., `https://mystore.myshopify.com`)

## How It Works

The extension uses multiple detection strategies:

1. **Domain Analysis**: Extracts potential store names from domain names
2. **Meta Tag Scanning**: Looks for Shopify-specific meta tags
3. **Script Analysis**: Detects Shopify-related scripts and CDN links
4. **Pattern Matching**: Uses common Shopify URL patterns
5. **Fallback Methods**: Provides best-guess URLs when exact matches aren't found

## Technical Details

### Files Structure

```
├── manifest.json          # Extension configuration
├── popup.html            # Main popup interface
├── popup.css             # Styling for the popup
├── popup.js              # Main functionality logic
├── content.js            # Content script for page analysis
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md             # This file
```

### Permissions

- `activeTab`: Access to the current tab for analysis
- `scripting`: Ability to inject scripts for enhanced detection
- `host_permissions`: Access to web pages for URL analysis

## Development

### Prerequisites

- Google Chrome browser
- Basic knowledge of HTML, CSS, and JavaScript

### Local Development

1. Clone the repository
2. Make your changes to the code
3. Go to `chrome://extensions/`
4. Click "Reload" on the extension
5. Test your changes

### Building for Production

1. Ensure all files are properly structured
2. Test thoroughly on various Shopify stores
3. Create a ZIP file of the extension folder
4. Submit to Chrome Web Store (if publishing)

## Troubleshooting

### Common Issues

**Extension not loading:**
- Check that all files are present in the extension folder
- Verify the manifest.json syntax is correct
- Ensure Developer mode is enabled in Chrome

**URL extraction not working:**
- Make sure the URL is properly formatted (include http:// or https://)
- Check that the website is actually a Shopify store
- Try refreshing the extension

**Copy button not working:**
- Ensure the website allows clipboard access
- Try using the fallback copy method (right-click and copy)

### Debug Mode

To enable debug mode:
1. Open the extension popup
2. Right-click and select "Inspect"
3. Check the console for detailed error messages

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Guidelines

- Follow the existing code style
- Add comments for complex logic
- Test on multiple Shopify stores
- Update documentation as needed

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you encounter any issues or have questions:

1. Check the troubleshooting section above
2. Review the console for error messages
3. Create an issue on the GitHub repository
4. Contact the development team

## Changelog

### Version 1.0.0
- Initial release
- Basic URL extraction functionality
- Modern UI design
- Copy to clipboard feature
- Auto-detection on Shopify stores

## Future Enhancements

- [ ] Bulk URL processing
- [ ] Export results to CSV
- [ ] Advanced Shopify store detection
- [ ] Integration with Shopify API
- [ ] Custom domain mapping
- [ ] Historical URL tracking 