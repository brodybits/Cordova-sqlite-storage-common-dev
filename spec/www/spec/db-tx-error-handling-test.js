/* 'use strict'; */

var MYTIMEOUT = 20000;

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

    describe(scenarioList[i] + ': db tx detailed error handling test(s)', function() {
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
          return window.openDatabase(name, '1.0', 'Test', DEFAULT_SIZE);
        } else {
          return window.sqlitePlugin.openDatabase({name: name, location: 0});
        }
      }

      describe(scenarioList[i] + ': tx error handler test(s)', function() {

        it(suiteName + 'SKIP SQL CALLBACKS after syntax error with no handler', function(done) {
          var db = openDatabase('first-syntax-error-with-no-handler.db', '1.0', 'Test', DEFAULT_SIZE);
          expect(db).toBeDefined();

          db.transaction(function(tx) {
            expect(tx).toBeDefined();
            tx.executeSql('DROP TABLE IF EXISTS tt');
            tx.executeSql('CREATE TABLE IF NOT EXISTS tt (data unique)');

            // This insertion has a SQL syntax error which is not handled:
            tx.executeSql('INSERT INTO tt (data) VALUES ', [123]);

            // SECOND SQL - SKIPPED by Web SQL and this plugin:
            tx.executeSql('SELECT 1', [], function(tx, res) {
              // NOT EXPECTED:
              expect(false).toBe(true);
            }, function(err) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              expect(error.message).toBe('--');
              // TRY to RECOVER:
              return false;
            });

          }, function(err) {
            // EXPECTED RESULT:
            expect(true).toBe(true);
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);

          }, function() {
            // NOT EXPECTED:
            expect(false).toBe(true);
            expect(error.message).toBe('--');
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);
          });
        }, MYTIMEOUT);

        it(suiteName + 'SKIP SQL CALLBACKS after syntax error handler returns true', function(done) {
          var db = openDatabase('first-syntax-error-handler-returns-true.db', '1.0', 'Test', DEFAULT_SIZE);
          expect(db).toBeDefined();

          var isFirstErrorHandlerCalled = false; // poor man's spy

          db.transaction(function(tx) {
            expect(tx).toBeDefined();
            tx.executeSql('DROP TABLE IF EXISTS tt');
            tx.executeSql('CREATE TABLE IF NOT EXISTS tt (data unique)');

            // FIRST SQL syntax error with handler that returns true (should completely stop transaction):
            tx.executeSql('INSERT INTO tt (data) VALUES ', [456], function(tx, res) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              expect(error.message).toBe('--');
            }, function(error) {
              // EXPECTED RESULT:
              expect(error).toBeDefined();
              isFirstErrorHandlerCalled = true;
              // [SHOULD] completely stop transaction:
              return true;
            });

            // SECOND SQL - SKIPPED by Web SQL and this plugin:
            tx.executeSql('SELECT 1', [], function(tx, res) {
              // NOT EXPECTED:
              expect(false).toBe(true);
            }, function(error) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              // EXPLICIT RECOVERY:
              return false;
            });

          }, function(error) {
            // EXPECTED RESULT:
            expect(error).toBeDefined();
            expect(isFirstErrorHandlerCalled).toBe(true);
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);

          }, function() {
            // NOT EXPECTED:
            expect(false).toBe(true);
            expect(isFirstErrorHandlerCalled).toBe(true);
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);
          });
        }, MYTIMEOUT);

        // Try with an error handler that returns some other "truthy" values
        // ref: https://developer.mozilla.org/en-US/docs/Glossary/Truthy

        it(suiteName + 'SKIP SQL CALLBACKS after syntax error handler returns 1', function(done) {
          var db = openDatabase('first-syntax-error-handler-returns-1.db', '1.0', 'Test', DEFAULT_SIZE);
          expect(db).toBeDefined();

          var isFirstErrorHandlerCalled = false; // poor man's spy

          db.transaction(function(tx) {
            expect(tx).toBeDefined();
            tx.executeSql('DROP TABLE IF EXISTS tt');
            tx.executeSql('CREATE TABLE IF NOT EXISTS tt (data unique)');

            // FIRST SQL syntax error with handler that returns true (should completely stop transaction):
            tx.executeSql('INSERT INTO tt (data) VALUES ', [456], function(tx, res) {
              // NOT EXPECTED:
              expect(false).toBe(true);
            }, function(error) {
              // EXPECTED RESULT:
              expect(error).toBeDefined();
              isFirstErrorHandlerCalled = true;
              // [SHOULD] completely stop transaction:
              return 1;
            });

            // SECOND SQL - SKIPPED by Web SQL and this plugin:
            tx.executeSql('SELECT 1', [], function(tx, res) {
              // NOT EXPECTED:
              expect(false).toBe(true);
            }, function(error) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              // EXPLICIT RECOVERY:
              return false;
            });

          }, function(error) {
            // EXPECTED RESULT:
            expect(error).toBeDefined();
            expect(isFirstErrorHandlerCalled).toBe(true);
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);

          }, function() {
            // NOT EXPECTED:
            expect(false).toBe(true);
            expect(isFirstErrorHandlerCalled).toBe(true);
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);
          });
        }, MYTIMEOUT);

        it(suiteName + 'SKIP SQL CALLBACKS after syntax error handler returns -1', function(done) {
          var db = openDatabase('first-syntax-error-handler-returns-minus-1.db', '1.0', 'Test', DEFAULT_SIZE);
          expect(db).toBeDefined();

          var isFirstErrorHandlerCalled = false; // poor man's spy

          db.transaction(function(tx) {
            expect(tx).toBeDefined();
            tx.executeSql('DROP TABLE IF EXISTS tt');
            tx.executeSql('CREATE TABLE IF NOT EXISTS tt (data unique)');

            // FIRST SQL syntax error with handler that returns true (should completely stop transaction):
            tx.executeSql('INSERT INTO tt (data) VALUES ', [456], function(tx, res) {
              // NOT EXPECTED:
              expect(false).toBe(true);
            }, function(error) {
              // EXPECTED RESULT:
              expect(error).toBeDefined();
              isFirstErrorHandlerCalled = true;
              // [SHOULD] completely stop transaction:
              return -1;
            });

            // SECOND SQL - SKIPPED by Web SQL and this plugin:
            tx.executeSql('SELECT 1', [], function(tx, res) {
              // NOT EXPECTED:
              expect(false).toBe(true);
            }, function(err) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              // EXPLICIT RECOVERY:
              return false;
            });

          }, function(error) {
            // EXPECTED RESULT:
            expect(error).toBeDefined();
            expect(isFirstErrorHandlerCalled).toBe(true);
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);

          }, function() {
            // NOT EXPECTED:
            expect(false).toBe(true);
            expect(isFirstErrorHandlerCalled).toBe(true);
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);
          });
        }, MYTIMEOUT);

        it(suiteName + "SKIP SQL CALLBACKS after syntax error handler returns 'test-string'", function(done) {
          var db = openDatabase('first-syntax-error-handler-returns-test-string.db', '1.0', 'Test', DEFAULT_SIZE);
          expect(db).toBeDefined();

          var isFirstErrorHandlerCalled = false; // poor man's spy

          db.transaction(function(tx) {
            expect(tx).toBeDefined();
            tx.executeSql('DROP TABLE IF EXISTS tt');
            tx.executeSql('CREATE TABLE IF NOT EXISTS tt (data unique)');

            // FIRST SQL syntax error with handler that returns true (should completely stop transaction):
            tx.executeSql('INSERT INTO tt (data) VALUES ', [456], function(tx, res) {
              // NOT EXPECTED:
              expect(false).toBe(true);
            }, function(error) {
              // EXPECTED RESULT:
              expect(error).toBeDefined();
              isFirstErrorHandlerCalled = true;
              // [SHOULD] completely stop transaction:
              return 'test-string';
            });

            // SECOND SQL - SKIPPED by Web SQL and this plugin:
            tx.executeSql('SELECT 1', [], function(tx, res) {
              // NOT EXPECTED:
              expect(false).toBe(true);
            }, function(error) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              // EXPLICIT RECOVERY:
              return false;
            });

          }, function(error) {
            // EXPECTED RESULT:
            expect(error).toBeDefined();
            expect(isFirstErrorHandlerCalled).toBe(true);
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);

          }, function() {
            // NOT EXPECTED:
            expect(false).toBe(true);
            expect(isFirstErrorHandlerCalled).toBe(true);
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);
          });
        }, MYTIMEOUT);

        it(suiteName + 'SKIP SQL CALLBACKS after syntax error handler returns empty object ({})', function(done) {
          var db = openDatabase('first-syntax-error-handler-returns-empty-object.db', '1.0', 'Test', DEFAULT_SIZE);
          expect(db).toBeDefined();

          var isFirstErrorHandlerCalled = false; // poor man's spy

          db.transaction(function(tx) {
            expect(tx).toBeDefined();
            tx.executeSql('DROP TABLE IF EXISTS tt');
            tx.executeSql('CREATE TABLE IF NOT EXISTS tt (data unique)');

            // FIRST SQL syntax error with handler that returns true (should completely stop transaction):
            tx.executeSql('insert into tt (data) VALUES ', [456], function(tx, res) {
              // NOT EXPECTED:
              expect(false).toBe(true);
            }, function(error) {
              // EXPECTED RESULT:
              expect(error).toBeDefined();
              isFirstErrorHandlerCalled = true;
              // [SHOULD] completely stop transaction:
              return {};
            });

            // SECOND SQL - SKIPPED by Web SQL and this plugin:
            tx.executeSql('SELECT 1', [], function(tx, res) {
              // NOT EXPECTED:
              expect(false).toBe(true);
            }, function(err) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              // EXPLICIT RECOVERY:
              return false;
            });

          }, function(error) {
            // EXPECTED RESULT:
            expect(error).toBeDefined();
            expect(isFirstErrorHandlerCalled).toBe(true);
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);

          }, function() {
            // NOT EXPECTED:
            expect(false).toBe(true);
            expect(isFirstErrorHandlerCalled).toBe(true);
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);
          });
        }, MYTIMEOUT);

        it(suiteName + 'SKIP SQL CALLBACKS after syntax error handler returns empty array ([])', function(done) {
          var db = openDatabase('first-syntax-error-handler-returns-object.db', '1.0', 'Test', DEFAULT_SIZE);
          expect(db).toBeDefined();

          var isFirstErrorHandlerCalled = false; // poor man's spy

          db.transaction(function(tx) {
            expect(tx).toBeDefined();
            tx.executeSql('DROP TABLE IF EXISTS tt');
            tx.executeSql('CREATE TABLE IF NOT EXISTS tt (data unique)');

            // FIRST SQL syntax error with handler that returns true (should completely stop transaction):
            tx.executeSql('insert into tt (data) VALUES ', [456], function(tx, res) {
              // NOT EXPECTED:
              expect(false).toBe(true);
            }, function(error) {
              // EXPECTED RESULT:
              expect(error).toBeDefined();
              isFirstErrorHandlerCalled = true;
              // [SHOULD] completely stop transaction:
              return [];
            });

            // SECOND SQL - SKIPPED by Web SQL and this plugin:
            tx.executeSql('SELECT 1', [], function(tx, res) {
              // NOT EXPECTED:
              expect(false).toBe(true);
            }, function(err) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              // EXPLICIT RECOVERY:
              return false;
            });

          }, function(error) {
            // EXPECTED RESULT:
            expect(error).toBeDefined();
            expect(isFirstErrorHandlerCalled).toBe(true);
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);

          }, function() {
            // NOT EXPECTED:
            expect(false).toBe(true);
            expect(isFirstErrorHandlerCalled).toBe(true);
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);
          });
        }, MYTIMEOUT);

        // ref: litehelpers/Cordova-sqlite-storage#232
        // according to the spec at http://www.w3.org/TR/webdatabase/ the transaction should be
        // recovered *only* if the sql error handler returns false.
        it(suiteName + 'Recover transaction with callbacks after syntax error handler returns false', function(done) {
          var db = openDatabase('recover-if-syntax-error-handler-returns-false.db', '1.0', 'Test', DEFAULT_SIZE);
          expect(db).toBeDefined();

          var isFirstErrorHandlerCalled = false; // poor man's spy
          var isSecondSuccessHandlerCalled = false; // expected ok

          db.transaction(function(tx) {
            expect(tx).toBeDefined();
            tx.executeSql('DROP TABLE IF EXISTS tt');
            tx.executeSql('CREATE TABLE IF NOT EXISTS tt (data unique)');

            // FIRST SQL syntax error with handler that returns false:
            tx.executeSql('insert into tt (data) VALUES ', [456], function(tx, res) {
              // NOT EXPECTED:
              expect(false).toBe(true);
            }, function(error) {
              // EXPECTED RESULT:
              expect(error).toBeDefined();
              isFirstErrorHandlerCalled = true;
              // [should] recover this transaction:
              return false;
            });

            // SECOND SQL OK [NOT SKIPPED by Web SQL or plugin]:
            tx.executeSql('SELECT 1', [], function(tx, res) {
              // EXPECTED RESULT:
              isSecondSuccessHandlerCalled = true;
              expect(true).toBe(true);
            }, function(err) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              //isSecondErrorHandlerCalled = true;
              return false;
            });

          }, function(error) {
            // EXPECTED RESULT:
            expect(error).toBeDefined();
            expect(isFirstErrorHandlerCalled).toBe(true);
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);

          }, function() {
            // EXPECTED RESULT:
            expect(true).toBe(true);
            expect(isFirstErrorHandlerCalled).toBe(true);
            expect(isSecondSuccessHandlerCalled).toBe(true);
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);
          });
        }, MYTIMEOUT);

        // In case an error handler with no return statement or
        // that returns some other falsey values
        // ref: https://developer.mozilla.org/en-US/docs/Glossary/Falsy
        // As discussed in litehelpers/Cordova-sqlite-storage#232 this plugin
        // handles these "falsey" values according to the spec.
        // For example: if a programmer forgets to add an explicit return
        // statement to the error handler the transaction should NOT recover.
        // For reference: https://www.w3.org/TR/webdatabase/#processing-model
        // (Section 4.3.2 Processing model)
        // Specifically: substeps 2-3 in case of error in step 6

        it(suiteName + 'syntax error handler with no return statement [returns undefined]' +
           isWebSql ? ' (DEVIATION in WebKit Web SQL implementation)' : ' (Plugin COMPLIANT)', function(done) {
          var dbname = 'syntax-error-handler-with-no-return-statement.db';

          var db = openDatabase(dbname, '1.0', 'Test', DEFAULT_SIZE);
          expect(db).toBeDefined();

          var isFirstErrorHandlerCalled = false; // poor man's spy
          var isSecondSuccessHandlerCalled = false; // expected ok

          db.transaction(function(tx) {
            expect(tx).toBeDefined();
            tx.executeSql('DROP TABLE IF EXISTS tt');
            tx.executeSql('CREATE TABLE IF NOT EXISTS tt (data unique)');

            // FIRST SQL syntax error with handler with no return statement [returns undefined]:
            tx.executeSql('INSERT INTO tt (data) VALUES ', [456], function(tx, res) {
              // NOT EXPECTED:
              expect(false).toBe(true);
            }, function(error) {
              // EXPECTED RESULT:
              expect(error).toBeDefined();
              isFirstErrorHandlerCalled = true;
              // no return statement:
              // Should NOT recover this transaction according to Web SQL spec:
            });

            // SECOND SQL - Web SQL ONLY [DEVIATION]:
            tx.executeSql('SELECT 1', [], function(tx, res) {
              // EXPECTED RESULT: OK for WebKit Web SQL implementation ONLY:
              if (isWebSql)
                expect(true).toBe(true);
              else
                expect(false).toBe(true);
              isSecondSuccessHandlerCalled = true;
              expect(true).toBe(true);
            }, function(err) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              //isSecondErrorHandlerCalled = true;
              return false;
            });

          }, function(error) {
            // EXPECTED RESULT: TRANSACTION FAILURE [Plugin ONLY]
            expect(error).toBeDefined();
            expect(true).toBe(true);
            if (isWebSql)
              expect('WebKit Web SQL behavior changed, please update this test').toBe('--');
            expect(isFirstErrorHandlerCalled).toBe(true);
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);

          }, function() {
            // EXPECTED RESULT: OK for WebKit Web SQL implementation ONLY:
            if (isWebSql)
              expect(true).toBe(true);
            else
              expect(false).toBe(true);
            expect(isFirstErrorHandlerCalled).toBe(true);
            if (isWebSql && !isSecondSuccessHandlerCalled)
              expect('Web SQL behavior changed, please update this test').toBe('--');
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);
          });
        }, MYTIMEOUT);

        it(suiteName + 'syntax error handler returns undefined' +
           isWebSql ? ' (DEVIATION in WebKit Web SQL implementation)' : ' (Plugin COMPLIANT)', function(done) {
          var dbname = 'syntax-error-handler-returns-undefined.db';

          var db = openDatabase(dbname, '1.0', 'Test', DEFAULT_SIZE);
          expect(db).toBeDefined();

          var isFirstErrorHandlerCalled = false; // poor man's spy
          var isSecondSuccessHandlerCalled = false; // expected ok

          db.transaction(function(tx) {
            expect(tx).toBeDefined();
            tx.executeSql('DROP TABLE IF EXISTS tt');
            tx.executeSql('CREATE TABLE IF NOT EXISTS tt (data unique)');

            // FIRST SQL syntax error with handler that returns undefined [nothing]:
            tx.executeSql('INSERT INTO tt (data) VALUES ', [456], function(tx, res) {
              // NOT EXPECTED:
              expect(false).toBe(true);
            }, function(error) {
              // EXPECTED RESULT:
              expect(error).toBeDefined();
              isFirstErrorHandlerCalled = true;
              // Should NOT recover this transaction according to Web SQL spec:
              return undefined;
            });

            // SECOND SQL - Web SQL ONLY [DEVIATION]:
            tx.executeSql('SELECT 1', [], function(tx, res) {
              // EXPECTED RESULT: OK for WebKit Web SQL implementation ONLY:
              if (isWebSql)
                expect(true).toBe(true);
              else
                expect(false).toBe(true);
              isSecondSuccessHandlerCalled = true;
              expect(true).toBe(true);
            }, function(err) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              //isSecondErrorHandlerCalled = true;
              return false;
            });

          }, function(error) {
            // EXPECTED RESULT: TRANSACTION FAILURE [Plugin ONLY]
            expect(error).toBeDefined();
            if (isWebSql)
              expect('WebKit Web SQL behavior changed, please update this test').toBe('--');
            expect(isFirstErrorHandlerCalled).toBe(true);
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);

          }, function() {
            // EXPECTED RESULT: OK for WebKit Web SQL implementation ONLY:
            if (isWebSql)
              expect(true).toBe(true);
            else
              expect(false).toBe(true);
            expect(isFirstErrorHandlerCalled).toBe(true);
            if (isWebSql && !isSecondSuccessHandlerCalled)
              expect('Web SQL behavior changed, please update this test').toBe('--');
            // Close (plugin only) & finish:
            isWebSql ? done() : db.close(done, done);
          });
        }, MYTIMEOUT);

        it(suiteName + 'syntax error handler returns null' +
           isWebSql ? ' (DEVIATION in WebKit Web SQL implementation)' : ' (Plugin COMPLIANT)', function(done) {
          var dbname = 'syntax-error-handler-returns-null.db';

          var db = openDatabase(dbname, '1.0', 'Test', DEFAULT_SIZE);
          expect(db).toBeDefined();

          var isFirstErrorHandlerCalled = false; // poor man's spy
          var isSecondSuccessHandlerCalled = false; // expected ok

          db.transaction(function(tx) {
            expect(tx).toBeDefined();
            tx.executeSql('DROP TABLE IF EXISTS tt');
            tx.executeSql('CREATE TABLE IF NOT EXISTS tt (data unique)');

            // FIRST SQL syntax error with handler that returns null:
            tx.executeSql('INSERT INTO tt (data) VALUES ', [456], function(tx, res) {
              // NOT EXPECTED:
              expect(false).toBe(true);
            }, function(error) {
              // EXPECTED RESULT:
              expect(error).toBeDefined();
              isFirstErrorHandlerCalled = true;
              // Should NOT recover this transaction according to Web SQL spec:
              return null;
            });

            // SECOND SQL - Web SQL ONLY [DEVIATION]:
            tx.executeSql('SELECT 1', [], function(tx, res) {
              // EXPECTED RESULT: OK for WebKit Web SQL implementation ONLY:
              if (isWebSql)
                expect(true).toBe(true);
              else
                expect(false).toBe(true);
              isSecondSuccessHandlerCalled = true;
              expect(true).toBe(true);
            }, function(err) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              //isSecondErrorHandlerCalled = true;
              return false;
            });

          }, function(error) {
            // EXPECTED RESULT: TRANSACTION FAILURE [Plugin ONLY]
            expect(error).toBeDefined();
            if (isWebSql)
              expect('WebKit Web SQL behavior changed, please update this test').toBe('--');
            expect(isFirstErrorHandlerCalled).toBe(true);
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);

          }, function() {
            // EXPECTED RESULT: OK for WebKit Web SQL implementation ONLY:
            if (isWebSql)
              expect(true).toBe(true);
            else
              expect(false).toBe(true);
            expect(isFirstErrorHandlerCalled).toBe(true);
            if (isWebSql && !isSecondSuccessHandlerCalled)
              expect('Web SQL behavior changed, please update this test').toBe('--');
            // Close (plugin only) & finish:
            isWebSql ? done() : db.close(done, done);
          });
        }, MYTIMEOUT);

        it(suiteName + 'syntax error handler returns 0' +
           isWebSql ? ' (DEVIATION in WebKit Web SQL implementation)' : ' (Plugin COMPLIANT)', function(done) {
          var dbname = 'syntax-error-handler-returns-0.db';

          var db = openDatabase(dbname, '1.0', 'Test', DEFAULT_SIZE);
          expect(db).toBeDefined();

          var isFirstErrorHandlerCalled = false; // poor man's spy
          var isSecondSuccessHandlerCalled = false; // expected ok

          db.transaction(function(tx) {
            expect(tx).toBeDefined();
            tx.executeSql('DROP TABLE IF EXISTS tt');
            tx.executeSql('CREATE TABLE IF NOT EXISTS tt (data unique)');

            // FIRST SQL syntax error with handler that returns 0:
            tx.executeSql('INSERT INTO tt (data) VALUES ', [456], function(tx, res) {
              // NOT EXPECTED:
              expect(false).toBe(true);
            }, function(error) {
              // EXPECTED RESULT:
              expect(error).toBeDefined();
              isFirstErrorHandlerCalled = true;
              // Should NOT recover this transaction according to Web SQL spec:
              return 0;
            });

            // SECOND SQL - Web SQL ONLY [DEVIATION]:
            tx.executeSql('SELECT 1', [], function(tx, res) {
              // EXPECTED RESULT: OK for WebKit Web SQL implementation ONLY:
              if (isWebSql)
                expect(true).toBe(true);
              else
                expect(false).toBe(true);
              isSecondSuccessHandlerCalled = true;
              expect(true).toBe(true);
            }, function(err) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              //isSecondErrorHandlerCalled = true;
              return false;
            });

          }, function(error) {
            // EXPECTED RESULT: TRANSACTION FAILURE [Plugin ONLY]
            expect(error).toBeDefined();
            if (isWebSql)
              expect('WebKit Web SQL behavior changed, please update this test').toBe('--');
            expect(isFirstErrorHandlerCalled).toBe(true);
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);

          }, function() {
            // EXPECTED RESULT: OK for WebKit Web SQL implementation ONLY:
            if (isWebSql)
              expect(true).toBe(true);
            else
              expect(false).toBe(true);
            expect(isFirstErrorHandlerCalled).toBe(true);
            if (isWebSql && !isSecondSuccessHandlerCalled)
              expect('Web SQL behavior changed, please update this test').toBe('--');
            // Close (plugin only) & finish:
            isWebSql ? done() : db.close(done, done);
          });
        }, MYTIMEOUT);

        it(suiteName + 'syntax error handler returns NaN' +
           isWebSql ? ' (DEVIATION in WebKit Web SQL implementation)' : ' (Plugin COMPLIANT)', function(done) {
          var dbname = 'syntax-error-handler-returns-NaN.db';

          var db = openDatabase(dbname, '1.0', 'Test', DEFAULT_SIZE);
          expect(db).toBeDefined();

          var isFirstErrorHandlerCalled = false; // poor man's spy
          var isSecondSuccessHandlerCalled = false; // expected ok

          db.transaction(function(tx) {
            expect(tx).toBeDefined();
            tx.executeSql('DROP TABLE IF EXISTS tt');
            tx.executeSql('CREATE TABLE IF NOT EXISTS tt (data unique)');

            // FIRST SQL syntax error with handler that returns NaN:
            tx.executeSql('INSERT INTO tt (data) VALUES ', [456], function(tx, res) {
              // NOT EXPECTED:
              expect(false).toBe(true);
            }, function(error) {
              // EXPECTED RESULT:
              expect(error).toBeDefined();
              isFirstErrorHandlerCalled = true;
              // Should NOT recover this transaction according to Web SQL spec:
              return NaN;
            });

            // SECOND SQL - Web SQL ONLY [DEVIATION]:
            tx.executeSql('SELECT 1', [], function(tx, res) {
              // EXPECTED RESULT: OK for WebKit Web SQL implementation ONLY:
              if (isWebSql)
                expect(true).toBe(true);
              else
                expect(false).toBe(true);
              isSecondSuccessHandlerCalled = true;
              expect(true).toBe(true);
            }, function(err) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              //isSecondErrorHandlerCalled = true;
              return false;
            });

          }, function(error) {
            // EXPECTED RESULT: TRANSACTION FAILURE [Plugin ONLY]
            expect(error).toBeDefined();
            if (isWebSql)
              expect('WebKit Web SQL behavior changed, please update this test').toBe('--');
            expect(isFirstErrorHandlerCalled).toBe(true);
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);

          }, function() {
            // EXPECTED RESULT: OK for WebKit Web SQL implementation ONLY:
            if (isWebSql)
              expect(true).toBe(true);
            else
              expect(false).toBe(true);
            expect(isFirstErrorHandlerCalled).toBe(true);
            if (isWebSql && !isSecondSuccessHandlerCalled)
              expect('Web SQL behavior changed, please update this test').toBe('--');
            // Close (plugin only) & finish:
            isWebSql ? done() : db.close(done, done);
          });
        }, MYTIMEOUT);

        it(suiteName + "syntax error handler returns ''" +
           isWebSql ? ' (DEVIATION in WebKit Web SQL implementation)' : ' (Plugin COMPLIANT)', function(done) {
          var dbname = 'syntax-error-handler-returns-empty-string-1.db';

          var db = openDatabase(dbname, '1.0', 'Test', DEFAULT_SIZE);
          expect(db).toBeDefined();

          var isFirstErrorHandlerCalled = false; // poor man's spy
          var isSecondSuccessHandlerCalled = false; // expected ok

          db.transaction(function(tx) {
            expect(tx).toBeDefined();
            tx.executeSql('DROP TABLE IF EXISTS tt');
            tx.executeSql('CREATE TABLE IF NOT EXISTS tt (data unique)');

            // FIRST SQL syntax error with handler that returns '':
            tx.executeSql('INSERT INTO tt (data) VALUES ', [456], function(tx, res) {
              // NOT EXPECTED:
              expect(false).toBe(true);
            }, function(error) {
              // EXPECTED RESULT:
              expect(error).toBeDefined();
              isFirstErrorHandlerCalled = true;
              // Should NOT recover this transaction according to Web SQL spec:
              return '';
            });

            // SECOND SQL - Web SQL ONLY [DEVIATION]:
            tx.executeSql('SELECT 1', [], function(tx, res) {
              // EXPECTED RESULT: OK for WebKit Web SQL implementation ONLY:
              if (isWebSql)
                expect(true).toBe(true);
              else
                expect(false).toBe(true);
              isSecondSuccessHandlerCalled = true;
              expect(true).toBe(true);
            }, function(err) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              //isSecondErrorHandlerCalled = true;
              return false;
            });

          }, function(error) {
            // EXPECTED RESULT: TRANSACTION FAILURE [Plugin ONLY]
            expect(error).toBeDefined();
            if (isWebSql)
              expect('WebKit Web SQL behavior changed, please update this test').toBe('--');
            expect(isFirstErrorHandlerCalled).toBe(true);
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);

          }, function() {
            // EXPECTED RESULT: OK for WebKit Web SQL implementation ONLY:
            if (isWebSql)
              expect(true).toBe(true);
            else
              expect(false).toBe(true);
            expect(isFirstErrorHandlerCalled).toBe(true);
            if (isWebSql && !isSecondSuccessHandlerCalled)
              expect('WebKit Web SQL behavior changed, please update this test').toBe('--');
            // Close (plugin only) & finish:
            isWebSql ? done() : db.close(done, done);
          });
        }, MYTIMEOUT);

        it(suiteName + 'syntax error handler returns ""' +
           isWebSql ? ' (DEVIATION in WebKit Web SQL implementation)' : ' (Plugin COMPLIANT)', function(done) {
          var dbname = 'syntax-error-handler-returns-empty-string-2.db';

          var db = openDatabase(dbname, '1.0', 'Test', DEFAULT_SIZE);
          expect(db).toBeDefined();

          var isFirstErrorHandlerCalled = false; // poor man's spy
          var isSecondSuccessHandlerCalled = false; // expected ok

          db.transaction(function(tx) {
            expect(tx).toBeDefined();
            tx.executeSql('DROP TABLE IF EXISTS tt');
            tx.executeSql('CREATE TABLE IF NOT EXISTS tt (data unique)');

            // FIRST SQL syntax error with handler that returns "":
            tx.executeSql('insert into tt (data) VALUES ', [456], function(tx, res) {
              // NOT EXPECTED:
              expect(false).toBe(true);
            }, function(error) {
              // EXPECTED RESULT:
              expect(error).toBeDefined();
              isFirstErrorHandlerCalled = true;
              // Should NOT recover this transaction according to Web SQL spec:
              return "";
            });

            // SECOND SQL - Web SQL ONLY [DEVIATION]:
            tx.executeSql('SELECT 1', [], function(tx, res) {
              // EXPECTED RESULT: OK for WebKit Web SQL implementation ONLY:
              if (isWebSql)
                expect(true).toBe(true);
              else
                expect(false).toBe(true);
              isSecondSuccessHandlerCalled = true;
              expect(true).toBe(true);
            }, function(err) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              //isSecondErrorHandlerCalled = true;
              return false;
            });

          }, function(error) {
            // EXPECTED RESULT: TRANSACTION FAILURE [Plugin ONLY]
            expect(error).toBeDefined();
            if (isWebSql)
              expect('WebKit Web SQL behavior changed, please update this test').toBe('--');
            expect(isFirstErrorHandlerCalled).toBe(true);
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);

          }, function() {
            // EXPECTED RESULT: OK for WebKit Web SQL implementation ONLY:
            if (isWebSql)
              expect(true).toBe(true);
            else
              expect(false).toBe(true);
            expect(isFirstErrorHandlerCalled).toBe(true);
            if (isWebSql && !isSecondSuccessHandlerCalled)
              expect('WebKit Web SQL behavior changed, please update this test').toBe('--');
            // Close (plugin only) & finish:
            isWebSql ? done() : db.close(done, done);
          });
        }, MYTIMEOUT);

        it(suiteName + 'STOP nested transaction if syntax error handler returns true', function(done) {
          var db = openDatabase('stop-nested-tx-if-syntax-error-handler-returns-true.db', '1.0', 'Test', DEFAULT_SIZE);
          expect(db).toBeDefined();

          // poor man's spy:
          var isFirstSuccessHandlerCalled = false;
          var isFirstErrorHandlerCalled = false;
          var isFirstNestedErrorHandlerCalled = false;

          db.transaction(function(tx) {
            tx.executeSql('SELECT 1', [], function(tx, res) {
              // EXPECTED RESULT:
              expect(true).toBe(true);
              isFirstSuccessHandlerCalled = true;

              // NESTED:
              tx.executeSql('SELCT 1', [], function(tx, res) {
                // NOT EXPECTED:
                expect(false).toBe(true);
              }, function(err) {
                // NOT EXPECTED:
                expect(false).toBe(true);
                // TRY to RECOVER in NESTED:
                return true;
              });

            }, function(error) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              expect(error.message).toBe('--');
              return true;
            });

            // FIRST SQL syntax error with handler that returns true (STOP the transaction):
            tx.executeSql('SELCT 1', [], function(tx, res) {
              // NOT EXPECTED:
              expect(false).toBe(true);
            }, function(err) {
              // EXPECTED RESULT:
              expect(true).toBe(true);
              isFirstErrorHandlerCalled = true;
              // STOP the transaction:
              return true;
            });

            // SKIPPED by Web SQL and this plugin:
            tx.executeSql('SELECT 1', [], function(tx, res) {
              // NOT EXPECTED:
              expect(false).toBe(true);
            }, function(err) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              return true;
            });

          }, function(err) {
            // EXPECTED RESULT:
            expect(true).toBe(true);
            expect(isFirstErrorHandlerCalled).toBe(true);
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);

          }, function() {
            // NOT EXPECTED:
            expect(false).toBe(true);
            expect(isFirstErrorHandlerCalled).toBe(true);
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);
          });
        }, MYTIMEOUT);

      });

      describe(scenarioList[i] + ': other tx error handling test(s)', function() {

        // FUTURE TODO ref: litehelpers/Cordova-sqlite-storage#232
        // test case of sql error handler returning values such as "true" (string), 1, 0, null

        it(suiteName + 'empty transaction (no callback argument) and then SELECT transaction', function (done) {

          var db = openDatabase("tx-with-no-argment", "1.0", "Demo", DEFAULT_SIZE);

          try {
            // SYNCHRONOUS ERROR EXPECTED:
            db.transaction();

            // NOT EXPECTED to get here:
            expect(false).toBe(true);
          } catch (error) {
            // EXPECTED RESULT:
            expect(error).toBeDefined();

            // TBD WebKit Web SQL vs plugin according to spec?
            if (isWebSql)
              expect(error.code).not.toBeDefined();
            else
              expect(error.code).toBeDefined();
            expect(error.message).toBeDefined();

            if (!isWebSql)
              expect(error.code).toBe(0); // [UNKNOWN_ERR]

            if (!isWebSql)
              expect(error.message).toMatch(/transaction expected a function/);
            else
              expect(error.message).toMatch(/Not enough arguments/);
          }

          // VERIFY we can still continue:
          var gotStringLength = false; // poor man's spy
          db.transaction(function (tx) {
            tx.executeSql("SELECT LENGTH('tenletters') AS stringlength", [], function (tx, res) {
              expect(res.rows.item(0).stringlength).toBe(10);
              gotStringLength = true;
            });

          }, function (error) {
            // NOT EXPECTED:
            expect(false).toBe(true);
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);

          }, function () {
            // EXPECTED RESULT (transaction finished OK):
            expect(true).toBe(true);
            expect(gotStringLength).toBe(true);
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);
          });
        }, MYTIMEOUT);

        it(suiteName + 'empty readTransaction (no callback argument) and then SELECT transaction', function (done) {

          var db = openDatabase("read-tx-with-no-argment", "1.0", "Demo", DEFAULT_SIZE);

          try {
            // SYNCHRONOUS ERROR EXPECTED:
            db.readTransaction();

            // NOT EXPECTED to get here:
            expect(false).toBe(true);
          } catch (error) {
            // EXPECTED RESULT:
            expect(error).toBeDefined();

            // TBD WebKit Web SQL vs plugin according to spec?
            if (isWebSql)
              expect(error.code).not.toBeDefined();
            else
              expect(error.code).toBeDefined();
            expect(error.message).toBeDefined();

            if (!isWebSql)
              expect(error.code).toBe(0); // [UNKNOWN_ERR]

            if (!isWebSql)
              expect(error.message).toMatch(/transaction expected a function/);
            else
              expect(error.message).toMatch(/Not enough arguments/);
          }

          // VERIFY we can still continue:
          var gotStringLength = false; // poor man's spy
          db.readTransaction(function (tx) {
            tx.executeSql("SELECT LENGTH('tenletters') AS stringlength", [], function (tx, res) {
              expect(res.rows.item(0).stringlength).toBe(10);
              gotStringLength = true;
            });

          }, function (error) {
            // NOT EXPECTED:
            expect(false).toBe(true);
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);

          }, function () {
            // EXPECTED RESULT (transaction finished OK):
            expect(true).toBe(true);
            expect(gotStringLength).toBe(true);
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);
          });
        }, MYTIMEOUT);

        it(suiteName + 'empty transaction (no sql statements) and then SELECT transaction', function (done) {

          var db = openDatabase("empty-tx", "1.0", "Demo", DEFAULT_SIZE);

          db.transaction(function(tx) {
            expect(true).toBe(true);
          }, function(err) {
            // NOT EXPECTED:
            expect(false).toBe(true);
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);

          }, function() {
            // EXPECTED RESULT:
            expect(true).toBe(true);

            // VERIFY we can still continue:
            var gotStringLength = false; // poor man's spy
            db.transaction(function (tx) {
              tx.executeSql("SELECT LENGTH('tenletters') AS stringlength", [], function (tx, res) {
                expect(res.rows.item(0).stringlength).toBe(10);
                gotStringLength = true;
              });

            }, function (error) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              expect(error.message).toBe('--');
              // Close (plugin only) & finish:
              (isWebSql) ? done() : db.close(done, done);

            }, function () {
              // EXPECTED RESULT (transaction finished OK):
              expect(true).toBe(true);
              expect(gotStringLength).toBe(true);
              // Close (plugin only) & finish:
              (isWebSql) ? done() : db.close(done, done);
            });

          });

        }, MYTIMEOUT);

        // Check fix for litehelpers/Cordova-sqlite-storage#409:
        it(suiteName + 'empty readTransaction (no sql statements) and then SELECT transaction', function (done) {

          var db = openDatabase("empty-read-tx", "1.0", "Demo", DEFAULT_SIZE);

          db.readTransaction(function(tx) {
            expect(true).toBe(true);
          }, function(err) {
            // NOT EXPECTED:
            expect(false).toBe(true);
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);

          }, function() {
            // EXPECTED RESULT:
            expect(true).toBe(true);

            // VERIFY we can still continue:
            var gotStringLength = false; // poor man's spy
            db.transaction(function (tx) {
              tx.executeSql("SELECT LENGTH('tenletters') AS stringlength", [], function (tx, res) {
                expect(res.rows.item(0).stringlength).toBe(10);
                gotStringLength = true;
              });

            }, function (error) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              // Close (plugin only) & finish:
              (isWebSql) ? done() : db.close(done, done);

            }, function () {
              // EXPECTED RESULT (transaction finished OK):
              expect(true).toBe(true);
              expect(gotStringLength).toBe(true);
              // Close (plugin only) & finish:
              (isWebSql) ? done() : db.close(done, done);
            });

          });

        }, MYTIMEOUT);

        it(suiteName + "transaction.executeSql on BOGUS empty SQL string ('')", function (done) {

          var db = openDatabase("tx-empty-sql-string.db", "1.0", "Demo", DEFAULT_SIZE);

          db.transaction(function(tx) {
            transaction.executeSql('');

          }, function(err) {
            // EXPECTED RESULT:
            expect(true).toBe(true);

            // VERIFY we can still continue:
            var gotStringLength = false; // poor man's spy
            db.transaction(function (tx) {
              tx.executeSql("SELECT LENGTH('tenletters') AS stringlength", [], function (tx, res) {
                expect(res.rows.item(0).stringlength).toBe(10);
                gotStringLength = true;
              });
            }, function (error) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              // Close (plugin only) & finish:
              (isWebSql) ? done() : db.close(done, done);

            }, function () {
              // EXPECTED RESULT (transaction finished OK):
              expect(true).toBe(true);
              expect(gotStringLength).toBe(true);
              // Close (plugin only) & finish:
              (isWebSql) ? done() : db.close(done, done);
            });

          }, function() {
            // NOT EXPECTED by Web SQL, Android, or iOS:
            if (isWindows)
              expect(true).toBe(true);
            else
              expect(false).toBe(true);
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);
          });

        }, MYTIMEOUT);

        it(suiteName + "transaction.executeSql on BOGUS ';' SQL statement", function (done) {

          var db = openDatabase("tx-semicolon-sql-statement.db", "1.0", "Demo", DEFAULT_SIZE);

          db.transaction(function(tx) {
            transaction.executeSql(';');

          }, function(err) {
            // EXPECTED RESULT:
            expect(true).toBe(true);

            // VERIFY we can still continue:
            var gotStringLength = false; // poor man's spy
            db.transaction(function (tx) {
              tx.executeSql("SELECT LENGTH('tenletters') AS stringlength", [], function (tx, res) {
                expect(res.rows.item(0).stringlength).toBe(10);
                gotStringLength = true;
              });

            }, function (error) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              // Close (plugin only) & finish:
              (isWebSql) ? done() : db.close(done, done);

            }, function () {
              // EXPECTED RESULT (transaction finished OK):
              expect(true).toBe(true);
              expect(gotStringLength).toBe(true);
              // Close (plugin only) & finish:
              (isWebSql) ? done() : db.close(done, done);
            });

          }, function() {
            // NOT EXPECTED by Web SQL, Android, or iOS:
            if (isWindows)
              expect(true).toBe(true);
            else
              expect(false).toBe(true);
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);
          });

        }, MYTIMEOUT);

        it(suiteName + 'transaction.executeSql on BOGUS object', function (done) {
          var db = openDatabase("tx-with-object-for-sql-statement.db", "1.0", "Demo", DEFAULT_SIZE);

          db.transaction(function(tx) {
            transaction.executeSql({key1:'value1', key2:2});

          }, function(err) {
            // EXPECTED RESULT:
            expect(true).toBe(true);

            // VERIFY we can still continue:
            var gotStringLength = false; // poor man's spy
            db.transaction(function (tx) {
              tx.executeSql("SELECT LENGTH('tenletters') AS stringlength", [], function (tx, res) {
                expect(res.rows.item(0).stringlength).toBe(10);
                gotStringLength = true;
              });

            }, function (error) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              // Close (plugin only) & finish:
              (isWebSql) ? done() : db.close(done, done);

            }, function () {
              // EXPECTED RESULT (transaction finished OK):
              expect(true).toBe(true);
              expect(gotStringLength).toBe(true);
              // Close (plugin only) & finish:
              (isWebSql) ? done() : db.close(done, done);
            });

          }, function() {
            // NOT EXPECTED by Web SQL, Android, or iOS:
            if (isWindows)
              expect(true).toBe(true);
            else
              expect(false).toBe(true);
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);
          });

        }, MYTIMEOUT);

        it(suiteName + 'transaction.executeSql with BOGUS array', function (done) {
          var db = openDatabase("tx-with-array-for-sql-statement.db", "1.0", "Demo", DEFAULT_SIZE);

          db.transaction(function(tx) {
            transaction.executeSql(['first', 2]);

          }, function(err) {
            // EXPECTED RESULT:
            expect(true).toBe(true);

            // VERIFY we can still continue:
            var gotStringLength = false; // poor man's spy
            db.transaction(function (tx) {
              tx.executeSql("SELECT LENGTH('tenletters') AS stringlength", [], function (tx, res) {
                expect(res.rows.item(0).stringlength).toBe(10);
                gotStringLength = true;
              });
            }, function (error) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              // Close (plugin only) & finish:
              (isWebSql) ? done() : db.close(done, done);

            }, function () {
              // EXPECTED RESULT (transaction finished OK):
              expect(true).toBe(true);
              expect(gotStringLength).toBe(true);
              // Close (plugin only) & finish:
              (isWebSql) ? done() : db.close(done, done);
            });

          }, function() {
            // NOT EXPECTED:
            expect(false).toBe(true);
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);
          });

        }, MYTIMEOUT);

        it(suiteName + 'transaction.executeSql on BOGUS number', function (done) {
          var db = openDatabase("tx-with-number-for-sql-statement.db", "1.0", "Demo", DEFAULT_SIZE);

          db.transaction(function(tx) {
            transaction.executeSql(101);

          }, function(err) {
            // EXPECTED RESULT:
            expect(true).toBe(true);

            // VERIFY we can still continue:
            var gotStringLength = false; // poor man's spy
            db.transaction(function (tx) {
              tx.executeSql("SELECT LENGTH('tenletters') AS stringlength", [], function (tx, res) {
                expect(res.rows.item(0).stringlength).toBe(10);
                gotStringLength = true;
              });

            }, function (error) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              // Close (plugin only) & finish:
              (isWebSql) ? done() : db.close(done, done);

            }, function () {
              // EXPECTED RESULT (transaction finished OK):
              expect(true).toBe(true);
              expect(gotStringLength).toBe(true);
              // Close (plugin only) & finish:
              (isWebSql) ? done() : db.close(done, done);
            });

          }, function() {
            // NOT EXPECTED:
            expect(false).toBe(true);
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);
          });

        }, MYTIMEOUT);

        it(suiteName + 'transaction.executeSql with null for SQL statement (BOGUS)', function (done) {
          var db = openDatabase("tx-with-number-for-sql-statement.db", "1.0", "Demo", DEFAULT_SIZE);

          db.transaction(function(tx) {
            transaction.executeSql(null);

          }, function(err) {
            // EXPECTED RESULT:
            expect(true).toBe(true);

            // VERIFY we can still continue:
            var gotStringLength = false; // poor man's spy
            db.transaction(function (tx) {
              tx.executeSql("SELECT LENGTH('tenletters') AS stringlength", [], function (tx, res) {
                expect(res.rows.item(0).stringlength).toBe(10);
                gotStringLength = true;
              });
            }, function (error) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              // Close (plugin only) & finish:
              (isWebSql) ? done() : db.close(done, done);

            }, function () {
              // EXPECTED RESULT (transaction finished OK):
              expect(true).toBe(true);
              expect(gotStringLength).toBe(true);
              // Close (plugin only) & finish:
              (isWebSql) ? done() : db.close(done, done);
            });

          }, function() {
            // NOT EXPECTED:
            expect(false).toBe(true);
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);
          });

        }, MYTIMEOUT);

        it(suiteName + 'transaction.executeSql with true for SQL statement (BOGUS)', function (done) {
          var db = openDatabase("tx-with-true-for-sql-statement.db", "1.0", "Demo", DEFAULT_SIZE);

          db.transaction(function(tx) {
            transaction.executeSql(true);

          }, function(err) {
            // EXPECTED RESULT:
            expect(true).toBe(true);

            // Verify we can still continue:
            var gotStringLength = false; // poor man's spy
            db.transaction(function (tx) {
              tx.executeSql("SELECT LENGTH('tenletters') AS stringlength", [], function (tx, res) {
                expect(res.rows.item(0).stringlength).toBe(10);
                gotStringLength = true;
              });
            }, function (error) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              // Close (plugin only) & finish:
              (isWebSql) ? done() : db.close(done, done);

            }, function () {
              // EXPECTED RESULT (transaction finished OK):
              expect(true).toBe(true);
              expect(gotStringLength).toBe(true);
              // Close (plugin only) & finish:
              (isWebSql) ? done() : db.close(done, done);
            });

          }, function() {
            // NOT EXPECTED:
            expect(false).toBe(true);
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);
          });

        }, MYTIMEOUT);

        it(suiteName + 'transaction.executeSql with false for SQL statement (BOGUS)', function (done) {
          var db = openDatabase("tx-with-false-for-sql-statement.db", "1.0", "Demo", DEFAULT_SIZE);

          db.transaction(function(tx) {
            transaction.executeSql(false);

          }, function(err) {
            // EXPECTED RESULT:
            expect(true).toBe(true);

            // Verify we can still continue:
            var gotStringLength = false; // poor man's spy
            db.transaction(function (tx) {
              tx.executeSql("SELECT LENGTH('tenletters') AS stringlength", [], function (tx, res) {
                expect(res.rows.item(0).stringlength).toBe(10);
                gotStringLength = true;
              });
            }, function (error) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              // Close (plugin only) & finish:
              (isWebSql) ? done() : db.close(done, done);

            }, function () {
              // EXPECTED RESULT (transaction finished OK):
              expect(true).toBe(true);
              expect(gotStringLength).toBe(true);
              // Close (plugin only) & finish:
              (isWebSql) ? done() : db.close(done, done);
            });

          }, function() {
            // NOT EXPECTED:
            expect(false).toBe(true);
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);
          });

        }, MYTIMEOUT);

        it(suiteName + 'transaction.executeSql with undefined executeSql argument (BOGUS)', function (done) {
          var db = openDatabase("tx-with-undefined-executeSql-argument.db", "1.0", "Demo", DEFAULT_SIZE);

          db.transaction(function(tx) {
            transaction.executeSql(undefined);

          }, function(err) {
            // EXPECTED RESULT:
            expect(true).toBe(true);

            // Verify we can still continue:
            var gotStringLength = false; // poor man's spy
            db.transaction(function (tx) {
              tx.executeSql("SELECT LENGTH('tenletters') AS stringlength", [], function (tx, res) {
                expect(res.rows.item(0).stringlength).toBe(10);
                gotStringLength = true;
              });
            }, function (error) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              // Close (plugin only) & finish:
              (isWebSql) ? done() : db.close(done, done);

            }, function () {
              // EXPECTED RESULT (transaction finished OK):
              expect(true).toBe(true);
              expect(gotStringLength).toBe(true);
              // Close (plugin only) & finish:
              (isWebSql) ? done() : db.close(done, done);
            });

          }, function() {
            // NOT EXPECTED:
            expect(false).toBe(true);
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);
          });

        }, MYTIMEOUT);

        it(suiteName + 'transaction.executeSql with no executeSql argument (BOGUS)', function (done) {
          var db = openDatabase("tx-with-no-executeSql-argument.db", "1.0", "Demo", DEFAULT_SIZE);

          db.transaction(function(tx) {
            tx.executeSql();

          }, function(err) {
            // EXPECTED RESULT:
            expect(true).toBe(true);

            // Verify we can still continue:
            var gotStringLength = false; // poor man's spy
            db.transaction(function (tx) {
              tx.executeSql("SELECT LENGTH('tenletters') AS stringlength", [], function (tx, res) {
                expect(res.rows.item(0).stringlength).toBe(10);
                gotStringLength = true;
              });
            }, function (error) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              // Close (plugin only) & finish:
              (isWebSql) ? done() : db.close(done, done);

            }, function () {
              // EXPECTED RESULT (transaction finished OK):
              expect(true).toBe(true);
              expect(gotStringLength).toBe(true);
              // Close (plugin only) & finish:
              (isWebSql) ? done() : db.close(done, done);
            });

          }, function() {
            // NOT EXPECTED:
            expect(false).toBe(true);
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);
          });

        }, MYTIMEOUT);

        it(suiteName + 'Error recovery for transaction with object for SQL statement', function (done) {
          var db = openDatabase("tx-with-object-for-sql-recovery.db", "1.0", "Demo", DEFAULT_SIZE);

          var firstError = null;
          var selectResultSet = null;

          db.transaction(function(tx) {
            tx.executeSql({key1:'value1', key2:2}, [], function(tx_ignored, rs_ignored) {
              // NOT EXPECTED:
              expect(false).toBe(true);
            }, function(tx_ignored, error) {
              // EXPECTED RESULT:
              expect(true).toBe(true);
              firstError = error;
              return false; // RECOVER TRANSACTION
            });

            tx.executeSql('SELECT 1', [], function(tx_ignored, resultSet) {
              // EXPECTED RESULT:
              expect(true).toBe(true);
              selectResultSet = resultSet;
            }, function(tx_ignored, error) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              return false; // RECOVER TRANSACTION
            });

          }, function(err) {
            // NOT EXPECTED:
            expect(false).toBe(true);
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);

          }, function() {
            // EXPECTED RESULT:
            expect(true).toBe(true);
            expect(firstError).toBeDefined();
            expect(firstError).not.toBeNull();
            expect(selectResultSet).toBeDefined();
            expect(selectResultSet).not.toBeNull();

            // Verify we can still continue:
            var gotStringLength = false; // poor man's spy
            db.transaction(function (tx) {
              tx.executeSql("SELECT LENGTH('tenletters') AS stringlength", [], function (tx, res) {
                expect(res.rows.item(0).stringlength).toBe(10);
                gotStringLength = true;
              });
            }, function (error) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              // Close (plugin only) & finish:
              (isWebSql) ? done() : db.close(done, done);
            }, function () {
              // EXPECTED RESULT (transaction finished OK):
              expect(true).toBe(true);
              expect(gotStringLength).toBe(true);
              // Close (plugin only) & finish:
              (isWebSql) ? done() : db.close(done, done);
            });

          });

        }, MYTIMEOUT);

        it(suiteName + 'Error recovery for transaction with array for SQL statement', function (done) {
          var db = openDatabase("tx-with-array-for-sql-recovery.db", "1.0", "Demo", DEFAULT_SIZE);

          var firstError = null;
          var selectResultSet = null;

          db.transaction(function(tx) {
            tx.executeSql(['first', 2], [], function(tx_ignored, rs_ignored) {
              // NOT EXPECTED:
              expect(false).toBe(true);
            }, function(tx_ignored, error) {
              // EXPECTED RESULT:
              expect(true).toBe(true);
              firstError = error;
              return false; // RECOVER TRANSACTION
            });

            tx.executeSql('SELECT 1', [], function(tx_ignored, resultSet) {
              // EXPECTED RESULT:
              expect(true).toBe(true);
              selectResultSet = resultSet;
            }, function(tx_ignored, error) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              return false; // RECOVER TRANSACTION
            });

          }, function(err) {
            // NOT EXPECTED:
            expect(false).toBe(true);
            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);

          }, function() {
            // EXPECTED RESULT:
            expect(true).toBe(true);
            expect(firstError).toBeDefined();
            expect(firstError).not.toBeNull();
            expect(selectResultSet).toBeDefined();
            expect(selectResultSet).not.toBeNull();

            // Verify we can still continue:
            var gotStringLength = false; // poor man's spy
            db.transaction(function (tx) {
              tx.executeSql("SELECT LENGTH('tenletters') AS stringlength", [], function (tx, res) {
                expect(res.rows.item(0).stringlength).toBe(10);
                gotStringLength = true;
              });
            }, function (error) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              // Close (plugin only) & finish:
              (isWebSql) ? done() : db.close(done, done);
            }, function () {
              // EXPECTED RESULT (transaction finished OK):
              expect(true).toBe(true);
              expect(gotStringLength).toBe(true);
              // Close (plugin only) & finish:
              (isWebSql) ? done() : db.close(done, done);
            });

          });

        }, MYTIMEOUT);

        it(suiteName + 'transaction.executeSql in error handler that returns false should work', function(done) {
          var db = openDatabase('SQL-statement-in-error-handler-that-returns-false.db');

          var check1 = false;
          db.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS tt');
            tx.executeSql('CREATE TABLE tt (data)');
            tx.executeSql('INSERT INTO tt VALUES (?)', ['initial']);
            tx.executeSql('SLCT 1', [], function(ignored1, ignored2) {
              // NOT EXPECTED:
              expect(false).toBe(true);
            }, function(tx1, error) {
              // EXPECTED:
              expect(tx1).toBe(tx);
              expect(error).toBeDefined();
              tx.executeSql('UPDATE tt SET data=?', ['new'], function(ignored, rs) {
                check1 = true;
                expect(rs).toBeDefined();
                expect(rs.rowsAffected).toBeDefined();
                expect(rs.rowsAffected).toBe(1);
              });
              return false;
            });
          }, function(error) {
            // NOT EXPECTED:
            expect(false).toBe(true);
            expect(error.message).toBe('--');
            done();

          }, function() {
            // EXPECTED RESULT:
            expect(check1).toBe(true);
            db.transaction(function(tx) {
              tx.executeSql('SELECT * FROM tt', [], function(ignored, rs) {
                expect(rs).toBeDefined();
                expect(rs.rows).toBeDefined();
                expect(rs.rows.length).toBe(1);
                expect(rs.rows.item(0).data).toBe('new');
                isWebSql ? done() : db.close(done, done);
              });
            }, function(error) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              expect(error.message).toBe('--');
              isWebSql ? done() : db.close(done, done);
            });
          });
        }, MYTIMEOUT);

        it(suiteName + 'transaction.executeSql in error handler that returns true should not fire its callbacks', function(done) {
          var db = openDatabase('SQL-statement-in-error-handler-that-returns-true.db');

          var initCheck = false;
          db.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS tt');
            tx.executeSql('CREATE TABLE tt (data)');
            tx.executeSql('INSERT INTO tt VALUES (?)', ['initial']);
            initCheck = true;
          }, function(error) {
            // NOT EXPECTED:
            expect(false).toBe(true);
            expect(error.message).toBe('--');
          })

          db.transaction(function(tx) {
            expect(initCheck).toBe(true);
            tx.executeSql('SLCT 1', [], function(ignored1, ignored2) {
              // NOT EXPECTED:
              expect(false).toBe(true);
            }, function(tx1, error) {
              // EXPECTED:
              expect(tx1).toBe(tx);
              expect(error).toBeDefined();
              tx.executeSql('UPDATE tt SET data=?', ['new'], function(ignored1, ignored2) {
                // NOT EXPECTED:
                expect(false).toBe(true);
              }, function(ignored, error) {
                // NOT EXPECTED:
                expect(false).toBe(true);
              });
              return true;
            });
          }, function(error) {
            // EXPECTED RESULT:
            expect(error).toBeDefined();
            db.transaction(function(tx) {
              tx.executeSql('SELECT * FROM tt', [], function(ignored, rs) {
                expect(rs).toBeDefined();
                expect(rs.rows).toBeDefined();
                expect(rs.rows.length).toBe(1);
                expect(rs.rows.item(0).data).toBe('initial');
                isWebSql ? done() : db.close(done, done);
              });
            }, function(error) {
              // NOT EXPECTED:
              expect(false).toBe(true);
              expect(error.message).toBe('--');
              isWebSql ? done() : db.close(done, done);
            });
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
