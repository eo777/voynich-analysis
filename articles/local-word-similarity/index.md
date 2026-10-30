---
title: "Local word similarity: Voynich, poetry, and historical prose"
date: "2026-10-30"
summary: "Six texts, three spelling metrics, and two coordinate systems. A comparison of observed local structure with length-matched word shuffles, preserving the poetry’s source lines."
status: "Exploratory analysis"
tags: [spatial structure, poetry controls, word similarity]
draft: false
---

Words can resemble the words near them for several reasons. A manuscript may repeat expressions, arrange verse around recurring positions, or draw on nearby written material. A map of similarity alone does not distinguish these possibilities. The useful comparison is between the observed arrangement and a shuffled arrangement that preserves specified features of the text.

This study compares the Voynich manuscript with **Towneley Creation**, Virgil’s **Aeneid**, and historical prose attributed to **Rhazes**, **Galen**, and the German **Gart der Gesundheit**. It shows three spelling metrics in both ordinal and continuous spatial coordinates. Each comparison has three panels: the observed values, the mean of length-matched shuffles, and their difference.

The figures reveal position-dependent structure in both Voynich and poetry. They do not establish a unique explanation for that structure.

## Preserve the verse before comparing it

The poetry controls use independent, left-aligned pages with a ragged right edge. Every supplied source line occupies one physical row. Word boxes are sized from character counts; long lines are not wrapped into manuscript frames.

Towneley Creation contributes **267 source lines and 1,728 words**. The Aeneid contributes **9,888 source lines and 63,716 words** from its twelve-book electronic transcription. These are the source edition’s line breaks, including its editorial irregularities. They should not be treated as a new diplomatic transcription of either historical document.

::figure[verse-pages]

The regular layout has a consistent left margin and spacing. Two additional settings introduce bounded variation in left alignment, gaps between words, vertical spacing, and character advance. The text, synthetic page assignment, and shuffle draws stay fixed across these settings. That allows changes in the continuous maps to be inspected without changing the words being compared.

Pagination is deliberately explicit: **48 source lines per synthetic page**, with a new page at each book boundary. This is a line-preserving control, not an exact reconstruction of historical pagination, indentation, stanza gaps, or handwriting. The underlying typesetting tool can accept those details when they are available.

## Explore the three metrics

**Identity** counts exact matches between normalized word spellings. **Exactly one edit** counts pairs at ordinary Levenshtein distance 1: one insertion, deletion, or substitution. It excludes identical words. The same ordinary edit rule is used across all six texts; Voynich is scored on its EVA transcription characters. This differs from the weighted manuscript-specific distance 1–2 used in the earlier Timm reconstruction.

**JS similarity** compares within-word feature distributions. It is expressed as `100 × (1 − sqrt(JSD₂))`, so larger values mean greater similarity. The historical texts use adjacent letter pairs. Voynich uses adjacent Zattera component pairs, following the existing manuscript JS run. Exact spelling matches are included, and distinct spellings can also have identical feature distributions. This is a spelling-composition measure, not a semantic measure.

::chart[similarity-explorer]

The native chart above lets you select a text, metric, coordinate system, and poetry spacing setting. Its data are available as JSON, and the current view can be exported as SVG. The complete comparison sheets below place all six texts together.

## Compare all six texts

::gallery[comparison-sheets]

The **third column** subtracts the shuffle mean from the observed value. Red indicates excess similarity and blue indicates a deficit under that particular null. Each text has its own color scale, stated beside the plots. The scales stay fixed across that text’s three spacing settings, but equal-looking colors in different rows need not represent equal numerical effects.

Towneley Creation shows an above-target excess in the JS and identity maps when its source lines are preserved. The pattern remains visible across the three chosen spacing settings. The Aeneid’s JS excess is smaller. Voynich also shows an above-target band of excess, while the historical prose maps generally show less conspicuous above-line organization in these displays. The one-edit maps provide a separate view because exact repetitions do not contribute to that metric.

These are descriptions of the displayed surfaces. They are not pixelwise significance claims, a familywise test of the maps, or evidence that poetry and Voynich share the same text-generation mechanism.

## What the coordinates mean

The **ordinal** maps use positions in transcribed lines: how many lines above the target, and how many word positions to either side. For the controls, the upper window covers nine preceding lines and offsets −5 through +5, with five predecessor positions on the current line. Original word slots are retained, including one-character words that are not scored.

The **continuous** maps use the full word rectangles. A Gaussian is integrated over each source and target box, with total mass one per box. The widths are 0.75 page-median word advances horizontally and 0.50 line pitches vertically. The display grid samples a continuous field; input word coordinates are not first assigned to horizontal bins. The controls include all columns in the preceding nine physical rows and earlier words on the current row.

The manuscript retains the original JS-run eligibility: compacted positions after excluding one-character words, geometry-valid and feature-safe pairs, a same-page window, and ordinal candidates extending six positions to either side above the target. The new identity and one-edit manuscript maps use exactly that same **1,622,820-pair** population and its permutation draws. This aligns the three manuscript metrics with one another, while preserving the documented differences from the controls.

The star marks the target. Later words on its current line are excluded. Words on earlier lines can lie physically to its right and still be eligible. The current-line strip is drawn separately, so its thickness is schematic. Horizontal and vertical axes have different normalization units and do not preserve physical angles.

## What is held fixed by the shuffles?

The composite sheets use **within-line, exact-character-length permutations**. Each shuffle reassigns words only among eligible slots of the same character length in the same line. The null therefore preserves each line’s vocabulary and length pattern while disrupting its arrangement across positions. Geometry is held fixed.

There are **999 draws** for Voynich and both poetry controls, and **199 draws** for each historical prose control. The poetry’s regular, mild, and more-dispersed layouts use identical permutations. For those independently typeset controls, replaying actual same-length shuffled inputs reproduced every box and line record.

The poetry calculations also include a within-page, exact-length null. The sheets and interactive explorer here deliberately use the within-line null throughout. No new p-values are assigned to these maps.

## What this comparison supports

The layout correction matters: preserving verse lines exposes organized spatial similarity that should not be judged from a transplantation into a different page geometry. Ordinary poetry can therefore supply a meaningful positive control for some kinds of position-dependent excess over within-line shuffling.

The results do **not** show that the manuscript is poetry or that nearby copying uniquely explains it. Feature definitions, candidate windows, eligibility, sample sizes, and synthetic pagination still differ across the texts. A tighter claim of uniqueness would require a matched and explicitly tested statistic, beyond the appearance of these heatmaps.

For now, the defensible result is a set of reproducible descriptive comparisons, with the choices that define them made visible.

## Sources and calculation record

- Torsten Timm, [*Co-Occurrence Patterns in the Voynich Manuscript* (2016)](https://arxiv.org/abs/1601.07435), provides the background for the offset comparison. These charts are not an exact numerical replication of its tables.
- [Towneley Plays electronic source](https://blocksclass.com/libr/TownleyPlays.htm), based on the England and Pollard edition, and the [Aeneid Latin collection](https://sacred-texts.com/cla/virgil/aen/index.htm) identify the poetry sources. The normalization and source fingerprints are recorded below.
- [Chart data](data/heatmaps.json) and [provenance and validation](data/provenance.json) record the displayed values, input fingerprints, and checks. Original article wording remains editable independently of the figures and shared site theme.
