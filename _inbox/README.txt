DROP PHOTOS HERE

1. Make a folder named exactly how you want the city to read on the site:
     _inbox/Denver, CO/          (existing city -> photos get appended)
     _inbox/Lisbon, PT/          (brand-new city)

2. Drop your raw photos in it (JPG, PNG, HEIC from iPhone all fine).

3. For a BRAND-NEW city, add a meta.json next to the photos so it shows
   up in the location picker:
     { "country": "Europe" }
   Country must be one of the COUNTRY_GROUPS labels: North America, Japan, Europe.

4. From the repo root run:
     node manage.js            (or: node manage.js --dry  to preview)

5. The script resizes/compresses each image, files it into photos_web/,
   and registers it in qwestData. Originals are moved to _inbox/_done/.

6. Open /admin to drag-reposition the new photos, then commit + push.
