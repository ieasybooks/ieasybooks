# ieasybooks

The landing page for [EasyBooks](https://ieasybooks.com), a non-profit initiative making Islamic knowledge easier to reach.

## Running locally

Plain HTML, CSS and JavaScript, with no build step or dependencies. Serve the repository root:

```sh
python3 -m http.server
```

Then open http://localhost:8000/ar/ (Arabic) or http://localhost:8000/en/ (English).

## Files

- `ar/index.html`, `en/index.html`: the Arabic and English pages.
- `assets/js/projects.js`: the projects, with their descriptions, dates and links.
- `assets/js/book.js`: builds the book and turns its pages.
- `assets/js/motifs.js`: each project's animated illustration.
- `assets/css/site.css`: the styles.

## Adding a project

1. Add an entry to `projects` in `assets/js/projects.js`. The newest project goes first. Each field is described at the top of the file.
2. Add the project to the `<noscript>` list in `ar/index.html` and `en/index.html`.

## Deployment

Netlify deploys `main`.

## License

Source code: MIT. Project logos belong to their respective projects.
