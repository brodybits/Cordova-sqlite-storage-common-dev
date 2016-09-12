/* 'use strict'; */

var MYTIMEOUT = 12000;

var DEFAULT_SIZE = 5000000; // max to avoid popup in safari/ios

var isWP8 = /IEMobile/.test(navigator.userAgent); // Matches WP(7/8/8.1)
var isWindows = /Windows /.test(navigator.userAgent); // Windows
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

      describe(suiteName + 'SQLITE error code/message mapping test(s)', function() {

        it(suiteName + 'syntax error (incorrect error code & inconsistent message on Windows)', function(done) {
          var db = openDatabase("Syntax-error-test.db", "1.0", "Demo", DEFAULT_SIZE);
          expect(db).toBeDefined();

          var sqlerror = null; // VERIFY this was received

          db.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS test_table');
            tx.executeSql('CREATE TABLE IF NOT EXISTS test_table (data unique)');

            // This insertion has a SQL syntax error
            tx.executeSql("insert into test_table (data) VALUES ", [123], function(tx) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              throw new Error('abort tx');

            }, function(tx, error) {
              sqlerror = error;
              expect(error).toBeDefined();
              expect(error.code).toBeDefined();
              expect(error.message).toBeDefined();

              // Plugin BROKEN on Windows: INCORRECT error code (0: UNKNOWN_ERR)
              if (!isWindows && !isWP8)
                expect(error.code).toBe(5);

              // Plugin BROKEN (INCONSISTENT) on Windows:
              if (!isWindows && !isWP8)
                expect(error.message).toMatch(/near .*\"*\"*:*syntax error/);

              // From built-in Android database exception message:
              if (!isWebSql && isAndroid && isImpl2)
                expect(error.message).toMatch(/near .*\"*\"*:*syntax error.*code 1/);

              // SQLite error code part of Web SQL error.message:
              if (isWebSql)
                expect(error.message).toMatch(/1 near .*\"*\"*:*syntax error/);

              // FAIL transaction & check reported transaction error:
              return true;
            });
          }, function (error) {
            expect(!!sqlerror).toBe(true); // VERIFY the SQL error callback was triggered

            expect(error).toBeDefined();
            expect(error.code).toBeDefined();
            expect(error.message).toBeDefined();

            isWebSql ? done() : db.close(done, done);
          }, function() {
            // NOT EXPECTED:
            expect(false).toBe(true);
            isWebSql ? done() : db.close(done, done);
          });
        }, MYTIMEOUT);

        it(suiteName + 'constraint violation (incorrect error code & inconsistent message on Windows)', function(done) {
          var db = openDatabase("Constraint-violation-test.db", "1.0", "Demo", DEFAULT_SIZE);
          expect(db).toBeDefined();

          var sqlerror = null; // VERIFY this was received

          db.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS test_table');
            tx.executeSql('CREATE TABLE IF NOT EXISTS test_table (data unique)');

            tx.executeSql('INSERT INTO test_table (data) VALUES (?)', [123], null, function(tx, error) {
              expect(false).toBe(true);
              expect(error.message).toBe('--');
            });

            // This insertion will violate the unique constraint
            tx.executeSql('INSERT INTO test_table (data) VALUES (?)', [123], function(tx) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              throw new Error('abort tx');
            }, function(tx, error) {
              sqlerror = error;
              expect(error).toBeDefined();
              expect(error.code).toBeDefined();
              expect(error.message).toBeDefined();

              // Plugin BROKEN on Windows: INCORRECT error code (0: UNKNOWN_ERR)
              if (!isWindows)
                expect(error.code).toBe(6);

              if (isWebSql) // WebSQL may have a missing 'r' (iOS):
                expect(error.message).toMatch(/constr?aint fail/);
              else if (!isWindows && !isWP8) // Plugin BROKEN (INCONSISTENT) on Windows
                expect(error.message).toMatch(/constraint fail/);

              // From built-in Android database exception message:
              if (!isWebSql && isAndroid && isImpl2)
                expect(error.message).toMatch(/not unique.*code 19/);

              // SQLite error code part of Web SQL error.message (Android):
              if (isWebSql && isAndroid)
                expect(error.message).toMatch(/19 .*constraint fail/);

              // SQLite error code is apparently part of Web SQL error.message (iOS only):
              if (isWebSql && !isAndroid)
                expect(error.message).toMatch(/19 .*not unique/);

              // FAIL transaction & check reported transaction error:
              return true;
            });
          }, function (error) {
            expect(!!sqlerror).toBe(true); // VERIFY the SQL error callback was triggered

            expect(error).toBeDefined();
            expect(error.code).toBeDefined();
            expect(error.message).toBeDefined();

            isWebSql ? done() : db.close(done, done);
          }, function() {
            // NOT EXPECTED:
            expect(false).toBe(true);
            isWebSql ? done() : db.close(done, done);
          });
        }, MYTIMEOUT);

      });

    });
  }

}

if (window.hasBrowser) mytests();
else exports.defineAutoTests = mytests;

/* vim: set expandtab : */
