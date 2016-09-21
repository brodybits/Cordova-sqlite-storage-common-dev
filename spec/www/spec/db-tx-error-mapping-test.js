/* 'use strict'; */

var MYTIMEOUT = 12000;

var DEFAULT_SIZE = 5000000; // max to avoid popup in safari/ios

// FUTURE TODO replace in test(s):
function ok(test, desc) { expect(test).toBe(true); }

var isWP8 = /IEMobile/.test(navigator.userAgent); // Matches WP(7/8/8.1)
var isWindows = /Windows /.test(navigator.userAgent); // Windows
var isAndroid = !isWindows && /Android/.test(navigator.userAgent);

// NOTE: In the common storage-master branch there is no difference between the
// default implementation and implementation #2. But the test will also apply
// the androidLockWorkaround: 1 option in the case of implementation #2.
var scenarioList = [
  isAndroid ? 'Plugin-implementation-default' : 'Plugin',
  'HTML5',
  'Plugin-implementation-2'
];

var scenarioCount = (!!window.hasWebKitBrowser) ? (isAndroid ? 3 : 2) : 1;

var mytests = function() {

  for (var i=0; i<scenarioCount; ++i) {

    describe(scenarioList[i] + ': db tx error mapping test(s)', function() {
      var scenarioName = scenarioList[i];
      var suiteName = scenarioName + ': ';
      var isWebSql = (i === 1);
      var isImpl2 = (i === 2);

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
        }
        if (isWebSql) {
          return window.openDatabase(name, "1.0", "Demo", DEFAULT_SIZE);
        } else {
          return window.sqlitePlugin.openDatabase({name: name, location: 0});
        }
      }

      describe(scenarioList[i] + ': basic tx error mapping test(s)', function() {

        it(suiteName + 'INSERT syntax error [VALUES in the wrong place] with a trailing space (incorrect error code & inconsistent message on Windows)', function(done) {
          if (isWP8) pending('SKIP for WP(8)'); // FUTURE TBD

          var db = openDatabase("INSERT-Syntax-error-test.db", "1.0", "Demo", DEFAULT_SIZE);
          expect(db).toBeDefined();

          var sqlerror = null; // VERIFY this was received

          db.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS test_table');
            tx.executeSql('CREATE TABLE IF NOT EXISTS test_table (data unique)');

            // This insertion has a SQL syntax error
            tx.executeSql('INSERT INTO test_table (data) VALUES ', [123], function(tx) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              throw new Error('abort tx');

            }, function(tx, error) {
              sqlerror = error;
              expect(error).toBeDefined();
              expect(error.code).toBeDefined();
              expect(error.message).toBeDefined();

              // Plugin BROKEN on Windows: INVALID "SQLException" code -1
              // According to https://www.w3.org/TR/webdatabase/#errors-and-exceptions
              // the code member is "unsigned short" and may not be negative!
              if (isWindows)
                expect(error.code).toBe(-1);
              else
                expect(error.code).toBe(5);

              // Plugin BROKEN (INCONSISTENT) on Windows:
              if (!isWindows)
                expect(error.message).toMatch(/near \".*\": syntax error/);

              // ACTUAL WebKit Web SQL error.message (Android/iOS)
              // (SQLite error code is apparently part of Web SQL error.message)
              if (isWebSql)
                expect(error.message).toMatch(/could not prepare statement.*1 near .*\"*\"*:*syntax error/);

              // Plugin BROKEN (INCONSISTENT) on Windows:
              if (!isWebSql && !isWindows && !(isAndroid && isImpl2))
                expect(error.message).toMatch(/near \" \": syntax error/);

              // Extra info from Android-sqlite-connector:
              if (!isWebSql && isAndroid && !isImpl2)
                expect(error.message).toMatch(/sqlite3_prepare_v2 failure:.*near \" \": syntax error/);

              // From built-in Android database exception message
              // (SQLite error code is apparently part of Web SQL error.message)
              if (!isWebSql && isAndroid && isImpl2)
                expect(error.message).toMatch(/near \"VALUES\": syntax error.*code 1.*while compiling: INSERT INTO test_table/);

              // ACTUAL for Windows:
              if (isWindows)
                expect(error.message).toMatch(/Error preparing an SQLite statement/);

              // FAIL transaction & check reported transaction error:
              return true;
            });
          }, function (error) {
            expect(!!sqlerror).toBe(true); // VERIFY the SQL error callback was triggered
            expect(error).toBeDefined();
            expect(error.code).toBeDefined();
            expect(error.message).toBeDefined();

            // Plugin BROKEN on Windows: INVALID "SQLException" code -1
            // WebKit Web SQL reports 0: UNKNOWN_ERR in this case.
            if (isWindows)
              expect(error.code).toBe(-1);
            else if (isWebSql)
              expect(error.code).toBe(0);
            else
              expect(error.code).toBe(5);

            // MINIMUM (WebKit) Web SQL & plugin:
            expect(error.message).toMatch(/error callback did not return false/);

            // ACTUAL WebKit Web SQL (Android/iOS):
            if (isWebSql)
              expect(error.message).toMatch(/callback raised an exception.*or.*error callback did not return false/);

            // Extra info in error.message Android/iOS plugin (TBD: WP8):
            if (!isWebSql && !isWindows)
              expect(error.message).toMatch(/error callback did not return false.*syntax error/);

            // ACTUAL error.message for Windows plugin:
            if (isWindows)
              expect(error.message).toMatch(/error callback did not return false.*Error preparing an SQLite statement/);

            isWebSql ? done() : db.close(done, done);
          }, function() {
            // NOT EXPECTED:
            expect(false).toBe(true);
            isWebSql ? done() : db.close(done, done);
          });
        }, MYTIMEOUT);

        it(suiteName + 'constraint violation (incorrect error code & inconsistent message on Windows)', function(done) {
          if (isWP8) pending('SKIP for WP(8)'); // FUTURE TBD

          var db = openDatabase("Constraint-violation-test.db", "1.0", "Demo", DEFAULT_SIZE);
          expect(db).toBeDefined();

          var sqlerror = null; // VERIFY this was received

          db.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS test_table');
            tx.executeSql('CREATE TABLE IF NOT EXISTS test_table (data unique)');

            // First INSERT OK:
            tx.executeSql("INSERT INTO test_table (data) VALUES (?)", [123], null, function(tx, error) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              expect(error.message).toBe('--');
            });

            // Second INSERT will violate the unique constraint:
            tx.executeSql('INSERT INTO test_table (data) VALUES (?)', [123], function(tx) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              throw new Error('abort tx');

            }, function(tx, error) {
              sqlerror = error;
              expect(error).toBeDefined();
              expect(error.code).toBeDefined();
              expect(error.message).toBeDefined();

              // Plugin BROKEN on Windows: INVALID "SQLException" code -1
              // According to https://www.w3.org/TR/webdatabase/#errors-and-exceptions
              // the code member is "unsigned short" and may not be negative!
              if (isWindows)
                expect(error.code).toBe(-1);
              else
                expect(error.code).toBe(6);

              // Plugin BROKEN (INCONSISTENT) on Windows;
              // WebKit Web SQL "constraint failure" possibly missing 'r':
              if (!isWindows)
                expect(error.message).toMatch(/constr?aint fail/);

              // ACTUAL WebKit Web SQL error.message with SQLite error code:
              if (isWebSql)
                expect(error.message).toMatch(/could not execute statement due to a constr?aint failure.*19 c.*/);

              // Android WebKit Web SQL error.message with SQLite error code (possibly missing 'r'):
              if (isWebSql && isAndroid)
                expect(error.message).toMatch(/could not execute statement due to a constr?aint failure.*19 constraint failed/);

              // iOS WebKit Web SQL error.message with SQLite error code (possibly missing 'r'):
              if (isWebSql && !isAndroid)
                expect(error.message).toMatch(/could not execute statement due to a constr?aint failure.*19 column data is not unique/);

              // From built-in Android database exception message:
              if (!isWebSql && isAndroid && isImpl2)
                expect(error.message).toMatch(/constraint failure: column data is not unique.*code 19/);

              // ACTUAL for Windows:
              if (isWindows)
                expect(error.message).toMatch(/SQLite3 step error result code: 1/);

              // FAIL transaction & check reported transaction error:
              return true;
            });
          }, function (error) {
            expect(!!sqlerror).toBe(true); // VERIFY the SQL error callback was triggered

            expect(error).toBeDefined();
            expect(error.code).toBeDefined();
            expect(error.message).toBeDefined();

            // Plugin BROKEN on Windows: INVALID "SQLException" code -1
            // WebKit Web SQL reports 0: UNKNOWN_ERR in this case.
            if (isWindows)
              expect(error.code).toBe(-1);
            else if (isWebSql)
              expect(error.code).toBe(0);
            else
              expect(error.code).toBe(6);

            // MINIMUM (WebKit) Web SQL & plugin:
            expect(error.message).toMatch(/error callback did not return false/);

            // ACTUAL WebKit Web SQL (Android/iOS):
            if (isWebSql)
              expect(error.message).toMatch(/callback raised an exception.*or.*error callback did not return false/);

            // Extra info in error.message Android/iOS plugin:
            if (!isWebSql && !isWindows)
              expect(error.message).toMatch(/error callback did not return false.*constraint fail/);

            // ACTUAL for Windows:
            if (isWindows)
              expect(error.message).toMatch(/error callback did not return false.*SQLite3 step error result code: 1/);

            isWebSql ? done() : db.close(done, done);
          }, function() {
            // NOT EXPECTED:
            expect(false).toBe(true);
            isWebSql ? done() : db.close(done, done);
          });
        }, MYTIMEOUT);

      });

      describe(suiteName + 'other error code/message mapping test(s)', function() {

        it(suiteName + 'transaction.executeSql syntax error (command with misspelling) with no SQL error handler [Windows error code/messages BROKEN/INCONSISTENT]', function(done) {
          if (isWP8) pending('SKIP for WP(8)'); // FUTURE TBD

          db = openDatabase('tx-sql-syntax-error-with-no-sql-error-handler-test.db');
          db.transaction(function(transaction) {
            transaction.executeSql('SLCT 1');
          }, function(error) {
            // EXPECTED RESULT:
            expect(error).toBeDefined();
            expect(error.code).toBeDefined();
            expect(error.message).toBeDefined();

            // Plugin BROKEN on Windows: INVALID "SQLException" code -1
            // According to https://www.w3.org/TR/webdatabase/#errors-and-exceptions
            // the code member is "unsigned short" and may not be negative!
            if (isWindows)
              expect(error.code).toBe(-1);
            else
              expect(error.code).toBe(5);

            // ACTUAL WebKit Web SQL error.message (Android/iOS)
            // (SQLite error code is apparently part of Web SQL error.message)
            if (isWebSql)
              expect(error.message).toMatch(/could not prepare statement.*1 near \"SLCT\": syntax error/);

            // Plugin BROKEN (INCONSISTENT) on Windows:
            if (!isWebSql && !isWindows)
              expect(error.message).toMatch(/a statement with no error handler failed.*near \"SLCT\": syntax error/);

            // Extra info from Android-sqlite-connector:
            if (!isWebSql && isAndroid && !isImpl2)
              expect(error.message).toMatch(/a statement with no error handler failed: sqlite3_prepare_v2 failure:.*near \"SLCT\": syntax error/);

            // Extra SQLite info from androidDatabaseImplementation: 2 (built-in android.database):
            if (!isWebSql && isAndroid && isImpl2)
              expect(error.message).toMatch(/a statement with no error handler failed: near \"SLCT\": syntax error.*code 1.*while compiling: SLCT 1/);

            // ACTUAL error.message for Windows plugin:
            if (isWindows)
              expect(error.message).toMatch(/a statement with no error handler failed: Error preparing an SQLite statement/);

            isWebSql ? done() : db.close(done, done);
          }, function() {
            // NOT EXPECTED:
            expect(false).toBe(true);
            isWebSql ? done() : db.close(done, done);
          })
        }, MYTIMEOUT);

      });

    });
  }

}

if (window.hasBrowser) mytests();
else exports.defineAutoTests = mytests;

/* vim: set expandtab : */
