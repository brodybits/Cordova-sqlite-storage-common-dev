/* 'use strict'; */

var MYTIMEOUT = 12000;

var DEFAULT_SIZE = 5000000; // max to avoid popup in safari/ios

var isWP8 = /IEMobile/.test(navigator.userAgent); // Matches WP(7/8/8.1)
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

// simple tests:
var mytests = function() {

  for (var i=0; i<pluginScenarioCount; ++i) {

    describe(pluginScenarioList[i] + ': BATCH SQL test(s)', function() {
      var scenarioName = pluginScenarioList[i];
      var suiteName = scenarioName + ': ';
      var isImpl2 = (i === 1);

      // NOTE: MUST be defined in function scope, NOT outer scope:
      var openDatabase = function(name, ignored1, ignored2, ignored3) {
        if (isImpl2) {
          return window.sqlitePlugin.openDatabase({
            // prevent reuse of database from default db implementation:
            name: 'i2-'+name,
            androidDatabaseImplementation: 2,
            androidLockWorkaround: 1,
            location: 1
          });
        } else {
          return window.sqlitePlugin.openDatabase({name: name, location: 0});
        }
      }

      describe(pluginScenarioList[i] + ': Basic sql batch test(s)', function() {

        it(suiteName + 'Single-column batch sql test', function(done) {
          var db = openDatabase('Single-column-batch-sql-test.db', '1.0', 'Test', DEFAULT_SIZE);

          expect(db).toBeDefined();

          db.sqlBatch([
            'DROP TABLE IF EXISTS MyTable',
            'CREATE TABLE MyTable (SampleColumn)',
            [ 'INSERT INTO MyTable VALUES (?)', ['test-value'] ],
          ], function() {
            db.executeSql('SELECT * FROM MyTable', [], function (res) {
              expect(res.rows.item(0).SampleColumn).toBe('test-value');
              done();
            });
          }, function(error) {
            expect(true).toBe(false);
            done();
          });
        }, MYTIMEOUT);

        it(suiteName + 'Multi-row INSERT with parameters in batch sql test', function(done) {
          var db = openDatabase('Multi-row-INSERT-with-parameters-batch-sql-test.db', '1.0', 'Test', DEFAULT_SIZE);

          expect(db).toBeDefined();

          db.sqlBatch([
            'DROP TABLE IF EXISTS MyTable',
            'CREATE TABLE MyTable (x,y)',
            [ 'INSERT INTO MyTable VALUES (?,?),(?,?)', ['a',1,'b',2] ],
          ], function() {
            db.executeSql('SELECT * FROM MyTable', [], function (resultSet) {
              // EXPECTED: CORRECT RESULT:
              expect(resultSet.rows.length).toBe(2);
              expect(resultSet.rows.item(0).x).toBe('a');
              expect(resultSet.rows.item(0).y).toBe(1);
              expect(resultSet.rows.item(1).x).toBe('b');
              expect(resultSet.rows.item(1).y).toBe(2);
              done();
            });
          }, function(error) {
            expect(true).toBe(false);
            done();
          });
        }, MYTIMEOUT);

        it(suiteName + 'batch sql with syntax error (check error code & basic error message pattern)', function(done) {
          var db = openDatabase('batch-sql-syntax-error-test.db', '1.0', 'Test', DEFAULT_SIZE);

          expect(db).toBeDefined();

          db.sqlBatch([
            'DROP TABLE IF EXISTS MyTable',
            // syntax error below:
            'CRETE TABLE MyTable (SampleColumn)',
            [ 'INSERT INTO MyTable VALUES (?)', ['test-value'] ],
          ], function() {
            // NOT EXPECTED:
            expect(false).toBe(true);
            done();
          }, function(error) {
            // EXPECTED RESULT:
            expect(error).toBeDefined();
            expect(error.code).toBeDefined();
            expect(error.message).toBeDefined();
            expect(error.code).toBe((!isWindows && !isWP8) ? 5 : 0); // (Windows/WP8 plugin BROKEN: INCORRECT code)
            expect(error.message).toMatch(/syntax error/);
            done();
          });
        }, MYTIMEOUT);

        it(suiteName + 'batch sql with constraint violation (check error code & basic error message pattern)', function(done) {
          var db = openDatabase('batch-sql-constraint-violation-test.db', '1.0', 'Test', DEFAULT_SIZE);

          expect(db).toBeDefined();

          db.sqlBatch([
            'DROP TABLE IF EXISTS MyTable',
            // syntax error below:
            'CREATE TABLE MyTable (SampleColumn UNIQUE)',
            [ 'INSERT INTO MyTable VALUES (?)', [123] ],
            [ 'INSERT INTO MyTable VALUES (?)', [123] ],
          ], function() {
            // NOT EXPECTED:
            expect(false).toBe(true);
            done();
          }, function(error) {
            // EXPECTED RESULT:
            expect(error).toBeDefined();
            expect(error.code).toBeDefined();
            expect(error.message).toBeDefined();
            expect(error.code).toBe((!isWindows && !isWP8) ? 6 : 0); // (Windows/WP8 plugin BROKEN: INCORRECT code)
            expect(error.message).toMatch(/constraint fail/);
            done();
          });
        }, MYTIMEOUT);

        it(suiteName + 'batch sql failure-safe semantics', function(done) {
          var db = openDatabase('batch-sql-failure-safe-test.db', '1.0', 'Test', DEFAULT_SIZE);

          expect(db).toBeDefined();

          db.executeSql('DROP TABLE IF EXISTS MyTable');
          db.executeSql('CREATE TABLE MyTable (SampleColumn)');
          db.executeSql('INSERT INTO MyTable VALUES (?)', ['test-value'], function() {
            db.sqlBatch([
              'DELETE FROM MyTable',
              // syntax error below:
              [ 'INSRT INTO MyTable VALUES (?)', 'test-value' ]
            ], function() {
              // NOT EXPECTED:
              expect(true).toBe(false);
              done();
            }, function(error) {
              // EXPECTED RESULT, check integrity:
              expect(error).toBeDefined();
              db.executeSql('SELECT * FROM MyTable', [], function (res) {
                expect(res.rows.item(0).SampleColumn).toBe('test-value');
                db.close(done, done);

              }, function(error) {
                // NOT EXPECTED:
                expect(false).toBe(true);
                expect(error.message).toBe('--');
                db.close(done, done);
              });
            });

          }, function(error) {
            // NOT EXPECTED:
            expect(false).toBe(true);
            expect(error.message).toBe('--');
            db.close(done, done);
          });
        }, MYTIMEOUT);

        it(suiteName + 'TBD: sql batch with SELECT statement list in SQL [PLUGIN BROKEN with possible data loss]', function(done) {
          var db = openDatabase('sql-batch-with-select-statement-list-in-sql.db');
          db.executeSql('DROP TABLE IF EXISTS tt');
          db.executeSql('CREATE TABLE tt (data)', [], function() {
            db.sqlBatch([
              'INSERT INTO tt VALUES (1); INSERT INTO tt VALUES (2)'
            ], function() {
              db.executeSql('SELECT count(*) AS mycount FROM tt', [], function (rs) {
                // TBD ACTUAL RESULT [PLUGIN BROKEN with possible data loss]:
                expect(rs.rows.item(0).mycount).toBe(1);
                db.close(done, done);

              }, function(error) {
                // TBD [NOT EXPECTED]:
                expect(false).toBe(true);
                expect(error.message).toBe('--');
                db.close(done, done);
              });
            });

          }, function(error) {
            // NOT EXPECTED:
            expect(false).toBe(true);
            expect(error.message).toBe('--');
            db.close(done, done);
          });
        }, MYTIMEOUT);

        it(suiteName + 'TBD: sql batch with INSERT statement list in SQL (PLUGIN BROKEN with possible data loss)', function(done) {
          var db = openDatabase('sql-batch-with-insert-statement-list-in-sql.db');
          db.executeSql('DROP TABLE IF EXISTS tt');
          db.executeSql('CREATE TABLE tt (data)', [], function() {
            db.sqlBatch([
              [ 'INSERT INTO tt VALUES (?); INSERT INTO tt VALUES (2)', [1] ]
            ], function() {
              db.executeSql('SELECT count(*) AS mycount FROM tt', [], function (rs) {
                // TBD ACTUAL RESULT [PLUGIN BROKEN with possible data loss]:
                expect(rs.rows.item(0).mycount).toBe(1);
                db.close(done, done);

              }, function(error) {
                // TBD [NOT EXPECTED]:
                expect(false).toBe(true);
                expect(error.message).toBe('--');
                db.close(done, done);
              });
            });

          }, function(error) {
            // NOT EXPECTED:
            expect(false).toBe(true);
            expect(error.message).toBe('--');
            db.close(done, done);
          });
        }, MYTIMEOUT);

      });

    });
  }
}

if (window.hasBrowser) mytests();
else exports.defineAutoTests = mytests;

/* vim: set expandtab : */
