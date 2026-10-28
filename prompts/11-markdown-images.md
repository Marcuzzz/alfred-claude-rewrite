---
title: Clean up Markdown with images
subtitle: Same cleanup, plus alt text and placement of images
markdown: true
extends: markdown
---

<!-- Claude only sees the image references, not the pictures, so it works from the path, the existing alt text and the surrounding text. -->

Also handle the images (![alt](path) and <img> tags).

- Keep every image and never change its path or URL.
- Give each image short, descriptive alt text, based on the existing alt text, the filename and the surrounding text; do not describe details you cannot know. If nothing tells you what an image shows (for example IMG_0231.png with no caption or nearby reference), keep its alt text as it was, or use a neutral word such as "Screenshot".
- Place each image right after the paragraph that refers to it, on its own line with blank lines around it, and move it into the section it belongs to if the headings change.
- Count images as content when judging whether a section needs its own heading, for example a run of screenshots for one step.
- If the text refers to an image ("see below", "the screenshot"), make sure the reference still matches where the image ends up.
