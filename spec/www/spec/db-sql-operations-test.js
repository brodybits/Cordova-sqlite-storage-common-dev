/* 'use strict'; */

var MYTIMEOUT = 12000;

var DEFAULT_SIZE = 5000000; // max to avoid popup in safari/ios

var isWP8X = /IEMobile/.test(navigator.userAgent); // WP8/Windows Phone 8.1
var isWindows = /Windows /.test(navigator.userAgent); // Windows 8.1/Windows Phone 8.1/Windows 10
var isAndroid = !isWindows && /Android/.test(navigator.userAgent);

// NOTE: In certain versions such as Cordova-sqlcipher-adapter there is
// no difference between the default implementation and implementation #2.
// But the test will also specify the androidLockWorkaround: 1 option
// in case of implementation #2 (also ignored by Cordova-sqlcipher-adapter).
var pluginScenarioList = [
  isAndroid ? 'Plugin-implementation-default' : 'Plugin',
  'Plugin-implementation-2'
];

var pluginScenarioCount = isAndroid ? 2 : 1;

var mytests = function() {

  describe('Plugin: plugin-specific SQL operations test(s)', function() {

    for (var i=0; i<pluginScenarioCount; ++i) {

      describe(pluginScenarioList[i] + ': db.executeSql test(s)', function() {
        var scenarioName = pluginScenarioList[i];
        var suiteName = scenarioName + ': ';
        var isImpl2 = (i === 1);

        // NOTE: MUST be defined in function scope, NOT outer scope:
        var openDatabase = function(first, second, third, fourth, fifth, sixth) {
          //if (!isImpl2) {
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

          if (!isImpl2) {
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

        it(suiteName + 'Inline db.executeSql US-ASCII String manipulation test with null parameter list', function(done) {
          var db = openDatabase("Inline-db-sql-US-ASCII-string-test-with-null-parameter-list.db", "1.0", "Demo", DEFAULT_SIZE);
          expect(db).toBeDefined();

          db.executeSql("SELECT UPPER('Some US-ASCII text') AS uppertext", null, function(res) {
            expect(res.rows.item(0).uppertext).toBe("SOME US-ASCII TEXT");

            db.close(done, done);
          });
        }, MYTIMEOUT);

        it(suiteName + 'Inline db.executeSql US-ASCII String manipulation test with empty ([]) parameter list', function(done) {
          var db = openDatabase("Inline-db-sql-US-ASCII-string-test-with-empty-parameter-list.db", "1.0", "Demo", DEFAULT_SIZE);
          expect(db).toBeDefined();

          db.executeSql("SELECT UPPER('Some US-ASCII text') AS uppertext", [], function(res) {
            expect(res.rows.item(0).uppertext).toBe("SOME US-ASCII TEXT");

            db.close(done, done);
          });
        }, MYTIMEOUT);

        it(suiteName + 'Multiple db.executeSql string result test', function() {
          // NOTE: this test checks that for db.executeSql(), the result callback is
          // called exactly once, with the proper result:
          var db = openDatabase("Multiple-DB-sql-String-result-test.db", "1.0", "Demo", DEFAULT_SIZE);
          expect(db).toBeDefined();

          var hasFirstResult = false;
          db.executeSql("SELECT UPPER('first') as uppertext", [], function(rs) {
            // EXPECTED ONCE:
            expect(hasFirstResult).toBe(false);
            hasFirstResult = true;
            expect(rs).toBeDefined();
            if (!!rs) {
              expect(rs.rows).toBeDefined();
              expect(rs.rows.length).toBe(1);
              expect(rs.rows.item(0).uppertext).toBe('FIRST');
            }
          }, function(error) {
            // NOT EXPECTED:
            expect(false).toBe(true);
            expect(error.message).toBe('--');
          });

          var hasSecondResult = false;
          db.executeSql("SELECT UPPER('second') as uppertext", [], function(rs) {
            // EXPECTED ONCE:
            expect(hasFirstResult).toBe(true);
            expect(hasSecondResult).toBe(false);
            hasSecondResult = true;
            expect(rs).toBeDefined();
            if (!!rs) {
              expect(rs.rows).toBeDefined();
              expect(rs.rows.length).toBe(1);
              expect(rs.rows.item(0).uppertext).toBe('SECOND');
            }
          }, function(error) {
            // NOT EXPECTED:
            expect(false).toBe(true);
            expect(error.message).toBe('--');
          });
        }, MYTIMEOUT);

      });
    }

  });

  describe('Plugin: plugin-specific error test(s)', function() {

    for (var i=0; i<pluginScenarioCount; ++i) {

      describe(pluginScenarioList[i] + ': db.executeSql error test(s)', function() {
        var scenarioName = pluginScenarioList[i];
        var suiteName = scenarioName + ': ';
        var isImpl2 = (i === 1);

        // NOTE: MUST be defined in function scope, NOT outer scope:
        var openDatabase = function(first, second, third, fourth, fifth, sixth) {
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

          if (!isImpl2) {
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

        it(suiteName + 'Multiple db.executeSql error result test', function(done) {
          // NOTE: this test checks that for db.executeSql(), the error result
          // callback is called exactly once, with the proper result:
          var db = openDatabase("Multiple-DB-sql-error-result-test.db", "1.0", "Demo", DEFAULT_SIZE);

          var error_result_count = 0;

          // First: syntax error
          db.executeSql("SELCT upper('first') AS uppertext", [], function() {
            // NOT EXPECTED:
            expect(false).toBe(true);
          }, function(error) {
            // EXPECTED RESULT 1:
            expect(error).toBeDefined();
            expect(error.code).toBeDefined();
            expect(error.message).toBeDefined();

            // CHECK that this was not called before
            expect(error_result_count).toBe(0);
            ++error_result_count;
          });

          // Second: SELECT misspelled function name
          db.executeSql("SELECT uper('second') as uppertext", [], function() {
            // NOT EXPECTED:
            expect(false).toBe(true);
          }, function(error) {
            // EXPECTED RESULT 2:
            expect(error).toBeDefined();
            expect(error).toBeDefined();
            expect(error.code).toBeDefined();
            expect(error.message).toBeDefined();

            expect(error_result_count).toBe(1);
            ++error_result_count;

            // and finish this test:
            done();
          });
        }, MYTIMEOUT);

      });
    }

  });

  describe('Plugin: more plugin-specific test(s)', function() {

    for (var i=0; i<pluginScenarioCount; ++i) {

      describe(pluginScenarioList[i] + ': more db.executeSql test(s)', function() {
        var scenarioName = pluginScenarioList[i];
        var suiteName = scenarioName + ': ';
        var isImpl2 = (i === 1);

        // NOTE: MUST be defined in function scope, NOT outer scope:
        var openDatabase = function(first, second, third, fourth, fifth, sixth) {

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

          if (!isImpl2) {
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

        it(suiteName + "PRAGMAs & multiple database transactions mixed together", function(done) {
          var db = openDatabase("DB1", "1.0", "Demo", DEFAULT_SIZE);

          var db2 = openDatabase("DB2", "1.0", "Demo", DEFAULT_SIZE);

          //stop(2);

          // NOTE: This transaction will finish before the transaction started the db2 transaction:
          db.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS test_table');
            tx.executeSql('CREATE TABLE IF NOT EXISTS test_table (id integer primary key, data text, data_num integer)', [], function() {
              console.log("test_table created");
            });

            //stop();
            db.executeSql("pragma table_info (test_table);", [], function(res) {
              //start();
              console.log("PRAGMA res: " + JSON.stringify(res));
              // DB1 table number field name
              expect(res.rows.item(2).name).toBe('data_num');
            });
          });

          var waiting = 2;

          db2.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS tt2');
            tx.executeSql('CREATE TABLE IF NOT EXISTS tt2 (id2 integer primary key, data2 text, data_num2 integer)', [], function() {
              console.log("tt2 created");
            });

            db.executeSql("pragma table_info (test_table);", [], function(res) {
              console.log("PRAGMA (db) res: " + JSON.stringify(res));
              // DB1 table key field name
              expect(res.rows.item(0).name).toBe('id');
              // DB1 table text field name
              expect(res.rows.item(1).name).toBe('data');
              // DB1 table number field name
              expect(res.rows.item(2).name).toBe('data_num');

              //start();
              if (--waiting === 0) done();
            });

            db2.executeSql("pragma table_info (tt2);", [], function(res) {
              console.log("PRAGMA (tt2) res: " + JSON.stringify(res));
              // DB2 table key field name"
              expect(res.rows.item(0).name).toBe('id2');
              // DB2 table text field name
              expect(res.rows.item(1).name).toBe('data2');
              // DB2 table number field name
              expect(res.rows.item(2).name).toBe('data_num2');

              //start();
              if (--waiting === 0) done();
            });
          });
        });

      });
    }

  });

}

if (window.hasBrowser) mytests();
else exports.defineAutoTests = mytests;

/* vim: set expandtab : */
