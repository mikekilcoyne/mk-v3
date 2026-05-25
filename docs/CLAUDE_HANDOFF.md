# Project Handoff for Claude

## Overview
We've been building the initial "V3.0" website for Michael Kilcoyne. The goal is a premium, simple, dark-aesthetic single-page experience.

## Current State
- **Files**: Built entirely with vanilla `index.html`, `style.css`, and `script.js`.
- **Background Video**: A Vimeo embed (`https://player.vimeo.com/video/839812275`) loops the first 15 seconds in the background seamlessly.
- **Hero Typing Effect**: Javascript types out "Hi, I'm Michael Kilcoyne, and I love..." and loops through various passions ("BREAKFAST CLUB", "ADVENTURES", "MAKING MOVIES", "Making Your Dreams Come True") with custom fonts and glows.
- **Buttons**: Styled minimally (square, transparent background, bold) for a high-end fashion brand feel. "Contact Me" opens a `mailto` link.
- **Qwest Photo Roll**: Clicking "Follow My Qwest" opens a full-screen photo overlay. You can use Left/Right arrow keys to swipe between full-screen photos. The location title text (`#qwest-location`) has been set to massive `15vw` font size per the latest request.

## Pending Tasks to Finalize
1. **Photo Integration**: The user added a bunch of image files into the local folder `PHOTOS_FOR_SITE`. 
2. **Action Required in `script.js`**: Update the `qwestData` array (around line 133). Replace the placeholder Unsplash URLs with the actual local paths to the user's photos (e.g., `"PHOTOS_FOR_SITE/IMG_2486.jpg"`). 
3. **Location Grouping**: Group the 31 photos from the `PHOTOS_FOR_SITE` directory into the three requested locations:
   - "Biarritz, FR"
   - "Rotterdam, NL"
   - "Williamsburg, BK"
   *(Note: Since the photos lack EXIF GPS data, group them logically or ask the user how they want the specific files divided between the locations).*

You're good to take it from here!
