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

  describe('Plugin: db close test(s)', function() {

    for (var i=0; i<pluginScenarioCount; ++i) {

      describe(pluginScenarioList[i] + ': basic plugin close test(s)', function() {
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

        test_it(suiteName + ' database.close (immediately after open) calls its success callback', function () {
          // XXX POSSIBLY BROKEN on iOS due to current background processing implementation
          if (!(isAndroid || isIE)) pending('POSSIBLY BROKEN on iOS (background processing implementation)');

          // asynch test coming up
          stop(1);

          var dbName = "Immediate-close-callback";
          var db = openDatabase(dbName, "1.0", "Demo", DEFAULT_SIZE);

          // close database - need to run tests directly in callbacks as nothing is guarenteed to be queued after a close
          db.close(function () {
            ok(true, 'expected close success callback to be called after database is closed');
            start(1);
          }, function (error) {
            ok(false, 'expected close error callback not to be called after database is closed');
            start(1);
          });
        });

        test_it(suiteName + ' database.close after open callback calls its success callback', function () {
          // asynch test coming up
          stop(1);

          var dbName = "Close-after-open-callback";

          openDatabase(dbName, "1.0", "Demo", DEFAULT_SIZE, function(db) {
            // close database - need to run tests directly in callbacks as nothing is guarenteed to be queued after a close
            db.close(function () {
              ok(true, 'expected close success callback to be called after database is closed');
              start(1);
            }, function (error) {
              ok(false, 'expected close error callback not to be called after database is closed');
              start(1);
            });
          }, function (error) {
            ok(false, 'unexpected open error');
            start(1);
          });
        });

        test_it(suiteName + ' database.close fails in transaction', function () {
          stop(2);

          var dbName = "Database-Close-fail";
          var db = openDatabase({name: dbName, location: 1});

          db.readTransaction(function(tx) {
            tx.executeSql('SELECT 1', [], function(tx, results) {
              // close database - need to run tests directly in callbacks as nothing is guarenteed to be queued after a close
              db.close(function () {
                ok(false, 'expect close to fail during transaction');
                start(1);
              }, function (error) {
                ok(true, 'expect close to fail during transaction');
                start(1);
              });
              start(1);
            }, function(error) {
              ok(false, error);
              start(2);
            });
          }, function(error) {
            ok(false, error);
            start(2);
          });
        });

        test_it(suiteName + ' attempt to close db twice', function () {
          var dbName = "close-db-twice.db";

          stop(1);

          openDatabase({name: dbName}, function(db) {
            ok(!!db, 'valid db object');
            db.close(function () {
              ok(true, 'db.close() success callback (first time)');
              db.close(function () {
                ok(false, 'db.close() second time should not have succeeded');
                start(1);
              }, function (error) {
                ok(true, 'db.close() second time reported error ok');
                start(1);
              });
            }, function (error) {
              ok(false, 'expected close error callback not to be called after database is closed');
              start(1);
            });
          });
        });

        // XXX BROKEN [BUG #209]:
        xtest_it(suiteName + ' close writer db handle should not close reader db handle [BROKEN]', function () {
          var dbname = 'close-one-db-handle.db';
          var dbw = openDatabase(dbname, "1.0", "Demo", DEFAULT_SIZE);
          var dbr = openDatabase(dbname, "1.0", "Demo", DEFAULT_SIZE);

          stop(1);

          dbw.transaction(function (tx) {
            tx.executeSql('DROP TABLE IF EXISTS tt');
            tx.executeSql('CREATE TABLE IF NOT EXISTS tt (test_data)');
            tx.executeSql('INSERT INTO tt VALUES (?)', ['My-test-data']);
          }, function(error) {
            console.log("ERROR: " + error.message);
            ok(false, error.message);
            start(1);
          }, function() {
            dbw.close(function () {
              // XXX dbr no longer working [BUG #209]:
              dbr.readTransaction(function (tx) {
                ok(false, "Behavior changed - please update this test");
                tx.executeSql('SELECT test_data from tt', [], function (tx, result) {
                  equal(result.rows.item(0).test_data, 'My-test-data', 'read data from reader handle');
                  start(1);
                });
              }, function(error) {
                console.log("ERROR reading db handle: " + error.message);
                //ok(false, "ERROR reading db handle: " + error.message);
                ok(true, "BUG REPRODUCED");
                start(1);
              });
            }, function (error) {
              ok(false, 'close error callback not to be called after database is closed');
              start(1);
            });
          });
        });

        // XXX BROKEN [BUG #204]:
        xtest_it(suiteName + ' close DB in db.executeSql() callback [BROKEN]', function () {
          var dbName = "Close-DB-in-db-executeSql-callback.db";

          // async test coming up
          stop(1);

          openDatabase({name: dbName}, function (db) {
            db.executeSql("CREATE TABLE IF NOT EXISTS tt (test_data)", [], function() {
              db.close(function () {
                ok(false, "Behavior changed - please update this test");
                ok(true, 'DB close OK');
                start(1);
              }, function (error) {
                //ok(false, "Could not close DB: " + error.message);
                ok(true, "BUG REPRODUCED");
                start(1);
              });
            });
          }, function (error) {
            ok(false, error.message);
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
