# Agent Deploy Prompt

Use this prompt with a GitHub-authenticated agent:

```text
Deploy the current repository to GitHub Pages.

Requirements:
1. If the current directory is not already a git repository, initialize it.
2. Create or use a GitHub repository. Suggested repository name: geeknexus-agentbox.
3. Push the current static website files to the main branch.
4. Enable GitHub Pages. Prefer the repository workflow at .github/workflows/pages.yml and deploy the static page through GitHub Actions.
5. After deployment completes, send me the public URL. It should look similar to:
   https://username.github.io/geeknexus-agentbox/

This is a pure static HTML/CSS website and does not need a build command.
```
