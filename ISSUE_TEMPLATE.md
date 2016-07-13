# Type of issue

Is this a bug, help request, feature request, or something else?

**IMPORTANT:** In case of a bug or help request please verify each of the items in the initial checklist and reproduction checklist below.

# Checklist for bug or help request

- [x] Sample item that is marked complete.
- [ ] Did create and run a simple Cordova app with no plugins on the target platform(s).
- [ ] Did create and run a simple Cordova app with a simple plugin such as `cordova-plugin-dialogs` on the target platform(s).
- [ ] Did create and run a simple Cordova app with the sqlite plugin with both echoTest and selfTest verified to be working on the target platform(s).

Optional comments here.

# Reproduction checklist

- [ ] Did reproduce the issue in a simple Cordova app based on [brodybits / Cordova-sqlite-starter-test](https://github.com/brodybits/Cordova-sqlite-starter-test).
- [ ] Did add each plugin to the reproduction project with the `--save` flag (to be automatically included in `config.xml`).
- [ ] The reproduction JavaScript is complete with all variables properly declared and filled in.
- [ ] The reproduction JavaScript is as simple as possible.
- [ ] The reproduction JavaScript is properly formatted.
- [ ] Did specify which platform(s) the issue is known to be reproducible.
- [ ] In case the entire reproduction project is posted: the reproduction project is posted with the `plugins` or `platforms` subdirectory trees *not included*.

Optional comments here.

# Description and reproduction

Description here.

Reproduction based on [brodybits / Cordova-sqlite-starter-test](https://github.com/brodybits/Cordova-sqlite-starter-test):

- In case of simple reproductions: please paste the entire JavaScript from `app.js` in the Javascript code block below.
```Javascript
// JavaScript from app.js

```

- In case more support is needed from external JavaScript, HTML, CSS, additional plugins needed, or any other changes to `config.xml` please post a link to the full reproduction project with:
  - all plugins added with the `--save` flag to be automatically included in `config.xml`
  - all HTML, CSS, and JavaScript dependencies included in the `www` subdirectory tree
  - `plugins` and `platform` subdirectory trees *not included* ([brodybits / Cordova-sqlite-starter-test](https://github.com/brodybits/Cordova-sqlite-starter-test) uses `.gitignore` to exclude these subdirectory trees in case you use git)

**NOTICE:** Ionic and other Angular derivatives are not covered by free support. For professional support please contact <sales@litehelpers.net>. Here are some tips and common pitfalls related to Ionic and other Angular derivatives:
- Please be sure to wait for the `deviceready` event.
- Controller, factory, and service callbacks may be triggered before the `deviceready` event is fired.
- As discussed in [litehelpers/Cordova-sqlite-storage#355](https://github.com/litehelpers/Cordova-sqlite-storage/issues/355), it may be necessary to install ionic-plugin-keyboard in certain cases.

# Other components needed for reproduction

If any other plugins or other components are needed to reproduce the issue, please list them here, describe why they are needed, and confirm that they were added with the `--save` flag and included in `config.xml`.
