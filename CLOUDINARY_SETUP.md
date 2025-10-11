# Cloudinary Configuration for Railway

## Option 1: Single CLOUDINARY_URL (Recommended)

Add this single environment variable to Railway:

```
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
```

Example:

```
CLOUDINARY_URL=cloudinary://123456789012345:abcdefghijklmnopqrstuvwxyz1234567890abcd@dl21tw8na
```

## Option 2: Separate Variables (Alternative)

Or add these three separate variables:

```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## How to get these values:

1. Go to https://cloudinary.com/users/register/free
2. Create a free account (52GB storage, 25 credits/month)
3. Go to Dashboard
4. Copy the **Environment variable** (CLOUDINARY_URL) - this is the easiest way
5. Or copy individual Cloud Name, API Key, and API Secret

## In Railway:

1. Go to your project dashboard
2. Click on your service
3. Go to Variables tab
4. Add **CLOUDINARY_URL** variable with the full URL
