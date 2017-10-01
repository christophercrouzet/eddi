Meta Attributes
===============

## `baseURL`

**Signature**

```js
"baseURL": string
```


**Description**

Base URL for the site, e.g.: `'https://zcrou.com'`.


## `categories`

**Signature**

```js
"categories": {
  "NAME": {
    "section": string,
    "includeSection": boolean
  },
  ...
}
```


**Description**

Query to retrieve lists of categories and their meta, grouped by a given name.

The options are replaced at run-time with the categories.

See also the [`category`](#category) meta attribute.


**Options**

- `section: string` (optional)

  Filter categories belonging to a given section. Default value: `undefined`.

- `includeSection: boolean` (optional)

  Set to `true` to count the categories' section as a category itself. Useful to provide an 'all' category. Default value: `false`.


## `category`

**Signature**

```js
"category": boolean
```


**Description**

Set to `true` to mark a page as an category. Categories can be retrieved through the [`categories`](#categories) meta attribute.


## `dateCreated`

**Signature**

```js
"dateCreated": string
```


**Description**

Date of publication of the page.


## `dateUpdated`

**Signature**

```js
"dateUpdated": string
```


**Description**

Date of last modification of the page. If not set, the value of the meta attribute [`dateCreated`](#dateCreated) is used instead.


## `decks`

**Signature**

```js
"decks": {
  "NAME": {
    "title" string,
    "medias": [string, ...]
  },
  ...
}
```


**Description**

List of decks to make available to the user from within the page's content following the Markdown's container extension syntax:

```md
::: deck
NAME
:::
```

Where `NAME` is the name of the deck to render.


**Options**

- `title: string` (optional)

  Adds a HTML paragraph node at the begin of the container with the content of the title marked as `<strong></strong>`.


- `medias: [string, ...]` (optional)

  Media names to use for the deck. These media names need to reference existing medias defined in the same page through the [`medias`](#medias) meta attribute. Default value: `[]`.


## `description`

**Signature**

```js
"description": string
```


**Description**

Description for the page.


## `entries`

**Signature**

```js
"entries": {
  "NAME": {
    "section": string,
    "category": string,
    "limit": number,
    "mode": string
  },
  ...
}
```


**Description**

Query to retrieve lists of entries and their meta, grouped by a given name.

The options are replaced at run-time with the entries. Any key/value pair passed not recognized as options is propagated to the meta attributes of each entry retrieved.

See also the [`entry`](#entry) meta attribute.


**Options**

- `section: string` (optional)

  Filter entries belonging to a given section. Default value: `undefined`.

- `category: string` (optional)

  Filter entries belonging to a given category. Default value: `undefined`.

- `limit: number` (optional)

  Limit how many entries are to be retrieved. Default value: `undefined`.

- `mode: string` (optional)

  Setting the mode to `'similar'` sorts entries by similarity. Similarity is computed based on the [`keywords`](#keywords) meta attribute of each entry. Default value: `undefined`.


## `entry`

**Signature**

```js
"entry": boolean
```


**Description**

Set to `true` to mark a page as an entry. Entries can be retrieved through the [`entries`](#entries) meta attribute. This can be useful for populating a list of blog articles, feed entries, sitemap URLs, and so on. As such, pages making up the content of the site (in contrast with pages solely indexing that content) are good candidates, such as blog posts, about pages, gallery pages, and so on.


## `fields`

**Signature**

```js
"fields": {
  "dates": [string, ...],
  "urls": [string, ...],
}
```


**Description**

Date and URL fields refer to meta attribute names that are to be replaced at run-time by a JavaScript object to provide more features. For example, dates are parsed and some common attributes are exposed, such as the year, the month name, and others. The URLs are also parsed to provide `full`, `short`, and `raw` attributes.


## `galleries`

**Signature**

```js
"galleries": {
  "NAME": {
    "rowHeight": number,
    "alignToPage": boolean,
    "width": number,
    "medias": [string, ...]
  },
  ...
}
```


**Description**

List of galleries to make available to the user from within the page's content following the Markdown's container extension syntax:

```md
::: gallery
NAME
:::
```

Where `NAME` is the name of the gallery to render.


**Options**

- `rowHeight: number` (optional)

  Minimum height in pixels for each row of the gallery. Default value: `240`.

- `alignToPage: boolean` (optional)

  Set to `true` to constrain the gallery container to the page width. Default value: `false`.

- `width: number` (optional)

  Width in pixels for the gallery container if `alignToPage` is set to `false`. Default value: `undefined`.

- `medias: [string, ...]` (optional)

  Media names to use for the gallery. These media names need to reference existing medias defined in the same page through the [`medias`](#medias) meta attribute. Default value: `[]`.



## `keywords`

**Signature**

```js
"keywords": [string, ...]
```


**Description**

Keywords for the page. When the page is also marked with the `entry` meta attribute, keywords might be used to compute the similarity between entries retrieved through the `entries` meta attribute.



## `layout`

**Signature**

```js
"layout": string
```


**Description**

File name of the theme's layout template to use to render the page.


## `medias`

**Signature**

```js
"medias": {
  "NAME": {
    "src": string,
    "size": [number, number],
    "type": string,
    "alt": string,
    "poster": string,
    "link": string,
    "linkIcon": string,
    "linkText": string,
    "captions": [string, ...],
    "alignToPage": boolean,
    "fullWidth": boolean,
    "align": string,
    "shape": string,
    "captionAlign": string,
    "styles": [
      { "name": string, "value": string },
      ...
    ],
  },
  ...
}
```


**Description**

List of medias to make available to the user from within the page's content following the Markdown's image syntax:

```md
![alt](NAME)
```

Where `NAME` is the name of the media to render.


**Options**

- `src: string`

  Source path of the media.

- `size: [number, number]`

  Width and height in pixels of the media.

- `type: string` (optional)

  Type of the media, that is either `'image'` or `'video'`. Default value: `'image'`.

- `alt: string` (optional)

  Alternate text for the media when `type` is set to `'image'`. This is usually not required since Markdown's image syntax always override this value but this is useful when the media is referred by other means such as through the [`decks`](#decks) and [`galleries`](#galleries) meta attributes. Default value: `''`.

- `poster: string` (optional)

  Poster image for the media when `type` is set to `'video'`. Default value: `''`.

- `link: string` (optional)

  URL to link the media to. Default value: `undefined`.

- `linkIcon: string` (optional)

  When `link` is set, creates a HTML media link icon node with CSS classes named `media__link-icon` and `icon-ICON` where `ICON` is the value passed here. Default value: `undefined`.

- `linkText: string` (optional)

  When `link` is set, creates a HTML media link text node with a CSS class named `media__link-text` where `ICON` is the value passed here. Default value: `undefined`.

- `captions: [string, ...]` (optional)

  Creates a set of HTML media caption nodes with CSS classes named `info` and `media__caption`. Default value: `[]`.

- `alignToPage: boolean` (optional)

  Set to `true` to constrain the media to the page width. Default value: `false`.

- `fullWidth: boolean` (optional)

  Set to `true` to set the media width to 100%. Default value: `false`.

- `align: string` (optional)

  Sets a CSS class on the media HTML node with the name `media_align_ALIGN` where `ALIGN` is the value passed here. Default value: `default`.

- `shape: string` (optional)

  Sets a CSS class on the media HTML node with the name `media_shape_SHAPE` where `SHAPE` is the value passed here. Default value: `default`.

- `captionAlign: string` (optional)

  Sets a CSS class on the media HTML node with the name `media__caption_align_ALIGN` where `ALIGN` is the value passed here. Default value: `default`.

- `styles: [{ "name": string, "value": string }, ...]` (optional)

  Extra CSS styles to set on the media HTML node.


## `section`

**Signature**

```js
"section": string
```


**Description**

Section in which the page belongs to, e.g.: `'blog'`. This is useful to filter entries and categories when respectively retrieving them through the [`entries`](#entries) and [`categories`](#entries) meta attributes.


## `title`

**Signature**

```js
"title": string
```


**Description**

Title for the page.


## `uid`

**Signature**

```js
"uid": string
```


**Description**

Unique ID for a page. Useful for identifying entries in a feed.
