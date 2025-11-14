import sanitizeHtml from 'sanitize-html';

export const sanitizeHtmlServer = (html: string): string =>
  sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags,
    allowedAttributes: {
      '*': ['class', 'id', 'style', 'title', 'alt', 'aria-*'],
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'srcset', 'sizes', 'width', 'height'],
    },
    allowedSchemes: ['http', 'https', 'data'],
    allowVulnerableTags: false,
  });
