# ieasybooks

The landing page for the [ieasybooks](https://github.com/ieasybooks) organization — a collection of open-source Islamic software projects.

**Production:** https://ieasybooks.com

## Development

This is a plain static site. No build step, no dependencies. To work on it locally:

```bash
python3 -m http.server 8000
```

Then open:

- Arabic: http://localhost:8000/ar/
- English: http://localhost:8000/en/
- Root redirect: http://localhost:8000/

## Adding a new project

Edit `assets/js/projects.js` and add a new object to the `projects` array. Commit and push; Netlify will deploy automatically.

## Deployment

Deployed to Netlify from `main`. `_redirects` and `netlify.toml` configure headers and URL routing.

## License

Source code: MIT. Project logos belong to their respective projects.
