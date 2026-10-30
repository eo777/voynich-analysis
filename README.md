# Voynich analysis

A Markdown-first home for analyses of the Voynich manuscript.

**Site:** https://eo777.github.io/voynich-analysis/

## Edit an article

Edit `articles/<article-name>/index.md`. This is the source of the prose; generated HTML is not committed. The first article is:

`articles/local-word-similarity/index.md`

The short YAML block at the top controls the title, date, summary, tags, status, and whether the article is a draft. Write the rest in normal Markdown. The live article includes an **Edit this article** link to the Markdown file on GitHub.

Push changes to `main` and the Pages workflow tests, builds, checks links, and publishes the site. Pull requests run the same checks without publishing.

## Insert a figure, chart, or gallery

Place a reference on its own line, separated from nearby prose by blank lines:

```text
::figure[verse-pages]

::chart[similarity-explorer]

::gallery[comparison-sheets]
```

Define the names in that article’s `media.yml`:

```yaml
figures:
  example:
    title: A descriptive figure title
    src: images/example.png
    download: images/example.svg
    alt: Describe the content of the figure.
    caption: Explain what the reader should notice.
charts:
  explorer:
    title: An interactive comparison
    type: heatmap
    data: data/heatmaps.json
    fallback: images/example.png
    preset:
      corpus: voynich
      metric: js
      coordinates: continuous
      layout: regular
galleries:
  comparisons:
    title: Compare the figures
    items:
      - figure:example
      - chart:explorer
```

Captions, alt text, chart selections, and gallery order are content. CSS classes, HTML structure, colors, sizing, and behavior are not stored here. Standard Markdown images and links also work; use relative paths such as `images/example.png` and `data/results.json`.

Every article gets an automatic `/articles/<article-name>/gallery/` page containing all its figures and charts. Images support full-size viewing. Galleries support arrow keys, Home/End, and keyboard focus. Native chart modules work inline and in galleries.

## Link to a section or chart

Each heading has a **Link** control, and figures and charts have **Copy link** controls. Click to copy the full URL; you can also right-click the link. A gallery figure link opens its panel automatically. Interactive-chart links preserve the selected text, metric, coordinates, and spacing.

Heading IDs normally follow their titles: `## What the coordinates mean` becomes `#what-the-coordinates-mean`. For a permanent ID that survives rewriting the title, use:

```markdown
## What the coordinates mean {#coordinates}

[See the method](#coordinates)
```

Inline media IDs use their names from `media.yml`: `#figure-verse-pages`, `#chart-similarity-explorer`, or `#gallery-comparison-sheets`. A figure inside a gallery uses `#gallery-comparison-sheets-figure-js-continuous`. These do not depend on its order in the article or gallery. Keep media names and explicit heading IDs unchanged to preserve shared links. Repeated headings get numbered suffixes; give them explicit IDs if their ordering may change. The build checks fragment targets and rejects duplicate IDs.

## Deliberately replace publication history

Ordinary commits and pushes preserve history. To remove earlier article versions from the blog's active history, commit the reviewed current files **locally**, then run:

```sh
npm run publish:squash
npm run publish:squash -- --apply
```

The first command previews only. The second runs tests and publication checks, then publishes one parentless snapshot with exactly the current committed files. **This resets history for the entire blog repository, including every article and the theme.** It is not a selective per-article edit or a squash merge. The removed history cannot be restored from the new main branch.

The command requires a clean checkout on `main`, the expected blog remote, no other local or remote branches or tags, and all remote changes incorporated locally. It uses an explicit `--force-with-lease` value, so a newer remote update is not overwritten. Checks that fail must be resolved, not bypassed. After a reset, other contributors should re-clone or carefully reset their checkout; merging an obsolete branch can restore the old history. The command is never run automatically by Pages.

This removes the earlier commits from main's ancestry; it **does not guarantee erasure** of GitHub cached commit views, PR refs, Actions artifacts, local reflogs, forks, or other clones. Remove affected Actions artifacts/runs separately when necessary. See [GitHub's history-removal guidance](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository) for retention limits. GitHub Support does not generally purge non-sensitive material on request. Keep unpublished material out of this public repository in the first place.

## Add another analysis

1. Copy `articles/_template/` to `articles/your-short-title/`.
2. Edit `index.md` and its metadata. Keep `draft: true` until ready.
3. Add images under `images/`, small display data under `data/`, and media definitions in `media.yml`.
4. Set `draft: false`, run the checks, and commit.

Draft article pages **and their assets** are omitted from the published site. Repository files themselves are public, so do not commit private notes or correspondence.

## Preview locally

Node.js 22 or later is required; CI uses Node 24.

```sh
npm ci --ignore-scripts
npm test
npm run check
npm run serve
```

Open `http://127.0.0.1:4173/voynich-analysis/`. Re-run `npm run build` after edits and refresh. A different port can be set using the `PORT` environment variable.

## Project structure

```text
articles/                 Markdown, metadata, per-article media and data
  local-word-similarity/
    index.md              Article prose
    media.yml             Figure/chart definitions and gallery order
    images/               Exported figures
    data/                 Compact display data and provenance
theme/
  templates/              Shared Nunjucks page and component layouts
  assets/site.css         All page styling and design tokens
  assets/site.js          Shared galleries, image viewer, chart loading
  charts/                 Shared native JavaScript chart implementations
tools/                    Static build, validation, preview server
tests/                    Authoring, publication, and data-contract checks
.github/workflows/        GitHub Pages deployment
_site/                    Generated output; ignored by Git
```

The site uses markdown-it for Markdown, YAML for metadata, and Nunjucks for shared templates. Raw HTML inside article Markdown is escaped so article files do not become an alternative theme layer.

## Designer handoff

See [THEME.md](THEME.md). Theme work should normally affect only `theme/`; no article rewrites are needed. The article model and `data-*` hooks are the interface between content and presentation.

## Publication boundary

This repository is independent of the research workspace. There is no automatic copy of that workspace and no dependence on it during the site build. Only published articles, their `images/` and `data/` folders, and shared browser assets enter `_site/`. The build fingerprints assets, verifies project-path-safe links, and emits `build-manifest.json`. It rejects missing media references rather than silently omitting figures.

The first article exports the current line-preserving poetry study. The export contains compact heatmap fields and figure files, not source transcriptions, research caches, correspondence, withdrawn Markov evidence, or earlier poetry transplant charts. Input hashes and validation are recorded in the article’s `data/provenance.json`. Existing research results are not recomputed by the website.

GitHub Pages must use **GitHub Actions** as its publishing source. The workflow deploys only `_site/`. Normal publication retains Git history; the separate, opt-in snapshot command above resets it only when deliberately invoked.
