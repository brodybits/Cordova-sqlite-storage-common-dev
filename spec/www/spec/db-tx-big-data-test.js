/* 'use strict'; */

//var MYTIMEOUT = 12000;
var MYTIMEOUT = 2*60*1000;

var DEFAULT_SIZE = 5000000; // max to avoid popup in safari/ios

var isWP8 = /IEMobile/.test(navigator.userAgent); // Matches WP(7/8/8.1)
var isWindows = /Windows /.test(navigator.userAgent); // Windows (8.1)
var isAndroid = !isWindows && /Android/.test(navigator.userAgent);
var isIE = isWindows || isWP8;
var isWebKit = !isIE; // TBD [Android or iOS]

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

    describe(scenarioList[i] + ': BIG data test(s)', function() {
      var scenarioName = scenarioList[i];
      var suiteName = scenarioName + ': ';
      var isWebSql = (i === 1);
      var isImpl2 = (i === 2);

      // NOTE: MUST be defined in proper describe function scope, NOT outer scope:
      var openDatabase = function(name, ignored1, ignored2, ignored3) {
        if (isImpl2) {
          return window.sqlitePlugin.openDatabase({
            // prevent reuse of database from default db implementation:
            name: 'i2-'+name,
            androidDatabaseImplementation: 2,
            androidLockWorkaround: 1,
            location: 1
          });
        } else if (isWebSql) {
          return window.openDatabase(name, "1.0", "Demo", DEFAULT_SIZE);
        } else {
          return window.sqlitePlugin.openDatabase({name: name, location: 'default'});
        }
      }

      function runTestTransaction(db, recordCount, chars, fullCheck, done) {
        var RECORD_COUNT = recordCount;
        var PATTERN_REPEAT_COUNT = Math.floor(chars/100);

          var PATTERN =
            '-abcdefghijklmnopqrstuvwxyz--1234567890-' +
            '-ABCDEFGHIJKLMNOPQRSTUVWXYZ--1234567890-' +
            '-$+/*#!$-1234567890-';

          var rs = '';

          var i;

          for (var i=0; i<PATTERN_REPEAT_COUNT; ++i) rs += PATTERN;

          var values = [];
          for (i=0; i<RECORD_COUNT; ++i) values.push(rs+i);

          db.transaction(function(tx) {
            expect(tx).toBeDefined();

            tx.executeSql('DROP TABLE IF EXISTS tt;');
            tx.executeSql('CREATE TABLE tt (num, val);');

            for (i=0; i<RECORD_COUNT; ++i)
              tx.executeSql('INSERT INTO tt VALUES (?,?)', [101+i, values[i]]);
          }, function(error) {
            // NOT EXPECTED:
            expect(false).toBe(true);
            // display the error message:
            expect(error.message).toBe('--');

            testCleanup(db, done);
          }, function() {
            // EXPECTED RESULT:
            expect(true).toBe(true);

            if (fullCheck) {
              db.transaction(function(t2) {
                t2.executeSql('SELECT * FROM tt;', [], function(ignored, rs) {
                  // EXPECTED RESULT:
                  expect(rs).toBeDefined();
                  expect(rs.rows).toBeDefined();
                  expect(rs.rows.length).toBe(RECORD_COUNT);
                  for (i=0; i<RECORD_COUNT; ++i) {
                    if (rs.rows.item(i).num !== 101+i)
                      expect('INCORRECT value of num at row ' + i + ' : ' + rs.rows.item(i).num).toBe('--');
                    if (rs.rows.item(i).val !== values[i])
                      expect('INCORRECT value of val at row ' + i + ' : ' + rs.rows.item(i).val).toBe('--');
                  }

                  testCleanup(db, done);

                }, function(error) {
                  // NOT EXPECTED:
                  expect(false).toBe(true);
                  // display the error message:
                  expect(error.message).toBe('--');

                  testCleanup(db, done);
                });
              });
            } else {
              db.transaction(function(t2) {
                t2.executeSql('SELECT count(*) AS count FROM tt;', [], function(ignored, rs) {
                  // EXPECTED RESULT:
                  expect(rs).toBeDefined();
                  expect(rs.rows).toBeDefined();
                  expect(rs.rows.length).toBe(1);
                  expect(rs.rows.item(0).count).toBe(RECORD_COUNT);

                  testCleanup(db, done);

                }, function(error) {
                  // NOT EXPECTED:
                  expect(false).toBe(true);
                  // display the error message:
                  expect(error.message).toBe('--');

                  testCleanup(db, done);
                });
              });
            }

          });
      }

      function testCleanup(db, done) {
          db.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS tt;');

          }, function(error) {
            // NOT EXPECTED:
            expect(false).toBe(true);
            // display the error message:
            expect(error.message).toBe('--');

            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);

          }, function() {
            // EXPECTED RESULT:
            expect(true).toBe(true);

            // Close (plugin only) & finish:
            (isWebSql) ? done() : db.close(done, done);
          });
      }

      describe(scenarioList[i] + ': BASIC BIG data test(s)', function() {

        it(suiteName + "BIG data test: 10 records with 1000 characters (full check)", function(done) {
          var db = openDatabase('BIG-data-10-records-1000-chars-full-test.db');

          expect(db).toBeDefined();

          runTestTransaction(db, 10, 1*1000, true, done);
        }, MYTIMEOUT);

        it(suiteName + "BIG data test: 3 records with 1.1M characters (full check)", function(done) {
          var db = openDatabase('BIG-data-3-records-1.1M-chars-full-test.db');

          expect(db).toBeDefined();

          runTestTransaction(db, 3, 1100*1000, true, done);
        }, MYTIMEOUT);

        it(suiteName + "BIG data test: 30 records with 1.1M characters (count check)", function(done) {
          if (isWebSql) pending('SKIP for Web SQL');
          if (isAndroid) pending('KEEP as MANUAL TEST for Android plugin');

          var db = openDatabase('BIG-data-30-records-1.1M-chars-count-test.db');

          expect(db).toBeDefined();

          runTestTransaction(db, 30, 1100*1000, false, done);
        }, MYTIMEOUT);

        it(suiteName + "BIG data test: 100 records with 101K characters (full check)", function(done) {
          if (isWebSql) pending('SKIP for Web SQL');

          var db = openDatabase('BIG-data-100-records-101K-chars-full-test.db');

          expect(db).toBeDefined();

          runTestTransaction(db, 100, 101*1000, true, done);
        }, MYTIMEOUT);

        it(suiteName + "BIG data test: 20K records with 1000 characters (full check)", function(done) {
          if (isWebSql) pending('SKIP for Web SQL');

          var db = openDatabase('BIG-data-20K-records-1000-chars-full-test.db');

          expect(db).toBeDefined();

          runTestTransaction(db, 20*1000, 1000, true, done);
        }, MYTIMEOUT);

      });

      describe(scenarioList[i] + ': EXTRA BIG data test(s)', function() {

        // For manual testing: both Android & iOS versions seem to crash when adding more than 80K records
        // This will crash on Android if it is run along with the rest of the test suite.
        xit(suiteName + "EXTRA BIG data test: 80K records with 100 characters (count check)", function(done) {
          if (isWebSql) pending('SKIP for Web SQL');
          //if (!isWebSql) pending('SKIP for plugin');
          //if (isAndroid && !isWebSql) pending('SKIP for Android plugin');
          //if (isAndroid && !isWebSql && !isImpl2) pending('SKIP for default Android database implementation');
          if (isAndroid && isImpl2) pending('SKIP for Android database implementation 2');

          var db = openDatabase('BIG-data-80K-records-100-chars-count-test.db');

          expect(db).toBeDefined();

          runTestTransaction(db, 80*1000, 100, false, done);
        }, MYTIMEOUT);

      });

    });
  }

}

if (window.hasBrowser) mytests();
else exports.defineAutoTests = mytests;

/* vim: set expandtab : */
