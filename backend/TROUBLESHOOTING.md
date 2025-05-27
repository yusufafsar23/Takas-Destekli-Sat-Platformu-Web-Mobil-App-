# Takas Platform Troubleshooting Guide

This document outlines common issues that might occur in the Takas Platform and their solutions, particularly around API connectivity between the mobile app and backend server.

## Connection Issues

### API URL Configuration

The mobile app must use the correct IP address to communicate with the backend:

- **iOS Devices**: Using `10.196.150.126:5000` 
- **Android Emulators**: Using `10.0.2.2:5000` (Android emulator maps this to the host's localhost)
- **Android Physical Devices**: Using the same IP as iOS devices

If you experience connection issues, check the API URL in `mobile-new/services/api.js` to ensure it's configured correctly for your development environment.

### Request Timeouts

Timeouts have been increased to 30 seconds to accommodate slower network connections and server processing time:

```javascript
// In mobile-new/services/api.js
const api = axios.create({
  // ...other config
  timeout: 30000, // 30 seconds
});
```

## Data Format Issues

### Response Structure

The backend API consistently returns data in the following format:

```javascript
{
  success: true,  // or false if there was an error
  count: X,       // number of items in data array (for collection endpoints)
  data: [...]     // array of items or single object
}
```

All API services in the mobile app have been updated to properly handle this format.

### MongoDB ID Mapping

MongoDB uses `_id` for document IDs, while the frontend expects `id`. Solutions:

1. Backend transforms MongoDB documents to include both `_id` and `id`
2. Frontend services handle both formats

### Common Errors

#### "categories.map is not a function"

This error occurs when:
- The response format is unexpected
- The `data` property is not an array
- The response is `null` or `undefined`

The fix:
- Added proper null/undefined checks
- Standardized response handling across all services
- Added fallback return values to prevent crashes

#### Network Request Failures

When network requests fail:
1. The app automatically switches to offline mode
2. A visible indicator shows the offline status
3. Cached data is used when available

## Authentication Issues

### Login Path

Make sure you're using the correct authentication endpoint paths:
- ✅ `/users/login` - Correct
- ❌ `/auth/login` - Incorrect

### Token Storage

The app uses `AsyncStorage` to store authentication tokens:
- `authToken`: Main JWT token
- `refreshToken`: Used for silently refreshing expired sessions
- `user`: Cached user data

## Testing Credentials

A test user is available for development and testing:
- Email: `test@example.com`
- Password: `test123`

## Debugging Tools

We've added two debugging scripts to the backend:

1. **test-data.js**: Tests database connectivity and verifies collections
   ```
   node test-data.js
   ```

2. **test-api.js**: Tests API endpoints and authentication
   ```
   node test-api.js
   ```

## Deployment Considerations

When deploying to production:

1. Update the API URL to your production server
2. Ensure CORS is properly configured in the backend
3. Set up proper error monitoring and logging
4. Consider implementing API versioning to prevent breaking changes
5. Configure proper SSL/TLS for secure connections 