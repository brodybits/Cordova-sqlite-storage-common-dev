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

        it(suiteName + 'syntax error: command with misspelling (incorrect error code & inconsistent message on Windows)', function(done) {
          var db = openDatabase("Syntax-error-test.db", "1.0", "Demo", DEFAULT_SIZE);
          expect(db).toBeDefined();

          var sqlerror = null; // VERIFY this was received

          db.transaction(function(tx) {
            // This insertion has a SQL syntax error
            tx.executeSql('SLCT 1 ', [], function(tx) {
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
              else
                expect(error.code).toBe(0);

              // Plugin BROKEN (INCONSISTENT) on Windows:
              //if (!isWindows && !isWP8)
                expect(error.message).toMatch(/near \"SLCT\": syntax error/);

              // From built-in Android database exception message:
              if (!isWebSql && isAndroid && isImpl2)
                expect(error.message).toMatch(/near \"SLCT\": syntax error.*code 1.*while compiling: SLCT 1/);

              // ACTUAL WebKit Web SQL error.message (Android/iOS)
              // (SQLite error code is apparently part of Web SQL error.message)
              if (isWebSql)
                expect(error.message).toMatch(/could not prepare statement.*1 near \"SLCT\": syntax error/);

              // FAIL transaction & check reported transaction error:
              return true;
            });
          }, function (error) {
            expect(!!sqlerror).toBe(true); // VERIFY the SQL error callback was triggered

            expect(error).toBeDefined();
            expect(error.code).toBeDefined();
            expect(error.message).toBeDefined();

            // Plugin BROKEN on Windows: INCORRECT error code (0: UNKNOWN_ERR)
            // WebKit Web SQL ALSO reports 0: UNKNOWN_ERR in this case.
            // ref: https://www.w3.org/TR/webdatabase/#dom-sqlerror-code-1
            if (!isWebSql && !isWindows)
              expect(error.code).toBe(5);
            else
              expect(error.code).toBe(0);

            // MINIMUM (WebKit) Web SQL & plugin:
            expect(error.message).toMatch(/error callback did not return false/);

            // ACTUAL WebKit Web SQL (Android/iOS):
            if (isWebSql)
              expect(error.message).toMatch(/callback raised an exception.*or.*error callback did not return false/);

            // Extra info in error.message Android/iOS plugin (TBD: WP8):
            //if (!isWebSql && !isWindows)
            if (!isWebSql)
              expect(error.message).toMatch(/error callback did not return false.*syntax error/);

            isWebSql ? done() : db.close(done, done);
          }, function() {
            // NOT EXPECTED:
            expect(false).toBe(true);
            isWebSql ? done() : db.close(done, done);
          });
        }, MYTIMEOUT);

        it(suiteName + 'INSERT syntax error [VALUES in the wrong place] (incorrect error code & inconsistent message on Windows)', function(done) {
          var db = openDatabase("Syntax-error-test.db", "1.0", "Demo", DEFAULT_SIZE);
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

              // Plugin BROKEN on Windows: INCORRECT error code (0: UNKNOWN_ERR)
              if (!isWindows && !isWP8)
                expect(error.code).toBe(5);
              else
                expect(error.code).toBe(0);

              // Plugin BROKEN (INCONSISTENT) on Windows:
              //if (!isWindows && !isWP8)
                expect(error.message).toMatch(/near \".*\": syntax error/);

              // Plugin BROKEN (INCONSISTENT) on Windows:
              if (!isWebSql && !isWindows && !isWP8 && !(isAndroid && isImpl2))
                expect(error.message).toMatch(/near \" \": syntax error/);

              // From built-in Android database exception message
              // (SQLite error code is apparently part of Web SQL error.message)
              if (!isWebSql && isAndroid && isImpl2)
                expect(error.message).toMatch(/near \"VALUES\": syntax error.*code 1.*while compiling: INSERT INTO test_table/);

              // ACTUAL WebKit Web SQL error.message (Android/iOS)
              // (SQLite error code is apparently part of Web SQL error.message)
              if (isWebSql)
                expect(error.message).toMatch(/could not prepare statement.*1 near .*\"*\"*:*syntax error/);

              // FAIL transaction & check reported transaction error:
              return true;
            });
          }, function (error) {
            expect(!!sqlerror).toBe(true); // VERIFY the SQL error callback was triggered

            expect(error).toBeDefined();
            expect(error.code).toBeDefined();
            expect(error.message).toBeDefined();

            // Plugin BROKEN on Windows: INCORRECT error code (0: UNKNOWN_ERR)
            // WebKit Web SQL ALSO reports 0: UNKNOWN_ERR in this case.
            // ref: https://www.w3.org/TR/webdatabase/#dom-sqlerror-code-1
            if (!isWebSql && !isWindows)
              expect(error.code).toBe(5);
            else
              expect(error.code).toBe(0);

            // MINIMUM (WebKit) Web SQL & plugin:
            expect(error.message).toMatch(/error callback did not return false/);

            // ACTUAL WebKit Web SQL (Android/iOS):
            if (isWebSql)
              expect(error.message).toMatch(/callback raised an exception.*or.*error callback did not return false/);

            // Extra info in error.message Android/iOS plugin (TBD: WP8):
            if (!isWebSql && !isWindows)
              expect(error.message).toMatch(/error callback did not return false.*syntax error/);

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
              if (!isWindows && !isWP8)
                expect(error.code).toBe(6);
              else
                expect(error.code).toBe(0);

              if (isWebSql) // WebSQL may have a missing 'r' (iOS):
                expect(error.message).toMatch(/constr?aint fail/);
              else //if (!isWindows) // Plugin BROKEN (INCONSISTENT) on Windows
                expect(error.message).toMatch(/constraint fail/);

              // From built-in Android database exception message:
              if (!isWebSql && isAndroid && isImpl2)
                expect(error.message).toMatch(/not unique.*code 19/);

              // SQLite error code part of Web SQL error.message (Android):
              if (isWebSql && isAndroid)
                expect(error.message).toMatch(/19 .*constraint fail/);

              // SQLite error code part of Web SQL error.message (iOS):
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

            // Plugin BROKEN on Windows: INCORRECT error code (0: UNKNOWN_ERR)
            // WebKit Web SQL ALSO reports 0: UNKNOWN_ERR in this case.
            // ref: https://www.w3.org/TR/webdatabase/#dom-sqlerror-code-1
            if (isWebSql)
              expect(error.code).toBe(0);
            else if (!isWindows && !isWP8)
              expect(error.code).toBe(6);

            // MINIMUM (WebKit) Web SQL & plugin:
            expect(error.message).toMatch(/error callback did not return false/);

            // ACTUAL WebKit Web SQL (Android/iOS):
            if (isWebSql)
              expect(error.message).toMatch(/callback raised an exception.*or.*error callback did not return false/);

            // Extra info in error.message Android/iOS plugin:
            if (!isWebSql && !isWindows && !isWP8)
              expect(error.message).toMatch(/error callback did not return false.*constraint fail/);

            isWebSql ? done() : db.close(done, done);
          }, function() {
            // NOT EXPECTED:
            expect(false).toBe(true);
            isWebSql ? done() : db.close(done, done);
          });
        }, MYTIMEOUT);

        it(suiteName + 'SELECT uper("Test") [misspelled function name] (incorrect error code & inconsistent message on Windows/WP8)', function(done) {
          var db = openDatabase("Syntax-error-test.db", "1.0", "Demo", DEFAULT_SIZE);
          expect(db).toBeDefined();

          var sqlerror = null; // VERIFY this was received

          db.transaction(function(tx) {
            // This insertion has a SQL syntax error
            tx.executeSql('SELECT uper("Test")', [], function(tx) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              throw new Error('abort tx');

            }, function(tx, error) {
              sqlerror = error;
              expect(error).toBeDefined();
              expect(error.code).toBeDefined();
              expect(error.message).toBeDefined();

              // INCORRECT error.code - should be 1: DATABASE_ERR
              // ("not covered by any other error code")
              // ref: https://www.w3.org/TR/webdatabase/#dom-sqlerror-code-1
              // WebKit Web SQL, iOS plugin, & default Android implementation all report 5 (SYNTAX_ERR)
              // Android implementation 2 (using built-in AOSP database classes) as well
              // as Windows reports 0 (UNKNOWN_ERR)
              if (!isWindows && !isWP8 && !(isAndroid && isImpl2))
                expect(error.code).toBe(5);
              else
                expect(error.code).toBe(0);

              // Plugin error message - BROKEN (INCONSISTENT) on Windows:
              if (!isWindows && !isWP8)
                expect(error.message).toMatch(/no such function: uper/);

              // From built-in Android database exception message:
              if (!isWebSql && isAndroid && isImpl2)
                expect(error.message).toMatch(/no such function: uper.*code 1/);

              // ACTUAL WebKit Web SQL error.message (Android/iOS)
              // (SQLite error code is apparently part of Web SQL error.message)
              if (isWebSql)
                expect(error.message).toMatch(/could not prepare statement.*1 no such function: uper/);

              // FAIL transaction & check reported transaction error:
              return true;
            });
          }, function (error) {
            expect(!!sqlerror).toBe(true); // VERIFY the SQL error callback was triggered

            expect(error).toBeDefined();
            expect(error.code).toBeDefined();
            expect(error.message).toBeDefined();

            // INCORRECT error.code - should be 1: DATABASE_ERR
            // ("not covered by any other error code")
            // ref: https://www.w3.org/TR/webdatabase/#dom-sqlerror-code-1
            // WebKit Web SQL reports 0 [UNKNOWN_ERR] in this case.
            // iOS plugin, & default Android implementation all report 5 (SYNTAX_ERR)
            // Android implementation 2 (using built-in AOSP database classes) as well
            // as Windows/WP8 report 0 (UNKNOWN_ERR)
            if (!isWebSql && !isWindows && !isWP8 && !(isAndroid && isImpl2))
              expect(error.code).toBe(5);
            else
              expect(error.code).toBe(0);

            // MINIMUM (WebKit) Web SQL & plugin:
            expect(error.message).toMatch(/error callback did not return false/);

            // ACTUAL WebKit Web SQL (Android/iOS):
            if (isWebSql)
              expect(error.message).toMatch(/callback raised an exception.*or.*error callback did not return false/);

            // Extra info in error.message Android/iOS plugin:
            if (!isWebSql && !isWindows && !isWP8)
              expect(error.message).toMatch(/error callback did not return false.*no such function: uper/);

            isWebSql ? done() : db.close(done, done);
          }, function() {
            // NOT EXPECTED:
            expect(false).toBe(true);
            isWebSql ? done() : db.close(done, done);
          });
        }, MYTIMEOUT);

        it(suiteName + 'CREATE VIRTUAL TABLE USING bogus module (other database error) [INCORRECT error code WebKit Web SQL & plugin] (inconsistent error message Windows/WP8)', function(done) {
          var db = openDatabase("create-virtual-table-using-bogus-module-error-test.db", "1.0", "Demo", DEFAULT_SIZE);
          expect(db).toBeDefined();

          var sqlerror = null; // VERIFY the SQL error callback was triggered

          db.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS test_table');
            // Attempt to use a bogus module:
            tx.executeSql('CREATE VIRTUAL TABLE test_table USING bogus_module (data)', [], function(ignored1, ignored2) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              throw new Error('abort tx');

            }, function(tx, error) {
              sqlerror = error;
              expect(error).toBeDefined();
              expect(error.code).toBeDefined();
              expect(error.message).toBeDefined();

              // INCORRECT error.code: should be 1
              // (DATABASE_ERR "not covered by any other error code")
              // ref: https://www.w3.org/TR/webdatabase/#dom-sqlerror-code-1
              // Web SQL, iOS plugin, & default Android implementation all report 5 (SYNTAX_ERR)
              // Android implementation 2 (using built-in AOSP database classes) as well
              // as Windows/WP8 report 0 (UNKNOWN_ERR)
              if (isWebSql || (!isWindows && !isWP8 && !(isAndroid && isImpl2)))
                expect(error.code).toBe(5);
              else
                expect(error.code).toBe(0);

              // WebKit Web SQL error message (apparenly with SQLite error code)
              if (isWebSql)
                expect(error.message).toMatch(/could not prepare statement.*1 not authorized/);

              // Plugin error message - BROKEN (INCONSISTENT) on Windows:
              //if (!isWebSql && !isWindows)
              if (!isWebSql)
                expect(error.message).toMatch(/no such module: bogus/);

              // From built-in Android database exception message:
              if (!isWebSql && isAndroid && isImpl2)
                expect(error.message).toMatch(/no such module: bogus.*code 1/);

              // FAIL transaction & check reported transaction error:
              return true;
            });
          }, function (error) {
            expect(!!sqlerror).toBe(true); // VERIFY the SQL error callback was triggered
            expect(error).toBeDefined();
            expect(error.code).toBeDefined();
            expect(error.message).toBeDefined();

            // INCORRECT error.code - should be 1: DATABASE_ERR
            // ("not covered by any other error code")
            // ref: https://www.w3.org/TR/webdatabase/#dom-sqlerror-code-1
            // WebKit Web SQL reports 0 [UNKNOWN_ERR] in this case.
            // iOS plugin, & default Android implementation all report 5 (SYNTAX_ERR)
            // Android implementation 2 (using built-in AOSP database classes) as well
            // as Windows/WP8 report 0 (UNKNOWN_ERR)
            if (!isWebSql && !isWindows && !isWP8 && !(isAndroid && isImpl2))
              expect(error.code).toBe(5);
            else
              expect(error.code).toBe(0);

            // MINIMUM (WebKit) Web SQL & plugin:
            expect(error.message).toMatch(/error callback did not return false/);

            // ACTUAL WebKit Web SQL (Android/iOS):
            if (isWebSql)
              expect(error.message).toMatch(/callback raised an exception.*or.*error callback did not return false/);

            // Extra info in error.message Android/iOS plugin (TBD: WP8):
            //if (!isWebSql && !isWindows)
            if (!isWebSql)
              expect(error.message).toMatch(/error callback did not return false.*no such module: bogus/);

            isWebSql ? done() : db.close(done, done);
          }, function() {
            // NOT EXPECTED:
            expect(false).toBe(true);
            isWebSql ? done() : db.close(done, done);
          });
        }, MYTIMEOUT);

        it(suiteName + 'SELECT FROM bogus table (other database error) [INCORRECT error code WebKit Web SQL & plugin] (inconsistent error message Windows/WP8)', function(done) {
          var db = openDatabase("SELECT-FROM-bogus-table-error-test.db", "1.0", "Demo", DEFAULT_SIZE);
          expect(db).toBeDefined();

          var sqlerror = null; // VERIFY the SQL error callback was triggered

          db.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS BogusTable');
            // Attempt to SELECT FROM a bogus table:
            tx.executeSql('SELECT * FROM BogusTable', [], function(ignored1, ignored2) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              throw new Error('abort tx');

            }, function(tx, error) {
              sqlerror = error;
              expect(error).toBeDefined();
              expect(error.code).toBeDefined();
              expect(error.message).toBeDefined();

              // INCORRECT error.code - should be 1: DATABASE_ERR
              // ("not covered by any other error code")
              // ref: https://www.w3.org/TR/webdatabase/#dom-sqlerror-code-1
              // WebKit Web SQL, iOS plugin, & default Android implementation all report 5 (SYNTAX_ERR)
              // Android implementation 2 (using built-in AOSP database classes) as well
              // as Windows/WP8 report 0 (UNKNOWN_ERR)
              if (isWebSql || (!isWindows && !isWP8 && !(isAndroid && isImpl2)))
                expect(error.code).toBe(5);
              else
                expect(error.code).toBe(0);

              // WebKit Web SQL error message (apparenly with SQLite error code)
              if (isWebSql)
                expect(error.message).toMatch(/could not prepare statement.*1 no such table: BogusTable/);

              expect(error.message).toMatch(/no such table: BogusTable/);

              // FAIL transaction & check reported transaction error:
              return true;
            });
          }, function (error) {
            expect(!!sqlerror).toBe(true); // VERIFY the SQL error callback was triggered
            expect(error).toBeDefined();
            expect(error.code).toBeDefined();
            expect(error.message).toBeDefined();

            // INCORRECT error.code - should be 1: DATABASE_ERR
            // ("not covered by any other error code")
            // ref: https://www.w3.org/TR/webdatabase/#dom-sqlerror-code-1
            // WebKit Web SQL reports 0 [UNKNOWN_ERR] in this case.
            // Plugin (iOS & default Android implementation) reports 5 (SYNTAX_ERR)
            // Android implementation 2 (using built-in AOSP database classes) as well
            // as Windows/WP8 report 0 (UNKNOWN_ERR)
            if (!isWebSql && !isWindows && !isWP8 && !(isAndroid && isImpl2))
              expect(error.code).toBe(5);
            else
              expect(error.code).toBe(0);

            // MINIMUM (WebKit) Web SQL & plugin:
            expect(error.message).toMatch(/error callback did not return false/);

            // ACTUAL WebKit Web SQL (Android/iOS):
            if (isWebSql)
              expect(error.message).toMatch(/callback raised an exception.*or.*error callback did not return false/);

            // Extra info in error.message Android/iOS plugin:
            if (!isWebSql && !isWindows && !isWP8)
              expect(error.message).toMatch(/error callback did not return false.*no such table: BogusTable/);

            isWebSql ? done() : db.close(done, done);
          }, function() {
            // NOT EXPECTED:
            expect(false).toBe(true);
            isWebSql ? done() : db.close(done, done);
          });
        }, MYTIMEOUT);

        it(suiteName + 'INSERT missing column (incorrect error code & inconsistent message on Windows/WP8)', function(done) {
          var db = openDatabase("INSERT-missing-column-test.db", "1.0", "Demo", DEFAULT_SIZE);
          expect(db).toBeDefined();

          var sqlerror = null; // VERIFY this was received

          db.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS test_table');
            tx.executeSql('CREATE TABLE IF NOT EXISTS test_table (data1, data2)');

            tx.executeSql('INSERT INTO test_table VALUES (?)', ['abcdef'], function(tx) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              throw new Error('abort tx');

            }, function(tx, error) {
              sqlerror = error;
              expect(error).toBeDefined();
              expect(error.code).toBeDefined();
              expect(error.message).toBeDefined();

              // INCORRECT error.code - should be 1: DATABASE_ERR
              // ("not covered by any other error code")
              // ref: https://www.w3.org/TR/webdatabase/#dom-sqlerror-code-1
              // WebKit Web SQL, iOS plugin, & default Android implementation all report 5 (SYNTAX_ERR)
              // Android implementation 2 (using built-in AOSP database classes) as well
              // as Windows reports 0 (UNKNOWN_ERR)
              if (!isWindows && !isWP8 && !(isAndroid && isImpl2))
                expect(error.code).toBe(5);
              else
                expect(error.code).toBe(0);

              // General case (WebKit Web SQL & plugin):
              expect(error.message).toMatch(/table test_table has 2 columns but 1 values were supplied/);

              // TBD: Extra info from Android-sqlite-connector:
              if (isAndroid && !isWebSql && !isImpl2)
                expect(error.message).toMatch(/sqlite3_prepare_v2 failure:.*table test_table has 2 columns but 1 values were supplied/);

              // Extra SQLite info from androidDatabaseImplementation: 2 (built-in android.database):
              if (isAndroid && !isWebSql && isImpl2)
                expect(error.message).toMatch(/table test_table has 2 columns but 1 values were supplied.*code 1.*while compiling: INSERT INTO test_table/);

              // Extra SQLite info in Android WebKit Web SQL:
              if (isAndroid && isWebSql)
                expect(error.message).toMatch(/could not prepare statement.*1 table test_table has 2 columns but 1 values were supplied/);

              // FAIL transaction & check reported transaction error:
              return true;
            });
          }, function (error) {
            expect(!!sqlerror).toBe(true); // VERIFY the SQL error callback was triggered

            expect(error).toBeDefined();
            expect(error.code).toBeDefined();
            expect(error.message).toBeDefined();

            // INCORRECT error.code - should be 1: DATABASE_ERR
            // ("not covered by any other error code")
            // ref: https://www.w3.org/TR/webdatabase/#dom-sqlerror-code-1
            // WebKit Web SQL reports 0 [UNKNOWN_ERR] in this case.
            // Plugin (iOS & default Android implementation) reports 5 (SYNTAX_ERR)
            // Android implementation 2 (using built-in AOSP database classes) as well
            // as Windows/WP8 report 0 (UNKNOWN_ERR)
            if (!isWebSql && !isWindows && !isWP8 && !(isAndroid && isImpl2))
              expect(error.code).toBe(5);
            else
              expect(error.code).toBe(0);

            // Plugin ONLY:
            if (!isWebSql)
              expect(error.message).toMatch(/table test_table has 2 columns but 1 values were supplied/);

            // ACTUAL WebKit Web SQL (Android/iOS):
            if (isWebSql)
              expect(error.message).toMatch(/callback raised an exception.*or.*error callback did not return false/);

            // Extra info in error.message Android/iOS plugin:
            if (!isWebSql && !isWindows && !isWP8)
              expect(error.message).toMatch(/error callback did not return false.*table test_table has 2 columns but 1 values were supplied/);

            // Extra info with extra SQLite info from androidDatabaseImplementation: 2 (built-in android.database):
            if (isAndroid && !isWebSql && isImpl2)
              expect(error.message).toMatch(/error callback did not return false.*table test_table has 2 columns but 1 values were supplied.*code 1.*while compiling: INSERT/);

            isWebSql ? done() : db.close(done, done);
          }, function() {
            // NOT EXPECTED:
            expect(false).toBe(true);
            isWebSql ? done() : db.close(done, done);
          });
        }, MYTIMEOUT);

        it(suiteName + 'INSERT wrong column name (incorrect error code & inconsistent message on Windows/WP8)', function(done) {
          var db = openDatabase("INSERT-wrong-column-name-test.db", "1.0", "Demo", DEFAULT_SIZE);
          expect(db).toBeDefined();

          var sqlerror = null; // VERIFY this was received

          db.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS test_table');
            tx.executeSql('CREATE TABLE IF NOT EXISTS test_table (data1)');

            tx.executeSql('INSERT INTO test_table (wrong_column) VALUES (?)', ['abcdef'], function(tx) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              throw new Error('abort tx');

            }, function(tx, error) {
              sqlerror = error;
              expect(error).toBeDefined();
              expect(error.code).toBeDefined();
              expect(error.message).toBeDefined();

              // INCORRECT error.code - should be 1: DATABASE_ERR
              // ("not covered by any other error code")
              // ref: https://www.w3.org/TR/webdatabase/#dom-sqlerror-code-1
              // WebKit Web SQL, iOS plugin, & default Android implementation all report 5 (SYNTAX_ERR)
              // Android implementation 2 (using built-in AOSP database classes) as well
              // as Windows reports 0 (UNKNOWN_ERR)
              if (!isWindows && !isWP8 && !(isAndroid && isImpl2))
                expect(error.code).toBe(5);

              // General case (WebKit Web SQL & plugin):
              expect(error.message).toMatch(/table test_table has no column named wrong_column/);

              // TBD: Extra info from Android-sqlite-connector:
              if (isAndroid && !isWebSql && !isImpl2)
                expect(error.message).toMatch(/sqlite3_prepare_v2 failure:.*table test_table has no column named wrong_column/);

              // Extra SQLite info from androidDatabaseImplementation: 2 (built-in android.database):
              if (isAndroid && !isWebSql && isImpl2)
                expect(error.message).toMatch(/table test_table has no column named wrong_column.*code 1.*while compiling: INSERT INTO test_table/);

              // Extra SQLite info in Android WebKit Web SQL:
              if (isAndroid && isWebSql)
                expect(error.message).toMatch(/could not prepare statement.*1 table test_table has no column named wrong_column/);

              // FAIL transaction & check reported transaction error:
              return true;
            });
          }, function (error) {
            expect(!!sqlerror).toBe(true); // VERIFY the SQL error callback was triggered

            expect(error).toBeDefined();
            expect(error.code).toBeDefined();
            expect(error.message).toBeDefined();

            // INCORRECT error.code - should be 1: DATABASE_ERR
            // ("not covered by any other error code")
            // ref: https://www.w3.org/TR/webdatabase/#dom-sqlerror-code-1
            // WebKit Web SQL reports 0 [UNKNOWN_ERR] in this case.
            // Plugin (iOS & default Android implementation) reports 5 (SYNTAX_ERR)
            // Android implementation 2 (using built-in AOSP database classes) as well
            // as Windows/WP8 report 0 (UNKNOWN_ERR)
            if (!isWebSql && !isWindows && !isWP8 && !(isAndroid && isImpl2))
              expect(error.code).toBe(5);
            else
              expect(error.code).toBe(0);

            // Plugin ONLY:
            if (!isWebSql)
              expect(error.message).toMatch(/table test_table has no column named wrong_column/);

            // ACTUAL WebKit Web SQL (Android/iOS):
            if (isWebSql)
              expect(error.message).toMatch(/callback raised an exception.*or.*error callback did not return false/);

            // Extra info in error.message Android/iOS plugin:
            if (!isWebSql && !isWindows && !isWP8)
              expect(error.message).toMatch(/error callback did not return false.*table test_table has no column named wrong_column/);

            // Extra info with extra SQLite info from androidDatabaseImplementation: 2 (built-in android.database):
            if (isAndroid && !isWebSql && isImpl2)
              expect(error.message).toMatch(/error callback did not return false.*table test_table has no column named wrong_column.*code 1.*while compiling: INSERT/);

            isWebSql ? done() : db.close(done, done);
          }, function() {
            // NOT EXPECTED:
            expect(false).toBe(true);
            isWebSql ? done() : db.close(done, done);
          });
        }, MYTIMEOUT);

      });

      describe(suiteName + 'invalid parameter error code/message tests', function() {
        it(suiteName + 'Inline US-ASCII String manipulation test with parameters=false', function(done) {
          var db = openDatabase("Inline-US-ASCII-string-test-with-parameters-equals-false.db", "1.0", "Demo", DEFAULT_SIZE);

          db.transaction(function(tx) {

            try {
              tx.executeSql("SELECT UPPER('Some US-ASCII text') AS uppertext", false, function(ignored, res) {
                // ACTUAL BEHAVIOR for plugin (Android/iOS/Windows):
                if (isWebSql) expect('RESULT NOT EXPECTED for Web SQL').toBe('--');

                expect(res.rows.item(0).uppertext).toBe("SOME US-ASCII TEXT");

                // Close (plugin only) & finish:
                (isWebSql) ? done() : db.close(done, done);
              }, function(error) {
                // NOT EXPECTED:
                expect(false).toBe(true);
                expect(error.message).toBe('--');
                return true;
              });
            } catch(ex) {
              // EXPECTED RESULT for [WebKit] Web SQL:
              if (!isWebSql) expect('Plugin BEHAVIOR CHANGED, please update this test').toBe('--');
              expect(ex).toBeDefined();
              expect(ex.code).toBeDefined();
              expect(ex.message).toBeDefined();
              expect(ex.code).toBe(17);
              if (isAndroid)
                expect(ex.message).toMatch(/The type of an object was incompatible with the expected type of the parameter associated to the object/);
              else
                expect(ex.message).toMatch(/TypeMismatchError: DOM Exception 17/);
              throw ex;
            }

          }, function(error) {
            // EXPECTED RESULT for [WebKit] Web SQL:
            if (!isWebSql) expect('Plugin BEHAVIOR CHANGED, please update this test').toBe('--');
            expect(error).toBeDefined();
            expect(error.code).toBeDefined();
            expect(error.message).toBeDefined();
            expect(error.code).toBe(0);
            expect(error.message).toMatch(/the SQLTransactionCallback was null or threw an exception/);

            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);
          });
        }, MYTIMEOUT);

      });

      describe(suiteName + 'parameter count mismatch error code/message tests', function() {

        it(suiteName + 'executeSql with not enough parameters (Plugin DEVIATION: does not reject such SQL statements, will not be changed.)', function(done) {
          var db = openDatabase("tx-execute-sql-with-not-enough-parameters.db", "1.0", "Demo", DEFAULT_SIZE);

          var sqlerror = null; // VERIFY this was received

          db.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS test_table');
            // CREATE columns with no type affinity
            tx.executeSql('CREATE TABLE IF NOT EXISTS test_table (data1, data2)', [], function(ignored1, ignored2) {
              tx.executeSql("INSERT INTO test_table VALUES (?,?)", ['first'], function(tx, rs1) {
                // ACTUAL BEHAVIOR for plugin (Android/iOS/Windows):
                if (isWebSql) expect('RESULT NOT EXPECTED for Web SQL').toBe('--');
                expect(rs1).toBeDefined();
                expect(rs1.rowsAffected).toBe(1);

                tx.executeSql('SELECT * FROM test_table', [], function(tx, rs2) {
                  expect(rs2.rows.length).toBe(1);
                  expect(rs2.rows.item(0).data1).toBe('first');
                  expect(rs2.rows.item(0).data2).toBeNull();
                  (isWebSql) ? done() : db.close(done, done);
                });

              }, function(ignored, error) {
                sqlerror = error;

                // CORRECT (Web SQL ONLY):
                if (!isWebSql) expect('Plugin BEHAVIOR CHANGED, please update this test').toBe('--');

                expect(error).toBeDefined();
                expect(error.code).toBeDefined();
                expect(error.message).toBeDefined();

                // WebKit Web SQL reports correct error code (5 - SYNTAX_ERR) in this case.
                expect(error.code).toBe(5);

                // WebKit Web SQL error message (Android/iOS):
                expect(error.message).toMatch(/number of '\?'s in statement string does not match argument count/);

                // FAIL transaction & check reported transaction error:
                return true;
              });
            });
          }, function(error) {
            if (!isWebSql) expect('Plugin BEHAVIOR CHANGED, please update this test').toBe('--');

            expect(!!sqlerror).toBe(true); // VERIFY the SQL error callback was triggered

            expect(error).toBeDefined();
            expect(error.code).toBeDefined();
            expect(error.message).toBeDefined();

            // TBD plugin vs WebKit Web SQL:
            if (!isWebSql && !isWindows && !isWP8 && !(isAndroid && isImpl2))
              expect(error.code).toBe(5);
            else
              expect(error.code).toBe(0);

            // WebKit Web SQL reports INCORRECT error code: 0 - [UNKNOWN_ERR] here:
            expect(error.code).toBe(0);

            // ACTUAL WebKit Web SQL (Android/iOS):
            if (isWebSql)
              expect(error.message).toMatch(/callback raised an exception.*or.*error callback did not return false/);

            isWebSql ? done() : db.close(done, done);
          });
        }, MYTIMEOUT);

        it(suiteName + 'executeSql with too many parameters (extra string value) [iOS PLUGIN BROKEN with possible parameter data loss & INCORRECT error code]', function(done) {
          var db = openDatabase("too-many-parameters.db", "1.0", "Demo", DEFAULT_SIZE);

          var sqlerror = null; // VERIFY this was received

          db.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS test_table');
            // CREATE columns with no type affinity
            tx.executeSql('CREATE TABLE IF NOT EXISTS test_table (data1, data2)', [], function(ignored1, ignored2) {
              tx.executeSql('INSERT INTO test_table (data1, data2) VALUES (?,?)', ['first', 'second', 'third'], function(tx, rs1) {
                // ACTUAL for plugin - iOS ONLY:
                if (isWebSql) expect('RESULT NOT EXPECTED for Web SQL').toBe('--');
                if (!isWebSql && (isAndroid || isWindows || isWP8)) expect('Plugin behavior changed: BROKEN for Android, Windows, or WP8').toBe('--');
                expect(rs1).toBeDefined();
                expect(rs1.rowsAffected).toBe(1);

                tx.executeSql('SELECT * FROM test_table', [], function(tx, rs2) {
                  expect(rs2.rows.length).toBe(1);
                  expect(rs2.rows.item(0).data1).toBe('first');
                  expect(rs2.rows.item(0).data2).toBe('second');
                  // Close (plugin only) & finish:
                  (isWebSql) ? done() : db.close(done, done);
                });

              }, function(ignored, error) {
                sqlerror = error;

                // CORRECT (Web SQL; Android/Windows/WP8 plugin):
                if (!isWebSql && !isAndroid && !isWindows && !isWP8) expect('Plugin behavior changed [FIXED for iOS] please update this test').toBe('--');

                expect(error).toBeDefined();
                expect(error.code).toBeDefined();
                expect(error.message).toBeDefined();

                // PLUGIN BROKEN: reports INCORRECT error code: 0 (UNKNOWN_ERR)
                // WebKit Web SQL reports correct error code: 5 (SYNTAX_ERR) in this case.
                // ref: https://www.w3.org/TR/webdatabase/#dom-sqlexception-code-syntax
                if (isWebSql)
                  expect(error.code).toBe(5);
                else
                  expect(error.code).toBe(0);

                // WebKit Web SQL error message (Android/iOS):
                if (isWebSql)
                  expect(error.message).toMatch(/number of '\?'s in statement string does not match argument count/);

                // FUTURE TBD: plugin error message may be changed (??)
                if (!isWebSql)
                  expect(error.message).toMatch(/index.*out of range/);

                // FAIL transaction & check reported transaction error:
                return true;
              });
            });
          }, function(error) {
            if (!isWebSql && !isAndroid && !isWindows && !isWP8) expect('Plugin behavior changed [FIXED for iOS] please update this test').toBe('--');

            expect(!!sqlerror).toBe(true); // VERIFY the SQL error callback was triggered

            expect(error).toBeDefined();
            expect(error.code).toBeDefined();
            expect(error.message).toBeDefined();

            // PLUGIN BROKEN: reports INCORRECT error code: 0 (UNKNOWN_ERR)
            // WebKit Web SQL ALSO reports 0: UNKNOWN_ERR in this case.
            // ref: https://www.w3.org/TR/webdatabase/#dom-sqlexception-code-syntax
            if (!isWebSql && !isAndroid && isWindows && !isWP8)
              expect(error.code).toBe(5);
            else
              expect(error.code).toBe(0);

            // ACTUAL WebKit Web SQL (Android/iOS):
            if (isWebSql)
              expect(error.message).toMatch(/callback raised an exception.*or.*error callback did not return false/);

            isWebSql ? done() : db.close(done, done);
          });
        }, MYTIMEOUT);

        // NOTE: additional tests with extra REAL/INTEGER/null values added since an [iOS] implementation
        // could potentially detect an 'index out of range' error for some but not all parameter value types.
        // This is somewhat theoretical since the native [Android/iOS/etc.] implementation should
        // simply use sqlite3_bind_parameter_count ref: https://www.sqlite.org/c3ref/bind_parameter_count.html
        // to get the correct parameter count and and check before attempting to bind any of the parameter values.

        it(suiteName + 'executeSql with too many parameters: extra REAL value [iOS PLUGIN BROKEN with possible parameter data loss]', function(done) {
          var db = openDatabase("too-many-parameters.db", "1.0", "Demo", DEFAULT_SIZE);

          //var sqlerror = null; // VERIFY this was received

          db.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS test_table');
            // CREATE columns with no type affinity
            tx.executeSql('CREATE TABLE IF NOT EXISTS test_table (data1, data2)', [], function(ignored1, ignored2) {
              tx.executeSql('INSERT INTO test_table (data1, data2) VALUES (?,?)', ['first', 'second', 123.456], function(tx, rs1) {
                // ACTUAL for plugin - iOS ONLY:
                if (isWebSql) expect('RESULT NOT EXPECTED for Web SQL').toBe('--');
                if (!isWebSql && (isAndroid || isWindows || isWP8)) expect('Plugin behavior changed: BROKEN for Android/Windows version').toBe('--');
                expect(rs1).toBeDefined();
                expect(rs1.rowsAffected).toBe(1);

                tx.executeSql('SELECT * FROM test_table', [], function(tx, rs2) {
                  expect(rs2.rows.length).toBe(1);
                  expect(rs2.rows.item(0).data1).toBe('first');
                  expect(rs2.rows.item(0).data2).toBe('second');
                  // Close (plugin only) & finish:
                  (isWebSql) ? done() : db.close(done, done);
                });

              }, function(ignored, error) {
                //sqlerror = error;

                // CORRECT (Web SQL; Android/Windows/WP8 plugin):
                if (!isWebSql && !isAndroid && !isWindows && !isWP8) expect('Plugin behavior changed [FIXED for iOS] please update this test').toBe('--');

                expect(error).toBeDefined();
                expect(error.code).toBeDefined();
                expect(error.message).toBeDefined();

                // WebKit Web SQL reports correct error code: 5 (SYNTAX_ERR) in this case.
                // Plugin reports INCORRECT error code: 0 (UNKNOWN_ERR)
                // ref: https://www.w3.org/TR/webdatabase/#dom-sqlexception-code-syntax
                if (isWebSql)
                  expect(error.code).toBe(5);
                else
                  expect(error.code).toBe(0);

                // WebKit Web SQL error message (Android/iOS):
                if (isWebSql)
                  expect(error.message).toMatch(/number of '\?'s in statement string does not match argument count/);

                // FUTURE TBD: plugin error message may be changed (??)
                if (!isWebSql)
                  expect(error.message).toMatch(/index.*out of range/);

                // Close (plugin only), return false, and finish:
                return isWebSql ? (done() || false) :
                  (db.close(done, done) || false);
              });
            });
          }, function(error) {
            // NOT EXPECTED:
            expect(false).toBe(true);
            expect(error.message).toBe('---');
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);
          });
        }, MYTIMEOUT);

        it(suiteName + 'executeSql with too many parameters: extra INTEGER value [iOS PLUGIN BROKEN with possible parameter data loss]', function(done) {
          var db = openDatabase("too-many-parameters.db", "1.0", "Demo", DEFAULT_SIZE);

          db.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS test_table');
            // CREATE columns with no type affinity
            tx.executeSql('CREATE TABLE IF NOT EXISTS test_table (data1, data2)', [], function(ignored1, ignored2) {
              tx.executeSql('INSERT INTO test_table (data1, data2) VALUES (?,?)', ['first', 'second', 123456], function(tx, rs1) {
                // ACTUAL for plugin - iOS ONLY:
                if (isWebSql) expect('RESULT NOT EXPECTED for Web SQL').toBe('--');
                if (!isWebSql && (isAndroid || isWindows || isWP8)) expect('Plugin behavior changed: BROKEN for Android/Windows version').toBe('--');
                expect(rs1).toBeDefined();
                expect(rs1.rowsAffected).toBe(1);

                tx.executeSql('SELECT * FROM test_table', [], function(tx, rs2) {
                  expect(rs2.rows.length).toBe(1);
                  expect(rs2.rows.item(0).data1).toBe('first');
                  expect(rs2.rows.item(0).data2).toBe('second');
                  // Close (plugin only) & finish:
                  (isWebSql) ? done() : db.close(done, done);
                });

              }, function(ignored, error) {
                // CORRECT (Web SQL; Android/Windows/WP8 plugin):
                if (!isWebSql && !isAndroid && !isWindows && !isWP8) expect('Plugin behavior changed [FIXED for iOS] please update this test').toBe('--');

                expect(error).toBeDefined();
                expect(error.code).toBeDefined();
                expect(error.message).toBeDefined();

                // WebKit Web SQL reports correct error code: 5 (SYNTAX_ERR) in this case.
                // Plugin reports INCORRECT error code: 0 (UNKNOWN_ERR)
                // ref: https://www.w3.org/TR/webdatabase/#dom-sqlexception-code-syntax
                if (isWebSql)
                  expect(error.code).toBe(5);
                else
                  expect(error.code).toBe(0);

                // WebKit Web SQL error message (Android/iOS):
                if (isWebSql)
                  expect(error.message).toMatch(/number of '\?'s in statement string does not match argument count/);

                // FUTURE TBD: plugin error message may be changed (??)
                if (!isWebSql)
                  expect(error.message).toMatch(/index.*out of range/);

                // Close (plugin only), return false, and finish:
                return isWebSql ? (done() || false) :
                  (db.close(done, done) || false);
              });
            });
          }, function(error) {
            // NOT EXPECTED:
            expect(false).toBe(true);
            expect(error.message).toBe('---');
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);
          });
        }, MYTIMEOUT);

        it(suiteName + 'executeSql with too many parameters: extra null value [iOS plugin BROKEN]', function(done) {
          var db = openDatabase("too-many-parameters.db", "1.0", "Demo", DEFAULT_SIZE);

          db.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS test_table');
            // CREATE columns with no type affinity
            tx.executeSql('CREATE TABLE IF NOT EXISTS test_table (data1, data2)', [], function(ignored1, ignored2) {
              tx.executeSql('INSERT INTO test_table (data1, data2) VALUES (?,?)', ['first', 'second', null], function(tx, rs1) {
                // ACTUAL for plugin - iOS ONLY:
                if (isWebSql) expect('RESULT NOT EXPECTED for Web SQL').toBe('--');
                if (!isWebSql && (isAndroid || isWindows || isWP8)) expect('Plugin behavior changed: BROKEN for Android/Windows version').toBe('--');
                expect(rs1).toBeDefined();
                expect(rs1.rowsAffected).toBe(1);

                tx.executeSql('SELECT * FROM test_table', [], function(tx, rs2) {
                  expect(rs2.rows.length).toBe(1);
                  expect(rs2.rows.item(0).data1).toBe('first');
                  expect(rs2.rows.item(0).data2).toBe('second');
                  // Close (plugin only) & finish:
                  (isWebSql) ? done() : db.close(done, done);
                });

              }, function(ignored, error) {
                // CORRECT (Web SQL; Android/Windows/WP8 plugin):
                if (!isWebSql && !isAndroid && !isWindows && !isWP8) expect('Plugin behavior changed [FIXED for iOS] please update this test').toBe('--');

                expect(error).toBeDefined();
                expect(error.code).toBeDefined();
                expect(error.message).toBeDefined();

                // WebKit Web SQL reports correct error code: 5 (SYNTAX_ERR) in this case.
                // Plugin reports INCORRECT error code: 0 (UNKNOWN_ERR)
                // ref: https://www.w3.org/TR/webdatabase/#dom-sqlexception-code-syntax
                if (isWebSql)
                  expect(error.code).toBe(5);
                else
                  expect(error.code).toBe(0);

                // WebKit Web SQL error message (Android/iOS):
                if (isWebSql)
                  expect(error.message).toMatch(/number of '\?'s in statement string does not match argument count/);

                // FUTURE TBD: plugin error message may be changed (??)
                if (!isWebSql)
                  expect(error.message).toMatch(/index.*out of range/);

                // Close (plugin only), return false, and finish:
                return isWebSql ? (done() || false) :
                  (db.close(done, done) || false);
              });
            });
          }, function(error) {
            // NOT EXPECTED:
            expect(false).toBe(true);
            expect(error.message).toBe('---');
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);
          });
        }, MYTIMEOUT);

      });

      describe(suiteName + 'other error code/message mapping test(s)', function() {

        //* ** XXX TBD MOVED (??)
        it(suiteName + 'executeSql with SELECT statement list - NOT ALLOWED [PLUGIN BROKEN]', function(done) {
          // TO FIX ref: https://www.sqlite.org/c3ref/prepare.html
          // When calling sqlite3_prepare_v2 check the OUT pzTail pointer
          // to ensure there is no other statement afterwards.
          // May take some more work for Android & Windows versions.

          var db = openDatabase('tx-sql-with-select-statement-list.db');

          db.transaction(function(tx) {
            tx.executeSql('SELECT 1; SELECT 2', [], function(ignored, rs) {
              // INCORRECT (PLUGIN BROKEN)
              if (isWebSql)
                expect('WebKit Web SQL implementation changed (DEVIATION)').toBe('--');
              else
                expect(rs).toBeDefined();

              // EXTRA for INVESTIGATION: statement list with syntax error after the first statement
              tx.executeSql('SELECT 1; SLCT 2', [], function(ignored1, rs2) {
                expect(rs2).toBeDefined();
                isWebSql ? done() : db.close(done, done);
              }, function(ignored, error) {
                expect('Plugin behavior changed, please update this test').toBe('--');
                expect(error).toBeDefined();
                // TBD ...
                isWebSql ? done() : db.close(done, done);
              });
            }, function(ignored, error) {
              if (!isWebSql)
                expect('PLUGIN FIXED, please update this test').toBe('--');

              expect(error).toBeDefined();
              expect(error.code).toBeDefined();
              expect(error.message).toBeDefined();

              expect(error.code).toBe(5); // SYNTAX_ERR

              // WebKit Web SQL error message (apparenly with SQLite error code)
              if (isWebSql)
                expect(error.message).toMatch(/could not prepare statement.*1 not an error/);

              // Close (plugin only), return false, and finish:
              return isWebSql ? (done() || false) :
                (db.close(done, done) || false);
            })
          });
        }, MYTIMEOUT);
        // */

        it('transaction.executeSql syntax error with no SQL error handler [Windows/WP8 error code/messages BROKEN/INCONSISTENT]', function(done) {
          db = openDatabase('tx-sql-syntax-error-with-no-sql-error-handler-test.db');
          db.transaction(function(transaction) {
            transaction.executeSql('SLCT 1');
          }, function(error) {
            // EXPECTED RESULT:
            expect(error).toBeDefined();
            expect(error.code).toBeDefined();
            expect(error.message).toBeDefined();

            // BROKEN on Windows/WP8:
            if (!isWindows && !isWP8)
              expect(error.code).toBe(5);
            else
              expect(error.code).toBe(0);

            if (!isWebSql)
              expect(error.message).toMatch(/a statement with no error handler failed/);

            // BROKEN (INCONSISTENT) on Windows/WP8:
            if (!isWebSql && !isWindows && !isWP8)
              expect(error.message).toMatch(/a statement with no error handler failed.*near \"SLCT\": syntax error/);

            // BROKEN (INCONSISTENT) on Windows/WP8:
            if (isWindows || isWP8)
              expect(error.message).toMatch(/--/);

            // From built-in Android database exception message:
            if (!isWebSql && isAndroid && isImpl2)
              expect(error.message).toMatch(/near \"SLCT\": syntax error.*code 1/);

            // ACTUAL WebKit Web SQL error.message (Android/iOS)
            // (SQLite error code is apparently part of Web SQL error.message)
            if (isWebSql)
              expect(error.message).toMatch(/could not prepare statement.*1 near \"SLCT\": syntax error/);

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
