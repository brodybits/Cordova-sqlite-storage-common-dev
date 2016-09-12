/* 'use strict'; */

var MYTIMEOUT = 12000;

var isWP8 = /IEMobile/.test(navigator.userAgent); // Matches WP(7/8/8.1)
var isWindows = /Windows /.test(navigator.userAgent); // Windows 8.1/Windows Phone 8.1/Windows 10

window.hasBrowser = true;
window.hasBrowserWithWebSQL = !isWindows && !isWP8;

describe('check startup', function() {
  it('receives deviceready event', function(done) {
    expect(true).toBe(true);
    document.addEventListener("deviceready", function() {
      done();
    });
  }, MYTIMEOUT);

  it('has openDatabase', function() {
    if (window.hasBrowserWithWebSQL) expect(window.openDatabase).toBeDefined();
    expect(window.sqlitePlugin).toBeDefined();
    expect(window.sqlitePlugin.openDatabase).toBeDefined();
  });
});

/* vim: set expandtab : */
