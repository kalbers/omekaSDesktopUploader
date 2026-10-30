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
- [Node.js][] 22 (see `.nvmrc`; 20 is the minimum the project allows) and npm 10
  or later. Older versions, such as Node 18, fail to build.
- Build tools for native modules on your platform.
- Git, to clone the repository.

[Node.js]: https://nodejs.org

Building from Source
--------------------
These steps produce a runnable app from a fresh clone. They were tested on
64-bit Linux; other platforms are untested.

1. Install the dependencies:

        $ npm ci

2. Put the prebuilt image-processing binding where the bundler looks for it.
   `npm ci` does not do this, so repeat it after every `npm ci`:

        $ mkdir -p node_modules/sharp/src/build/Release
        $ cp node_modules/@img/sharp-linux-x64/lib/sharp-linux-x64.node \
             node_modules/sharp/src/build/Release/

   Adjust the package name for other platforms and architectures. The prebuilt
   image libraries do not read HEIC/HEIF files.

3. Compile the bundle into `lib/`:

        $ npm run rollup

4. Start the app straight from the source, with a throwaway data folder in
   `tmp/`:

        $ npx electron --app . --env development --data tmp \
            --cache tmp/cache --logs tmp/log

   Add `--no-sandbox` if your system's Electron sandbox is not set up (see
   `res/linux/INSTALL`). You can also pass a `.odu` project file as the last
   argument to open it.

Development
-----------
    # Recompile the bundle whenever the source changes
    $ npm run rollup -- --watch

    # Check the code and run the tests
    $ npm run lint
    $ npm test

    # View or tail the log file (written to tmp/log/ in dev mode)
    $ npm run log:view
    $ npm run log:tail

Creating a Distributable Build
------------------------------
Compile the bundle, then run the build script with Node.js 22. The build tool
does not run under Electron's embedded Node, so use a real Node install; if
your default is not 22, `npx -y node@22` borrows it for one command:

    $ npm run clean && npm run rollup
    $ npx -y node@22 --disable-warning=ExperimentalWarning \
        scripts/build.js --platform linux --arch x64

`npm run clean` removes the generated `lib/` and `dist/` folders (and test
leftovers) but not `node_modules/`, so the binding from step 2 stays in place.
If the app or build complains that `sharp-linux-x64.node` is missing, repeat
step 2.

The app is written to `dist/Omeka Desktop Upload-linux-x64/`. Run it with:

    $ "dist/Omeka Desktop Upload-linux-x64/omeka-desktop-upload"

(adding `--no-sandbox` if needed, as above).

Sharing a Build
---------------
Give people the whole `dist/Omeka Desktop Upload-linux-x64/` folder (about
300 MB), not just the `omeka-desktop-upload` launcher inside it and not this
repository. Use tar so the executable permissions survive:

    $ cd dist
    $ tar czf omeka-desktop-upload-linux-x64.tar.gz \
        "Omeka Desktop Upload-linux-x64"

The recipient unpacks it anywhere and runs `omeka-desktop-upload`. Because
the app is licensed under the AGPL, anyone you give a build to is entitled to
the source code.

License and Attribution
-----------------------
Omeka Desktop Upload is free software, licensed under the
[GNU Affero General Public License][agpl], version 3 or (at your option) any
later version. It is a derivative of Tropy, copyright The Tropy Developers and
Contributors (see `AUTHORS`), and includes code from the Tropy Omeka S plugin.
Third-party licenses are listed in the `LICENSE.third-party.txt` file of builds.

[agpl]: https://www.gnu.org/licenses/agpl-3.0.html
