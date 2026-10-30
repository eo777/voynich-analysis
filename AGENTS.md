# Article and theme boundaries

- Edit article prose in `articles/<slug>/index.md`; media descriptions and references belong in its `media.yml`.
- Keep CSS, HTML templates, component layout, and chart presentation in `theme/`. Do not add inline styles or article-specific HTML/JavaScript to Markdown files.
- Article `images/` and `data/` are an explicit publication boundary. Do not copy research workspaces, caches, private notes, correspondence, or withdrawn results into this repository.
- The initial article uses the current line-preserving poetry controls. Do not restore the earlier VMS-transplant comparison charts or withdrawn Markov spatial results.
- Normal pushes preserve history. When the user requests a history reset, use the opt-in `npm run publish:squash -- --apply` workflow documented in README.md. It replaces this blog's main history with the current checked snapshot, using an explicit remote lease. Never bypass its clean-tree, branch, or remote-change checks, and never restore old history by merging an obsolete clone.
- Run `npm test` and `npm run check` after changes. `_site/` is generated and must not be committed.
- New public articles should state the tested statistic, its null, and the scope of the claim. The current pairwise maps are descriptive, not H2 or uniqueness tests.
