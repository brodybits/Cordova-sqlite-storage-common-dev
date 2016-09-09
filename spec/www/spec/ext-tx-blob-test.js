/* 'use strict'; */

var MYTIMEOUT = 12000;

var DEFAULT_SIZE = 5000000; // max to avoid popup in safari/ios

// FUTURE TODO replace in test(s):
function ok(test, desc) { expect(test).toBe(true); }

var isWP8 = /IEMobile/.test(navigator.userAgent); // Matches WP(7/8/8.1)
var isWindows = /Windows /.test(navigator.userAgent); // Windows 8.1/Windows Phone 8.1/Windows 10
var isAndroid = !isWindows && /Android/.test(navigator.userAgent);

// NOTE: In certain versions such as Cordova-sqlcipher-adapter there is
// no difference between the default implementation and implementation #2.
// But the test will also specify the androidLockWorkaround: 1 option
// in case of implementation #2 (also ignored by Cordova-sqlcipher-adapter).
var scenarioList = [
  isAndroid ? 'Plugin-implementation-default' : 'Plugin',
  'HTML5',
  'Plugin-implementation-2'
];

var scenarioCount = (!!window.hasBrowserWithWebSQL) ? (isAndroid ? 3 : 2) : 1;

var mytests = function() {

  for (var i=0; i<scenarioCount; ++i) {

    describe(scenarioList[i] + ': tx blob test(s)', function() {
      var scenarioName = scenarioList[i];
      var suiteName = scenarioName + ': ';
      var isWebSql = (i === 1);
      var isOldImpl = (i === 2);

      // NOTE: MUST be defined in function scope, NOT outer scope:
      var openDatabase = function(name, ignored1, ignored2, ignored3) {
        if (isOldImpl) {
          return window.sqlitePlugin.openDatabase({
            // prevent reuse of database from default db implementation:
            name: 'i2-'+name,
            androidDatabaseImplementation: 2,
            androidLockWorkaround: 1
          });
        }
        if (isWebSql) {
          return window.openDatabase(name, "1.0", "Demo", DEFAULT_SIZE);
        } else {
          return window.sqlitePlugin.openDatabase({name: name, location: 0});
        }
      }

      //describe(scenarioList[i] + ': tx blob test(s)', function() {

        // ENABLED for iOS ONLY (for now):
        // This test shows that the plugin does not throw an error when attempting to serialize
        // a non-standard parameter type. Blob becomes an empty dictionary on iOS, for example,
        // and so this verifies the type is converted to a string and continues. Web SQL does
        // the same but on the JavaScript side and converts to a string like `[object Blob]`.
        it(suiteName + "INSERT Blob from ArrayBuffer (non-standard parameter type)", function(done) {
          if (isWindows) pending('BROKEN for Windows'); // XXX (??)
          if (isWP8) pending('BROKEN for WP(8)'); // (???)
          if (typeof Blob === "undefined") pending('Blob type does not exist');
          if (/Android [1-4]/.test(navigator.userAgent)) pending('BROKEN for Android [version 1.x-4.x]');
          if (isAndroid) pending('SKIP for Android'); // (for now)

          // abort the test if ArrayBuffer is undefined
          // TODO: consider trying this for multiple non-standard parameter types instead
          if (typeof ArrayBuffer === "undefined") pending('ArrayBuffer type does not exist');

          var db = openDatabase("Blob-test.db", "1.0", "Demo", DEFAULT_SIZE);
          ok(!!db, "db object");

          db.transaction(function(tx) {
            ok(!!tx, "tx object");

            var buffer = new ArrayBuffer(5);
            var view   = new Uint8Array(buffer);
            view[0] = 'h'.charCodeAt();
            view[1] = 'e'.charCodeAt();
            view[2] = 'l'.charCodeAt();
            view[3] = 'l'.charCodeAt();
            view[4] = 'o'.charCodeAt();
            var blob = new Blob([view.buffer], { type:"application/octet-stream" });

            tx.executeSql('DROP TABLE IF EXISTS test_table');
            tx.executeSql('CREATE TABLE IF NOT EXISTS test_table (foo blob)');
            tx.executeSql('INSERT INTO test_table VALUES (?)', [blob], function(tx, res) {
              // EXPECTED RESULT: INSERT Blob object OK
              expect(true).toBe(true);
              done();
            }, function(tx, error) {
              // NOT EXPECTED: INSERT blob FAILED
              expect(false).toBe(true);
              expect(error.message).toBe('--');
              return done() || false;
            });
          }, function(error) {
            // NOT EXPECTED: transaction failure
            expect(false).toBe(true);
            expect(error.message).toBe('--');
            done();
          });
        });

      //});


    });
  }

}

if (window.hasBrowser) mytests();
else exports.defineAutoTests = mytests;

/* vim: set expandtab : */
