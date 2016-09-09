/* 'use strict'; */

var MYTIMEOUT = 12000;

var DEFAULT_SIZE = 5000000; // max to avoid popup in safari/ios

// FUTURE TODO replace in test(s):
function ok(test, desc) { expect(test).toBe(true); }
function equal(a, b, desc) { expect(a).toEqual(b); } // '=='

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

var isWindows = /Windows /.test(navigator.userAgent); // Windows
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

  describe('Plugin: plugin-specific sql operations test(s)', function() {

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

        it(suiteName + 'Inline db.executeSql US-ASCII String manipulation test with undefined parameter list', function(done) {
          var db = openDatabase("Inline-db-sql-US-ASCII-string-test-with-undefined-parameter-list.db", "1.0", "Demo", DEFAULT_SIZE);
          expect(db).toBeDefined();

          db.executeSql("SELECT UPPER('Some US-ASCII text') AS uppertext", undefined, function(res) {
            expect(res.rows.item(0).uppertext).toBe("SOME US-ASCII TEXT");

            db.close(done, done);
          });
        }, MYTIMEOUT);

        it(suiteName + 'Inline db.executeSql US-ASCII String manipulation test with parameters=false', function(done) {
          var db = openDatabase("Inline-db-sql-US-ASCII-string-test-with-parameters-equals-false.db", "1.0", "Demo", DEFAULT_SIZE);
          expect(db).toBeDefined();

          db.executeSql("SELECT UPPER('Some US-ASCII text') AS uppertext", false, function(res) {
            expect(res.rows.item(0).uppertext).toBe("SOME US-ASCII TEXT");

            db.close(done, done);
          });
        }, MYTIMEOUT);

        it(suiteName + 'Inline db.executeSql US-ASCII String manipulation test with parameters=true', function(done) {
          var db = openDatabase("Inline-db-sql-US-ASCII-string-test-with-parameters-equals-true.db", "1.0", "Demo", DEFAULT_SIZE);
          expect(db).toBeDefined();

          db.executeSql("SELECT UPPER('Some US-ASCII text') AS uppertext", true, function(res) {
            expect(res.rows.item(0).uppertext).toBe("SOME US-ASCII TEXT");

            db.close(done, done);
          });
        }, MYTIMEOUT);

        it(suiteName + 'Multi-row INSERT with parameters in db.executeSql test', function(done) {
          var db = openDatabase('Multi-row-INSERT-with-parameters-in-db-sql-test.db');

          db.executeSql('DROP TABLE IF EXISTS TestTable;');
          db.executeSql('CREATE TABLE TestTable (x,y)');

          var check1 = false;
          db.executeSql('INSERT INTO TestTable VALUES (?,?),(?,?)', ['a',1,'b',2], function(rs) {
            expect(rs).toBeDefined();
            expect(rs.insertId).toBeDefined();
            expect(rs.insertId).toBe(2);
            if (!(isAndroid && isImpl2))
              expect(rs.rowsAffected).toBe(2);

            check1 = true;
          }, function(error) {
            // NOT EXPECTED:
            expect(false).toBe(true);
            expect(error.message).toBe('--');
            done();
          });

          db.executeSql('SELECT * FROM TestTable', [], function(rs2) {
            // EXPECTED SELECT RESULT:
            expect(rs2).toBeDefined();
            expect(rs2.rows.length).toBe(2);
            expect(rs2.rows.item(0).x).toBe('a');
            expect(rs2.rows.item(0).y).toBe(1);
            expect(rs2.rows.item(1).x).toBe('b');
            expect(rs2.rows.item(1).y).toBe(2);
            expect(check1).toBe(true);
            done();
          }, function(error) {
            // NOT EXPECTED (SELECT):
            expect(false).toBe(true);
            expect(error.message).toBe('--');
            done();
          });
        }, MYTIMEOUT);

        test_it(suiteName + "Multiple db.executeSql string result test", function() {
          // NOTE: this test checks that for db.executeSql(), the result callback is
          // called exactly once, with the proper result:
          var db = openDatabase("Multiple-DB-sql-String-result-test.db", "1.0", "Demo", DEFAULT_SIZE);

          var expected = [ 'FIRST', 'SECOND' ];
          var i=0;

          ok(!!db, 'valid db object');

          stop(2);

          var okcb = function(result) {
            if (i > 1) {
              ok(false, "unexpected result: " + JSON.stringify(result));
              console.log("discarding unexpected result: " + JSON.stringify(result))
              return;
            }

            ok(!!result, "valid result object");

            // ignore cb (and do not count) if result is undefined:
            if (!!result) {
              console.log("result.rows.item(0).uppertext: " + result.rows.item(0).uppertext);
              equal(result.rows.item(0).uppertext, expected[i], "Check result " + i);
              i++;
              start(1);
            }
          };

          db.executeSql("select upper('first') as uppertext", [], okcb);
          db.executeSql("select upper('second') as uppertext", [], okcb);
        });

        it(suiteName + 'db.executeSql working in db.executeSql success callback', function(done) {
          var db = openDatabase('db-sql-in-db-sql-success-callback-test.db');

          db.executeSql('SELECT UPPER(?) AS uppertext', ['First'], function(rs) {
            // FIRST EXPECTED RESULT:
            expect(rs).toBeDefined();
            expect(rs.rows.length).toBe(1);
            expect(rs.rows.item(0).uppertext).toBe('FIRST');

            db.executeSql('SELECT UPPER(?) AS uppertext', ['Second'], function(rs) {
              // SECOND EXPECTED RESULT:
              expect(rs).toBeDefined();
              expect(rs.rows.length).toBe(1);
              expect(rs.rows.item(0).uppertext).toBe('SECOND');
              done();
            }, function(error) {
              // NOT EXPECTED (SECOND):
              expect(false).toBe(true);
              expect(error.message).toBe('--');
              done();
            });

          }, function(error) {
            // NOT EXPECTED (FIRST):
            expect(false).toBe(true);
            expect(error.message).toBe('--');
            done();
          });
        }, MYTIMEOUT);

      });

    }

  });

  describe('Plugin: plugin-specific error test(s)', function() {

    var pluginScenarioList = [
      isAndroid ? 'Plugin-implementation-default' : 'Plugin',
      'Plugin-implementation-2'
    ];

    var pluginScenarioCount = isAndroid ? 2 : 1;

    for (var i=0; i<pluginScenarioCount; ++i) {

      describe(pluginScenarioList[i] + ': db.executeSql error test(s)', function() {
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

        it(suiteName + 'Multiple db.executeSql error result test (check error codes & basic error message pattern)', function(done) {
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
            expect(error.code).toBe((!isWindows && !isWP8) ? 5 : 0); // (Windows/WP8 plugin BROKEN: INCORRECT code)
            expect(error.message).toMatch(/syntax error/);

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

            // INCORRECT error.code - should be 1: DATABASE_ERR
            // ("not covered by any other error code")
            // ref: https://www.w3.org/TR/webdatabase/#dom-sqlerror-code-1
            // WebKit Web SQL, iOS plugin, & default Android implementation all report 5 (SYNTAX_ERR)
            // Android implementation 2 (using built-in AOSP database classes) as well
            // as Windows/WP8 report 0 (UNKNOWN_ERR)
            if (!isWindows && !isWP8 && !(isAndroid && isImpl2))
              expect(error.code).toBe(5);

            // BROKEN (INCONSISTENT) on Windows/WP8:
            if (!isWindows && !isWP8)
              expect(error.message).toMatch(/no such function: uper/);

            // BROKEN (INCONSISTENT) on Windows/WP8:
            if (isWindows || isWP8)
              expect(error.message).toMatch(/--/);

            expect(error_result_count).toBe(1);
            ++error_result_count;

            // and finish this test:
            done();
          });
        }, MYTIMEOUT);

        it(suiteName + 'db.executeSql working in db.executeSql error callback', function(done) {
          var db = openDatabase('db-sql-in-db-sql-error-callback-test.db');

          db.executeSql('SLCT 1', [], function(rs) {
            // NOT EXPECTED:
            expect(true).toBe(false);
            done();
          }, function(error) {
            // FIRST EXPECTED RESULT:
            expect(error).toBeDefined();
            expect(error.code).toBeDefined();
            expect(error.message).toBeDefined();
            expect(error.code).toBe((!isWindows && !isWP8) ? 5 : 0); // (Windows/WP8 plugin BROKEN: INCORRECT code)
            expect(error.message).toMatch(/syntax error/);

            db.executeSql('SELECT UPPER(?) AS uppertext', ['Test'], function(rs) {
              // SECOND EXPECTED RESULT:
              expect(rs).toBeDefined();
              expect(rs.rows.length).toBe(1);
              expect(rs.rows.item(0).uppertext).toBe('TEST');
              done();
            }, function(error) {
              // NOT EXPECTED (SECOND):
              expect(false).toBe(true);
              expect(error.message).toBe('--');
              done();
            });
          });
        }, MYTIMEOUT);

        it(suiteName + 'TBD: db.executeSql with INSERT statement list (PLUGIN BROKEN with possible parameter data loss)', function(done) {
          var db = openDatabase('db-sql-insert-statement-list.db');

          db.executeSql('DROP TABLE IF EXISTS tt');
          db.executeSql('CREATE TABLE tt (data)');
          db.executeSql('INSERT INTO tt VALUES (?); INSERT INTO tt VALUES (2)', [1], function(rs) {
            expect(rs).toBeDefined();
            db.executeSql('SELECT * FROM tt', [], function(rs) {
              // TBD ACTUAL RESULT [PLUGIN BROKEN with possible data loss]:
              expect(rs).toBeDefined();
              expect(rs.rows).toBeDefined();
              expect(rs.rows.length).toBe(1);
              expect(rs.rows.item(0).data).toBe(1);
              db.close(done, done);
            }, function(error) {
              // TBD [NOT EXPECTED]:
              expect(false).toBe(true);
              expect(error.message).toBe('--');
              db.close(done, done);
            })
          }, function(error) {
            expect(false).toBe(true);
            expect(error).toBeDefined();
            db.close(done, done);
          })
        }, MYTIMEOUT);

      });
    }

  });

  describe('Plugin: more plugin-specific test(s)', function() {

    for (var i=0; i<pluginScenarioCount; ++i) {

      describe(pluginScenarioList[i] + ': db.executeSql PRAGMA test(s)', function() {
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

        test_it(suiteName + "PRAGMAs & multiple database transactions mixed together", function() {
          var db = openDatabase("DB1", "1.0", "Demo", DEFAULT_SIZE);

          var db2 = openDatabase("DB2", "1.0", "Demo", DEFAULT_SIZE);

          stop(2);

          db.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS test_table');
            tx.executeSql('CREATE TABLE IF NOT EXISTS test_table (id integer primary key, data text, data_num integer)', [], function() {
              console.log("test_table created");
            });

            stop();
            db.executeSql("pragma table_info (test_table);", [], function(res) {
              start();
              console.log("PRAGMA res: " + JSON.stringify(res));
              equal(res.rows.item(2).name, "data_num", "DB1 table number field name");
            });
          });

          db2.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS tt2');
            tx.executeSql('CREATE TABLE IF NOT EXISTS tt2 (id2 integer primary key, data2 text, data_num2 integer)', [], function() {
              console.log("tt2 created");
            });

            db.executeSql("pragma table_info (test_table);", [], function(res) {
              console.log("PRAGMA (db) res: " + JSON.stringify(res));
              equal(res.rows.item(0).name, "id", "DB1 table key field name");
              equal(res.rows.item(1).name, "data", "DB1 table text field name");
              equal(res.rows.item(2).name, "data_num", "DB1 table number field name");

              start();
            });

            db2.executeSql("pragma table_info (tt2);", [], function(res) {
              console.log("PRAGMA (tt2) res: " + JSON.stringify(res));
              equal(res.rows.item(0).name, "id2", "DB2 table key field name");
              equal(res.rows.item(1).name, "data2", "DB2 table text field name");
              equal(res.rows.item(2).name, "data_num2", "DB2 table number field name");

              start();
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
