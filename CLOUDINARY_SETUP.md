# Cloudinary Configuration for Image Handling

## Required Environment Variables

To enable image uploading and display, you need to set up the following environment variables in your `.env` file in the backend directory:

```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Getting Cloudinary Credentials

1. Sign up for a free Cloudinary account at https://cloudinary.com/
2. After signing up, you'll find your credentials in your dashboard
3. Copy these values to your `.env` file

## Testing Your Configuration

We've added a test script to help verify your Cloudinary setup:

```
cd backend
node utils/test-cloudinary.js
```

This script will:
- Check if your Cloudinary environment variables are set
- Test the connection to the Cloudinary API
- Provide feedback on any configuration issues

## Temporary Solution

Until Cloudinary is configured, the app will use local placeholder images from the public directory. The app has been modified to:

1. Use category-based placeholder images by default
2. Fall back to placeholder images when Cloudinary images fail to load
3. Add enhanced error logging to diagnose image loading issues

### Placeholder Images

The following placeholder images have been added for category-based fallbacks:

- `/images/product-placeholder.jpg` - Default fallback for all products
- `/images/electronics.jpg` - Fallback for electronics category
- `/images/clothing.jpg` - Fallback for clothing/apparel category
- `/images/furniture.jpg` - Fallback for furniture/home items
- `/images/books.jpg` - Fallback for books category
- `/images/sports.jpg` - Fallback for sports equipment

These images are automatically selected based on the category name of each product.

## Image Handling Improvements

The following files have been updated to improve image handling:

1. `frontend/src/pages/ProductDetail.js` - Added better image URL handling and fallbacks
2. `frontend/src/pages/ProductList.js` - Improved image display in product cards
3. `frontend/src/services/api.js` - Enhanced debugging for API requests
4. `backend/controllers/productController.js` - Added detailed logging for product and image data

## Testing Your Setup

After configuring Cloudinary:

1. Restart your backend server
2. Try uploading a new product with images
3. Verify that the images appear correctly in both product list and detail views

## Troubleshooting

If images are still not displaying correctly after Cloudinary setup:

1. Check the browser console and server logs for image-related errors
2. Verify that your Cloudinary credentials are correct in the `.env` file
3. Ensure that your Cloudinary account has sufficient storage and bandwidth
4. Try clearing your browser cache or using incognito mode to view the site 