---
date: 2019-07-24
location: Brooklyn
title: Steaknight 2019
---

# Steaknight Interactive Timeline

## SvelteKit + Markdown Implementation Spec

### Step-by-Step Build Instructions for Codex

------------------------------------------------------------------------

# PROJECT GOAL

Build a SvelteKit site that:

1.  Uses local Markdown (.md) files for timeline entries
2.  Renders Markdown using mdsvex
3.  Generates dynamic routes for each article
4.  Creates a timeline index page sorted by date
5.  Is structured for future interactive enhancements
6.  Is clean, scalable, and production-ready

This will be the foundation for an interactive Steaknight archive.

------------------------------------------------------------------------

# STEP 1 --- CREATE THE SVELTEKIT PROJECT

Run in terminal:

npx sv create steaknight-site cd steaknight-site npm install npm run dev
-- --open

Confirm the project runs locally before proceeding.

------------------------------------------------------------------------

# STEP 2 --- INSTALL MARKDOWN SUPPORT (mdsvex)

npm install -D mdsvex

------------------------------------------------------------------------

# STEP 3 --- CONFIGURE mdsvex

Create: mdsvex.config.js (project root)

import { defineMDSveXConfig } from 'mdsvex';

export default defineMDSveXConfig({ extensions: \['.md', '.svx'\] });

Update svelte.config.js:

import adapter from '@sveltejs/adapter-auto'; import { mdsvex } from
'mdsvex'; import mdsvexConfig from './mdsvex.config.js';

const config = { extensions: \['.svelte', '.md', '.svx'\], preprocess:
\[ mdsvex(mdsvexConfig) \], kit: { adapter: adapter() } };

export default config;

------------------------------------------------------------------------

# STEP 4 --- CREATE CONTENT STRUCTURE

Create:

src/content/articles/

------------------------------------------------------------------------

# STEP 5 --- CREATE SAMPLE MARKDOWN ENTRY

Example: src/content/articles/steaknight-2019.md

# Steaknight 2019

This was the year everything escalated.

------------------------------------------------------------------------

# STEP 6 --- BUILD CONTENT LOADER

Create: src/lib/server/posts.js

import fs from 'fs'; import path from 'path'; import matter from
'gray-matter';

const postsDir = 'src/content/articles';

export function getAllPosts() { return
fs.readdirSync(postsDir).map((filename) =\> { const slug =
filename.replace(/.md\$/, ''); const filePath = path.join(postsDir,
filename); const fileContent = fs.readFileSync(filePath, 'utf-8');

    const { data, content } = matter(fileContent);

    return {
      slug,
      ...data,
      content
    };

}); }

Install dependency:

npm install gray-matter

------------------------------------------------------------------------

# STEP 7 --- CREATE DYNAMIC ARTICLE ROUTE

Create folder:

src/routes/articles/\[slug\]/

+page.server.js

import { getAllPosts } from '\$lib/server/posts'; import { error } from
'@sveltejs/kit';

export function load({ params }) { const posts = getAllPosts(); const
post = posts.find((p) =\> p.slug === params.slug);

if (!post) { throw error(404, 'Post not found'); }

return { post }; }

+page.svelte

```{=html}
<script>
  export let data;
</script>
```
`<svelte:head>`{=html}
```{=html}
<title>
```
{data.post.title}
```{=html}
</title>
```
`</svelte:head>`{=html}

```{=html}
<article>
```
```{=html}
<h1>
```
{data.post.title}
```{=html}
</h1>
```
```{=html}
<p>
```
{data.post.date}
```{=html}
</p>
```
{@html data.post.content}
```{=html}
</article>
```

------------------------------------------------------------------------

# STEP 8 --- CREATE TIMELINE INDEX PAGE

src/routes/articles/+page.server.js

import { getAllPosts } from '\$lib/server/posts';

export function load() { const posts = getAllPosts().sort((a, b) =\> new
Date(b.date) - new Date(a.date) );

return { posts }; }

src/routes/articles/+page.svelte

```{=html}
<script>
  export let data;
</script>
```
```{=html}
<h1>
```
Steaknight Timeline
```{=html}
</h1>
```
```{=html}
<ul class="timeline">
```
{#each data.posts as post}
```{=html}
<li>
```
``<a href={`/articles/${post.slug}`}>``{=html}
```{=html}
<h3>
```
{post.title}
```{=html}
</h3>
```
```{=html}
<p>
```
{post.date}
```{=html}
</p>
```
`</a>`{=html}
```{=html}
</li>
```
{/each}
```{=html}
</ul>
```

------------------------------------------------------------------------

# STEP 9 --- CREATE GLOBAL LAYOUT

src/routes/+layout.svelte

```{=html}
<script>
  export let data;
</script>
```
```{=html}
<main>
```
`<slot />`{=html}
```{=html}
</main>
```

------------------------------------------------------------------------

# SUCCESS CRITERIA

The project is complete when:

-   Markdown files render correctly
-   Timeline index sorts by date
-   Individual pages load dynamically
-   Adding a new .md file automatically creates a new route

END OF SPEC
