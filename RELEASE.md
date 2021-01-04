# New release

Checkout the `master` branch.
If you do not have `sign-git-tag` enabled run:

    npm config set sign-git-tag true

Update the version in `package.json` and create a Git tag by running:

    npm version $VERSION

where `$VERSION` is the version that will be published on both PyPI and NPM, e.g. `0.2.0-rc.0` or `0.2.0`.
The Git tag will automatically have a `v` prefix: `v$VERSION`.

Push `master` and the new tag to the git remote:

    git push origin master --follow-tags

The packages will be published by a [GitHub workflow](./.github/workflows/build.yml).
