#!/bin/bash

echo "🚀 Shopify Store URL Extractor - Deployment Script"
echo "=================================================="

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git repository not initialized. Please run 'git init' first."
    exit 1
fi

# Check if we have commits
if ! git rev-parse HEAD >/dev/null 2>&1; then
    echo "❌ No commits found. Please commit your changes first."
    exit 1
fi

echo "✅ Git repository is ready"
echo ""

echo "📋 Next steps to deploy to GitHub:"
echo "1. Go to https://github.com/new"
echo "2. Create a new repository named 'shopify-store-url-extractor'"
echo "3. Make it public"
echo "4. Don't initialize with README (we already have one)"
echo "5. Copy the repository URL"
echo ""

echo "🔗 After creating the repository, run these commands:"
echo "git remote add origin https://github.com/YOUR_USERNAME/shopify-store-url-extractor.git"
echo "git branch -M main"
echo "git push -u origin main"
echo ""

echo "📦 Files ready for deployment:"
ls -la | grep -E "\.(json|js|html|css|md|svg)$"
echo ""

echo "🎯 Extension files:"
echo "- manifest.json (extension configuration)"
echo "- popup.html (main interface)"
echo "- popup.css (styling)"
echo "- popup.js (functionality)"
echo "- content.js (page analysis)"
echo "- icons/ (extension icons)"
echo "- README.md (documentation)"
echo ""

echo "📖 Installation instructions for users:"
echo "1. Download or clone this repository"
echo "2. Open Chrome and go to chrome://extensions/"
echo "3. Enable 'Developer mode'"
echo "4. Click 'Load unpacked' and select this folder"
echo "5. The extension will appear in your toolbar"
echo ""

echo "✨ Your Chrome extension is ready to deploy!" 