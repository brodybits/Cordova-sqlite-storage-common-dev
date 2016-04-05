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

  describe('Plugin: db delete test(s)', function() {

    for (var i=0; i<pluginScenarioCount; ++i) {

      describe(pluginScenarioList[i] + ': basic sqlitePlugin.deleteDatabase test(s)', function() {
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

        var deleteDatabase = function(first, second, third) {
          if (!isOldAndroidImpl) {
            window.sqlitePlugin.deleteDatabase({name: first, location: 0}, second, third);
          } else {
            window.sqlitePlugin.deleteDatabase({name: 'i2-'+first, location: 0}, second, third);
          }
        }

        test_it(suiteName + ' test sqlitePlugin.deleteDatabase()', function () {
          stop();
          var db = openDatabase("DB-Deletable", "1.0", "Demo", DEFAULT_SIZE);

          function createAndInsertStuff() {

            db.transaction(function(tx) {
              tx.executeSql('DROP TABLE IF EXISTS test');
              tx.executeSql('CREATE TABLE IF NOT EXISTS test (name)', [], function () {
                tx.executeSql('INSERT INTO test VALUES (?)', ['foo']);
              });
            }, function (err) {
              ok(false, 'create and insert tx failed with ERROR: ' + JSON.stringify(err));
              console.log('create and insert tx failed with ERROR: ' + JSON.stringify(err));
              start();
            }, function () {
              // check that we can read it
              db.transaction(function(tx) {
                tx.executeSql('SELECT * FROM test', [], function (tx, res) {
                  equal(res.rows.item(0).name, 'foo');
                });
              }, function (err) {
                ok(false, 'SELECT tx failed with ERROR: ' + JSON.stringify(err));
                console.log('SELECT tx failed with ERROR: ' + JSON.stringify(err));
                start();
              }, function () {
                deleteAndConfirmDeleted();
              });
            });
          }

          function deleteAndConfirmDeleted() {

            deleteDatabase("DB-Deletable", function () {

              // check that the data's gone
              db.transaction(function (tx) {
                tx.executeSql('SELECT name FROM test', []);
              }, function (err) {
                ok(true, 'got an expected transaction error');
                testDeleteError();
              }, function () {
                console.log('UNEXPECTED SUCCESS: expected a transaction error');
                ok(false, 'expected a transaction error');
                start();
              });
            }, function (err) {
              console.log("ERROR: " + JSON.stringify(err));
              ok(false, 'error: ' + err);
              start();
            });
          }

          function testDeleteError() {
            // should throw an error if the db doesn't exist
            deleteDatabase("Foo-Doesnt-Exist", function () {
              console.log('UNEXPECTED SUCCESS: expected a delete error');
              ok(false, 'expected error');
              start();
            }, function (err) {
              ok(!!err, 'got error like we expected');

              start();
            });
          }

          createAndInsertStuff();
        });

      });
    }

  });

}

if (window.hasBrowser) mytests();
else exports.defineAutoTests = mytests;

/* vim: set expandtab : */
