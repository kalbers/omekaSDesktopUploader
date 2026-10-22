Omeka Desktop Upload
====================
Organize local files, describe them with metadata, and upload them to an
[Omeka S][] site through its API.

Omeka Desktop Upload is based on [Tropy][], an open-source desktop application
designed and produced by an international team of historians and software
developers. It keeps Tropy's item, photo, and metadata model and replaces the
research-management features with an Omeka S uploader.

[Omeka S]: https://omeka.org/s/
[Tropy]: https://tropy.org

Features
--------
- Projects are single `.odu` files that link to your files where they are.
- Items hold one or more photos, described with metadata from templates and
  vocabularies (Dublin Core and others). Lists organize items.
- **Upload to Omeka S** sends items, their photos, and their notes to an Omeka S
  site. Each uploaded resource is remembered, so uploading again updates the
  existing Omeka items instead of creating duplicates. Lists become item sets.
- **Export to CSV** writes items in a form the Omeka S *CSV Import* module can
  map automatically.
- Omeka S connection settings (API URL, key identity and credential, resource
  template) are global and found in Preferences. The credential is encrypted
  with the operating system's keychain when available.

Requirements
------------
Install [Node.js][] 20 or later (the project's `engines` setting) and the
build tools needed for native modules on your platform.

[Node.js]: https://nodejs.org

Installation from Source
------------------------
    $ npm ci

The bundler expects a native image-processing binding that `npm ci` does not
place where it looks. Use the prebuilt one:

    $ mkdir -p node_modules/sharp/src/build/Release
    $ cp node_modules/@img/sharp-linux-x64/lib/sharp-linux-x64.node \
         node_modules/sharp/src/build/Release/

(Adjust the package name for other platforms and architectures.) The prebuilt
image libraries do not read HEIC/HEIF files.

Development
-----------
    # Compile the bundle (optionally in --watch mode)
    $ npm run rollup -- --watch

    # Run in dev mode with a throwaway data folder
    $ npx electron --app . --env development --data tmp --cache tmp/cache \
        --logs tmp/log

    # Run the tests
    $ npm test

    # View or tail the log file
    $ npm run log:view
    $ npm run log:tail

Use `--no-sandbox` if your system's Electron sandbox is not set up (see
`res/linux/INSTALL`).

Creating Builds
---------------
Compile the bundle, then run the build script with a recent Node.js (the build
tool does not run under Electron's embedded Node):

    $ npm run clean && npm run rollup
    $ npx -y node@22 --disable-warning=ExperimentalWarning \
        scripts/build.js --platform linux --arch x64

The build is written to `dist/`. Only the Linux build has been tested.

License and Attribution
-----------------------
Omeka Desktop Upload is free software, licensed under the
[GNU Affero General Public License][agpl], version 3 or (at your option) any
later version. It is a derivative of Tropy, copyright The Tropy Developers and
Contributors (see `AUTHORS`), and includes code from the Tropy Omeka S plugin.
Third-party licenses are listed in the `LICENSE.third-party.txt` file of builds.

[agpl]: https://www.gnu.org/licenses/agpl-3.0.html
