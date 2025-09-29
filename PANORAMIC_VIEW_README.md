# Panoramic View Feature

This feature allows users to upload and view panoramic content in three different modes: Multiple Images, PhotoSphereViewer, and Video.

## Features

### 1. Multiple Images Mode
- Upload multiple panoramic images
- Switch between single view and grid view modes
- Navigate through images with arrow buttons or dots
- Click on grid thumbnails to view individual images

### 2. PhotoSphereViewer Mode
- Upload a single panoramic image for 360° viewing
- Interactive navigation (drag to look around, scroll to zoom)
- Built-in controls for fullscreen, download, markers, etc.
- Best with equirectangular panoramic images (2:1 aspect ratio)

### 3. Video Mode
- Upload panoramic video files
- Standard video controls with panoramic video support
- Supports MP4, WebM, and other video formats

## File Structure

```
src/
├── app/
│   ├── panoramic-view/
│   │   └── page.tsx                 # Main panoramic view page
│   └── api/
│       └── panoramic-upload/
│           └── route.ts             # API endpoint for file uploads
├── components/
│   ├── PanoramicUpload.tsx          # File upload component
│   ├── PanoramicViewer.tsx          # Main viewer component
│   ├── PhotoSphereViewer.tsx        # PhotoSphereViewer wrapper
│   └── MultipleImageViewer.tsx      # Multiple images viewer
```

## Usage

1. Navigate to the "Panoramic View" tab in the navbar
2. Select your preferred viewing mode:
   - **Multiple Images**: For browsing multiple panoramic images
   - **PhotoSphereViewer**: For interactive 360° viewing
   - **Video**: For panoramic video playback
3. Upload your files using drag-and-drop or click to select
4. View your panoramic content with the appropriate viewer

## Installation Requirements

The feature uses PhotoSphereViewer library which is included via CDN in the layout. If you want to use the npm package instead:

```bash
npm install photo-sphere-viewer
```

## Supported File Formats

### Images
- JPG/JPEG
- PNG
- WebP
- Other common image formats

### Videos
- MP4
- WebM
- Other HTML5 video formats

## Technical Details

### PhotoSphereViewer Integration
- Uses PhotoSphereViewer v5.0.0 from CDN
- Includes CSS and JavaScript from jsdelivr CDN
- Supports markers, gallery, and other plugins
- Automatic cleanup of viewer instances

### File Upload
- Files are temporarily stored as object URLs for immediate viewing
- API endpoint available at `/api/panoramic-upload` for server-side storage
- Supports drag-and-drop and click-to-upload

### Responsive Design
- Mobile-friendly interface
- Adaptive grid layouts
- Touch-friendly controls

## Customization

### PhotoSphereViewer Options
Edit `PhotoSphereViewer.tsx` to customize:
- Navigation controls
- Animation settings
- Plugin configurations
- Viewer appearance

### Upload Component
Edit `PanoramicUpload.tsx` to customize:
- File type restrictions
- Upload validation
- UI appearance
- Drag-and-drop behavior

## Troubleshooting

### PhotoSphereViewer Not Loading
- Ensure CDN links are accessible
- Check browser console for errors
- Verify panoramic image format (equirectangular recommended)

### File Upload Issues
- Check file size limits
- Verify supported file formats
- Ensure proper permissions for upload directory

### Performance
- Large panoramic images may take time to load
- Consider image optimization for web delivery
- Video files should be appropriately compressed

## Future Enhancements

Potential improvements:
- Image stitching for multiple photos
- VR/AR integration
- Cloud storage integration
- Advanced video panoramic support
- Social sharing features
- Annotation and markup tools
