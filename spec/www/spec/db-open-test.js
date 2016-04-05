/* 'use strict'; */

var MYTIMEOUT = 12000;

var DEFAULT_SIZE = 5000000; // max to avoid popup in safari/ios

// FUTURE TODO replace in test(s):
function ok(test, desc) { expect(test).toBe(true); }
function equal(a, b, desc) { expect(a).toEqual(b); } // '=='
function strictEqual(a, b, desc) { expect(a).toBe(b); } // '==='

// XXX TODO REFACTOR OUT OF OLD TESTS:
var wait = 0;
var test_it_done = null;
function xtest_it(desc, fun) { xit(desc, fun); }
function test_it(desc, fun) {
  wait = 0;
  it(desc, function(done) {
    test_it_done = done;
    fun();
  }, MYTIMEOUT);
}
function stop(n) {
  if (!!n) wait += n
  else ++wait;
}
function start(n) {
  if (!!n) wait -= n;
  else --wait;
  if (wait == 0) test_it_done();
}

var isAndroid = /Android/.test(navigator.userAgent);
var isWP8 = /IEMobile/.test(navigator.userAgent); // Matches WP(7/8/8.1)
//var isWindows = /Windows NT/.test(navigator.userAgent); // Windows [NT] (8.1)
var isWindows = /Windows /.test(navigator.userAgent); // Windows (8.1)
//var isWindowsPC = /Windows NT/.test(navigator.userAgent); // Windows [NT] (8.1)
//var isWindowsPhone_8_1 = /Windows Phone 8.1/.test(navigator.userAgent); // Windows Phone 8.1
//var isIE = isWindows || isWP8 || isWindowsPhone_8_1;
var isIE = isWindows || isWP8;
var isWebKit = !isIE; // TBD [Android or iOS]

// NOTE: In the core-master branch there is no difference between the default
// implementation and implementation #2. But the test will also apply
// the androidLockWorkaround: 1 option in the case of implementation #2.
var pluginScenarioList = [
  isAndroid ? 'Plugin-implementation-default' : 'Plugin',
  'Plugin-implementation-2'
];

var pluginScenarioCount = isAndroid ? 2 : 1;

var mytests = function() {

  describe('Plugin - BASIC sqlitePlugin.openDatabase test(s)', function() {

    var suiteName = 'plugin: ';

        it(suiteName + 'Open plugin database with Web SQL parameters (REJECTED with exception)', function(done) {
          try {
            var db = window.sqlitePlugin.openDatabase('open-with-web-sql-parameters-test.db', "1.0", "Demo", DEFAULT_SIZE);

            // NOT EXPECTED:
            // window.sqlitePlugin.openDatabase did not throw
            expect(false).toBe(true);

            // check returned db object:
            expect(db).toBeDefined();
            expect(db.executeSql).toBeDefined();
            expect(db.transaction).toBeDefined();
            expect(db.close).toBeDefined();

            //done();
            // IMPORTANT FIX: avoid the risk of over 100 db handles open when running the full test suite
            db.close(done, done);
          } catch (e) {
            // EXPECTED RESULT:
            expect(true).toBe(true);
            done();
          }
        }, MYTIMEOUT);

        // NOTE: this was an issue due to the inconsistency ng cordova documentation and source code which
        // triggered problems reported in litehelpers/Cordova-sqlite-storage#246 and
        // litehelpers/Cordova-sqlcipher-adapter#5.
        // The implementation now avoids this problem *by throwing an exception*.
        // It could be nicer to just signal an error in the error callback, if present,
        // through throwing an exception does prevent the user from using an invalid db object.
        // Brody TBD: check how the Web SQL API would handle this condition?
        it(suiteName + 'check that db name is really a string', function(done) {
          var p1 = { name: 'my.db.name', location: 1 };
          try {
            window.sqlitePlugin.openDatabase({ name: p1 }, function(db) {
              // not expected:
              expect(false).toBe(true);
              done();
            }, function(error) {
              // OK but NOT EXPECTED:
              expect(true).toBe(true);
              // XXX BRODY TODO:
              //expect('Behavior changed, please update this test').toBe('--');
              done();
            });
          } catch (e) {
              // stopped by the implementation:
              expect(true).toBe(true);
              done();
          }
        }, MYTIMEOUT);

  });

  describe('Plugin: db open test(s)', function() {

    for (var i=0; i<pluginScenarioCount; ++i) {

      describe(pluginScenarioList[i] + ': basic plugin open test(s)', function() {
        var scenarioName = pluginScenarioList[i];
        var suiteName = scenarioName + ': ';
        var isOldAndroidImpl = (i === 1);

        // NOTE: MUST be defined in function scope, NOT outer scope:
        var openDatabase = function(first, second, third, fourth, fifth, sixth) {
          //if (!isOldAndroidImpl) {
          //  return window.sqlitePlugin.openDatabase(first, second, third, fourth, fifth, sixth);
          //}

          var dbname, okcb, errorcb;

          if (first.constructor === String ) {
            dbname = first;
            okcb = fifth;
            errorcb = sixth;
          } else {
            dbname = first.name;
            okcb = second;
            errorcb = third;
          }

          if (!isOldAndroidImpl) {
            return window.sqlitePlugin.openDatabase({name: dbname, location: 0}, okcb, errorcb);
          }

          var dbopts = {
            name: 'i2-'+dbname,
            androidDatabaseImplementation: 2,
            androidLockWorkaround: 1,
            location: 1
          };

          return window.sqlitePlugin.openDatabase(dbopts, okcb, errorcb);
        }

        test_it(suiteName + ' database.open calls its success callback', function () {
          // asynch test coming up
          stop(1);

          var dbName = "Database-Open-callback";
          openDatabase(dbName, "1.0", "Demo", DEFAULT_SIZE, function (db) {
            ok(true, 'expected open success callback to be called ...');
            start(1);
          }, function (error) {
            ok(false, 'expected open error callback not to be called ...');
            start(1);
          });
        });

      });
    }

  });

}

if (window.hasBrowser) mytests();
else exports.defineAutoTests = mytests;

/* vim: set expandtab : */
