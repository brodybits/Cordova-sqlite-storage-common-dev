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
var scenarioList = [
  isAndroid ? 'Plugin-implementation-default' : 'Plugin',
  'HTML5',
  'Plugin-implementation-2'
];

// XXX TODO why doesnt this script run?

// TODO test with null/undefined SQL parameters and success (or error) cb
// also for db.executeSql, maybe batch sql

var scenarioCount = (!!window.hasBrowserWithWebSQL) ? (isAndroid ? 3 : 2) : 1;

var mytests = function() {

  for (var i=0; i<scenarioCount; ++i) {

    describe(scenarioList[i] + ': tx value bindings test(s)', function() {
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

      describe(suiteName + 'simple tx column value binding/insertion test(s)', function() {

        it(suiteName + 'INSERT TEXT string with emoji [\\u1F603 SMILING FACE (MOUTH OPEN)], SELECT the data, and check', function(done) {

          var db = openDatabase('INSERT-emoji-and-check.db', '1.0', 'Demo', DEFAULT_SIZE);

          db.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS test_table');
            tx.executeSql('CREATE TABLE IF NOT EXISTS test_table (data)', [], function(ignored1, ignored2) {

              tx.executeSql('INSERT INTO test_table VALUES (?)', ['@\uD83D\uDE03!'], function(tx, res) {

                expect(res).toBeDefined();
                expect(res.rowsAffected).toBe(1);

                tx.executeSql('SELECT * FROM test_table', [], function(tx, res) {
                  var row = res.rows.item(0);

                  // Full object check:
                  expect(row).toEqual({data: '@\uD83D\uDE03!'});
                  // Check individual members:
                  expect(row.data).toBe('@\uD83D\uDE03!');

                  // Close (plugin only) & finish:
                  (isWebSql) ? done() : db.close(done, done);
                });
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

        it(suiteName + 'INSERT: all columns should be included in SELECT result set including null columns', function(done) {

          var db = openDatabase('all-result-columns-including-null-columns.db', '1.0', 'Demo', DEFAULT_SIZE);

          db.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS test_table');
            tx.executeSql('CREATE TABLE IF NOT EXISTS test_table (data1, data_num)', [], function(ignored1, ignored2) {

              tx.executeSql('INSERT INTO test_table VALUES (?,?)', ['test', null], function(tx, res) {

                expect(res).toBeDefined();
                expect(res.rowsAffected).toBe(1);

                tx.executeSql('SELECT * FROM test_table', [], function(tx, res) {
                  var row = res.rows.item(0);

                  // Full object check:
                  expect(row).toEqual({data1: 'test', data_num: null});
                  // Check individual members:
                  expect(row.data1).toBe('test');
                  expect(row.data_num).toBeDefined();
                  expect(row.data_num).toBeNull();

                  // Close (plugin only) & finish:
                  (isWebSql) ? done() : db.close(done, done);
                });
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

        it(suiteName + 'number values inserted using number bindings (columns with no type affinity)', function(done) {

          var db = openDatabase("Number-value-binding-test.db", "1.0", "Demo", DEFAULT_SIZE);

          db.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS test_table');
            // create columns with no type affinity
            tx.executeSql('CREATE TABLE IF NOT EXISTS test_table (data_text1, data_text2, data_int, data_real)', [], function(ignored1, ignored2) {

              tx.executeSql("INSERT INTO test_table VALUES (?,?,?,?)", ["314159", "3.14159", 314159, 3.14159], function(tx, res) {

                expect(res).toBeDefined();
                expect(res.rowsAffected).toBe(1);

                tx.executeSql("SELECT * FROM test_table", [], function(tx, res) {
                  var row = res.rows.item(0);

                  expect(row.data_text1).toBe("314159"); // (data_text1 should have inserted data as text)

                  if (isWP8) // JSON issue in WP(8) version
                    expect(row.data_text2).toBe(3.14159); // Due to WP(8) JSON
                  else
                    expect(row.data_text2).toBe("3.14159"); // (data_text2 should have inserted data as text)

                  expect(row.data_int).toBe(314159); // (data_int should have inserted data as an integer)
                  expect(Math.abs(row.data_real - 3.14159) < 0.000001).toBe(true); // (data_real should have inserted data as a real)

                  // Close (plugin only) & finish:
                  (isWebSql) ? done() : db.close(done, done);
                });
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

        it(suiteName + 'Big integer value binding', function(done) {
          var db = openDatabase('Big-integer-value-binding.db');

          db.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS tt');
            // NOTES:
            // * According to https://www.sqlite.org/datatype3.html#section_3_2
            //   - Column with no type name specified has "BLOB" type affinity (data is never coerced)
            //   - Column specified as DATETIME has "NUMERIC" type affinity
            // * According to https://www.sqlite.org/datatype3.html#section_3
            //   - In case of "BLOB" affinity data will never be coerced
            //   - In case of "NUMERIC" type, string ("TEXT") data will be coerced to INTEGER
            //     or REAL "lossless and reversible" conversion is possible.
            //   - In case of "TEXT" affinity numerical data would be stored as TEXT.
            // * PITFALL(s): Using the DATETIME column type name (which acts as an alias for "NUMMERIC" affinity)
            //   means that text or numerical data would be stored as a number (INTEGER or REAL) if possible otherwise
            //   as a TEXT string. However there is also a built-in DATETIME function that always
            //   returns a date as a TEXT string. This could easily cause confusion in some large-scale
            //   applications with multiple developers. In addition both INTEGER and REAL date/time
            //   values are possible but mean different things: INTEGER UNIX TIME or REAL Julian time.
            tx.executeSql('CREATE TABLE IF NOT EXISTS tt ' +
                          '(test_blob, test_date DATETIME, test_integer INTEGER, test_text TEXT)',
                          [], function(ignored1, ignored2) {

              tx.executeSql('INSERT INTO tt VALUES (?,?,?,?)',
                            [1424174959894, 1424174959894, 1424174959894, 1424174959894], function(tx, res) {
                expect(res).toBeDefined();
                expect(res.rowsAffected).toBe(1);

                tx.executeSql("SELECT * FROM tt", [], function(tx, res) {
                  // (Big integer number inserted properly)
                  var row = res.rows.item(0);
                  expect(row.test_blob).toBe(1424174959894);
                  expect(row.test_date).toBe(1424174959894);
                  expect(row.test_integer).toBe(1424174959894);

                  // NOTE: big number apparently stored in field with TEXT affinity with slightly
                  // different conversion in plugin vs. WebKit Web SQL!
                  if (isWebSql)
                    expect(row.test_text).toBe("1424174959894.0"); // ([Big] number inserted as string ok)
                  else
                    expect(row.test_text).toBe("1424174959894"); // (Big integer number inserted as string ok)

                  // Close (plugin only) & finish:
                  (isWebSql) ? done() : db.close(done, done);
                });

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

        it(suiteName + "Double precision decimal number insertion", function(done) {
          var db = openDatabase("Double-precision-decimal-number-insertion.db", "1.0", "Demo", DEFAULT_SIZE);

          db.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS tt');
            tx.executeSql('CREATE TABLE IF NOT EXISTS tt (data1, data2 NUMERIC, data3 REAL)', [], function(ignored1, ignored2) {
              tx.executeSql("INSERT INTO tt VALUES (?,?,?)", [123456.789, 123456.789, 123456.789], function(tx, res) {
                expect(res).toBeDefined();
                expect(res.rowsAffected).toBe(1);

                tx.executeSql("select * from tt", [], function(tx, res) {
                  expect(res.rows).toBeDefined();
                  expect(res.rows.length).toBe(1);

                  var row = res.rows.item(0);
                  expect(row.data1).toBe(123456.789); // (Decimal number inserted properly)
                  expect(row.data2).toBe(123456.789); // (Decimal number inserted properly)
                  expect(row.data3).toBe(123456.789); // (Decimal number inserted properly)

                  // Close (plugin only) & finish:
                  (isWebSql) ? done() : db.close(done, done);
                });
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

        it(suiteName + 'executeSql parameter as "boolean" true/false values [DEVIATION: stringified in both Web SQL & plugin]', function(done) {
          var db = openDatabase("true-false-parameters.db", "1.0", "Demo", DEFAULT_SIZE);

          db.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS test_table');
            // create columns with no type affinity
            tx.executeSql('CREATE TABLE IF NOT EXISTS test_table (data1, data2, data3)', [], function(ignored1, ignored2) {
              tx.executeSql('INSERT INTO test_table VALUES (?,?,?)', [true, false, 123], function(tx, rs1) {
                expect(rs1).toBeDefined();
                expect(rs1.rowsAffected).toBe(1);

                tx.executeSql('SELECT * FROM test_table', [], function(tx, rs2) {
                  expect(rs2.rows.length).toBe(1);
                  expect(rs2.rows.item(0)).toBeDefined();
                  // Full object check:
                  expect(rs2.rows.item(0)).toEqual({data1: 'true', data2: 'false', data3: 123});
                  // Individual object members:
                  expect(rs2.rows.item(0).data1).toBe('true');
                  expect(rs2.rows.item(0).data2).toBe('false');
                  expect(rs2.rows.item(0).data3).toBe(123);

                  // Close (plugin only) & finish:
                  (isWebSql) ? done() : db.close(done, done);
                });
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

        // NOTE: These array & custom object parameter scenario are also covered by string manipulation tests.
        // Keeping here for sake of completeness.
        it(suiteName + 'INSERT parameter as array [treated like a string]', function(done) {
          var db = openDatabase("INSERT-array-parameter-test.db", "1.0", "Demo", DEFAULT_SIZE);

          db.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS test_table');
            // CREATE columns with no type affinity
            tx.executeSql('CREATE TABLE IF NOT EXISTS test_table (data1, data2)', [], function(ignored1, ignored2) {
              tx.executeSql('INSERT INTO test_table VALUES (?,?)', ['abc', [123.456,null,789]], function(tx, res) {
                expect(res).toBeDefined();
                expect(res.rowsAffected).toBe(1);
                tx.executeSql('SELECT * FROM test_table', [], function(tx, res) {
                  var row = res.rows.item(0);
                  expect(row.data1).toBe('abc');
                  expect(row.data2).toBe('123.456,,789');

                  // Close (plugin only) & finish:
                  (isWebSql) ? done() : db.close(done, done);
                });
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

        // NOTE: This scenario is also covered by a string manipulation test.
        // Keeping here for sake of completeness.
        it(suiteName + 'INSERT parameter as a custom object [treated like a string]', function(done) {
          // MyCustomObject "class":
          function MyCustomValueObject() {};
          MyCustomValueObject.prototype.toString = function() {return 'custom toString result';};
          MyCustomValueObject.prototype.valueOf = function() {return 'custom valueOf result';};

          var myObject = new MyCustomValueObject();
          // Check myObject:
          expect(myObject.toString()).toBe('custom toString result');
          expect(myObject.valueOf()).toBe('custom valueOf result');

          var db = openDatabase("INSERT-custom-object-test.db", "1.0", "Demo", DEFAULT_SIZE);

          db.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS test_table');
            // CREATE columns with no type affinity
            tx.executeSql('CREATE TABLE IF NOT EXISTS test_table (data1, data2)', [], function(ignored1, ignored2) {
              tx.executeSql('INSERT INTO test_table VALUES (?,?)', [123.456, myObject], function(tx, res) {
                expect(res).toBeDefined();
                expect(res.rowsAffected).toBe(1);
                tx.executeSql('SELECT * FROM test_table', [], function(tx, res) {
                  var row = res.rows.item(0);
                  expect(row.data1).toBe(123.456);
                  expect(row.data2).toBe('custom toString result');

                  // Close (plugin only) & finish:
                  (isWebSql) ? done() : db.close(done, done);
                });
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

      describe(scenarioList[i] + ': tx column value insertion test(s) with id INTEGER PRIMARY KEY AUTOINCREMENT', function() {

        it(suiteName + 'INSERT null & TEXT string values into columns with no type affinity, with id INTEGER PRIMARY KEY AUTOINCREMENT', function(done) {

          var db = openDatabase("null-and-text-values-no-type-affinity-with-id-autoincrement.db", "1.0", "Demo", DEFAULT_SIZE);

          db.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS test_table');
            tx.executeSql('CREATE TABLE IF NOT EXISTS test_table (id INTEGER PRIMARY KEY AUTOINCREMENT, data1, data2)', [], function(ignored1, ignored2) {

              tx.executeSql('INSERT INTO test_table (data1, data2) VALUES (?,?)', ['test', null], function(tx, res) {

                expect(res).toBeDefined();
                expect(res.rowsAffected).toBe(1);

                tx.executeSql('SELECT * FROM test_table', [], function(tx, res) {
                  var row = res.rows.item(0);

                  // Full object check:
                  expect(row).toEqual({id: 1, data1: 'test', data2: null});
                  // Check individual members:
                  expect(row.id).toBe(1);
                  expect(row.data1).toBe('test');
                  expect(row.data2).toBeDefined();
                  expect(row.data2).toBeNull();

                  // Close (plugin only) & finish:
                  (isWebSql) ? done() : db.close(done, done);
                });
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

        it(suiteName + 'INSERT big & double-precision numerical values into columns with no type affinity, with id INTEGER PRIMARY KEY AUTOINCREMENT', function(done) {

          var db = openDatabase("numerical-values-no-type-affinity-with-id-autoincrement.db", "1.0", "Demo", DEFAULT_SIZE);

          db.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS test_table');
            // create columns with no type affinity
            tx.executeSql('CREATE TABLE IF NOT EXISTS test_table (id INTEGER PRIMARY KEY AUTOINCREMENT, data1, data2, data3, data4)', [], function(ignored1, ignored2) {

              tx.executeSql('INSERT INTO test_table (data1, data2, data3, data4) VALUES (?,?,?,?)',
                            [1424174959894, 123456.789, '314159', '3.14159'], function(tx, res) {
                expect(res).toBeDefined();
                expect(res.rowsAffected).toBe(1);

                tx.executeSql("SELECT * FROM test_table", [], function(tx, res) {
                  var row = res.rows.item(0);

                  expect(row.data1).toBe(1424174959894); // (data1 should have data inserted as an integer)
                  expect(row.data2).toBe(123456.789); // (Decimal number inserted properly)
                  expect(row.data3).toBe('314159'); // (data3 should have data inserted as text)

                  if (isWP8) // JSON issue in WP(8) version
                    expect(row.data4).toBe(3.14159); // Due to WP(8) JSON
                  else
                    expect(row.data4).toBe("3.14159"); // (data4 should have data inserted as text)

                  // Close (plugin only) & finish:
                  (isWebSql) ? done() : db.close(done, done);
                });

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

        it(suiteName + 'executeSql parameter as "boolean" true/false values, with id INTEGER PRIMARY KEY AUTOINCREMENT [DEVIATION: stringified in both Web SQL & plugin]', function(done) {
          var db = openDatabase("true-false-with-id-autoincrement.db", "1.0", "Demo", DEFAULT_SIZE);

          db.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS test_table');
            // create columns with no type affinity
            tx.executeSql('CREATE TABLE IF NOT EXISTS test_table (id INTEGER PRIMARY KEY AUTOINCREMENT, data1, data2, data3)', [], function(ignored1, ignored2) {
              tx.executeSql('INSERT INTO test_table (data1, data2, data3) VALUES (?,?,?)',
                            [true, false, 123], function(tx, rs1) {
                expect(rs1).toBeDefined();
                expect(rs1.rowsAffected).toBe(1);

                tx.executeSql('SELECT * FROM test_table', [], function(tx, rs2) {
                  expect(rs2.rows.length).toBe(1);
                  expect(rs2.rows.item(0)).toBeDefined();
                  // Full object check:
                  expect(rs2.rows.item(0)).toEqual({id: 1, data1: 'true', data2: 'false', data3: 123});
                  // Individual object members:
                  expect(rs2.rows.item(0).id).toBe(1);
                  expect(rs2.rows.item(0).data1).toBe('true');
                  expect(rs2.rows.item(0).data2).toBe('false');
                  expect(rs2.rows.item(0).data3).toBe(123);

                  // Close (plugin only) & finish:
                  (isWebSql) ? done() : db.close(done, done);
                });
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

      describe(scenarioList[i] + ': additional tx column value binding test(s)', function() {

        // FUTURE TODO: fix these tests to follow the Jasmine style:

        it(suiteName + ' stores [Unicode] string with \\u0000 correctly', function (done) {
          if (isWindows) pending('BROKEN on Windows'); // XXX
          if (isWP8) pending('BROKEN for WP(8)'); // [BUG #202] UNICODE characters not working with WP(8)
          if (isAndroid && !isWebSql && !isImpl2) pending('BROKEN for Android (default sqlite-connector version)'); // XXX

          var dbName = 'Store-UNICODE-string-with-u0000.db';
          var db = openDatabase(dbName, "1.0", "Demo", DEFAULT_SIZE);

          db.transaction(function (tx) {
            tx.executeSql('DROP TABLE IF EXISTS test', [], function () {
              tx.executeSql('CREATE TABLE test (name, id)', [], function() {
                tx.executeSql('INSERT INTO test VALUES (?, "id1")', ['\u0000bla'], function () {
                  tx.executeSql('SELECT hex(name) AS hexvalue FROM test', [], function (tx, res) {
                    // select hex() because even the native database doesn't
                    // give the full string. it's a bug in WebKit apparently
                    expect(res.rows.item(0).hexvalue).toBeDefined();
                    var hexValue = res.rows.item(0).hexvalue;
                    var hexLength = hexValue.length;

                    // varies between Chrome-like (UTF-8)
                    // and Safari-like (UTF-16)
                    expect(['000062006C006100', '00626C61']).toContain(hexValue);

                    // ensure this matches our expectation of that database's
                    // default encoding
                    tx.executeSql("SELECT hex('blah') AS hexvalue", [], function (tx, res) {
                      // expect same length, i.e. same global db encoding
                      expect(res.rows.item(0).hexvalue).toBeDefined();
                      expect(res.rows.item(0).hexvalue.length).toBe(hexLength);

                      checkCorrectOrderingAndFinish(tx, done);
                    });
                  })
                });
              });
            });
          }, function(error) {
            // NOT EXPECTED:
            expect(false).toBe(true);
            expect(error.message).toBe('--');
            done();
          });
        });

        function checkCorrectOrderingAndFinish(tx, done) {
          var least = "54key3\u0000\u0000";
          var most = "54key3\u00006\u0000\u0000";
          var key1 = "54key3\u00004baz\u000031\u0000\u0000";
          var key2 = "54key3\u00004bla\u000031\u0000\u0000";

          tx.executeSql('INSERT INTO test VALUES (?, "id2")', [key1], function () {
            tx.executeSql('INSERT INTO test VALUES (?, "id3")', [key2], function () {
              var sql = 'SELECT id FROM test WHERE name > ? AND name < ? ORDER BY name';
              tx.executeSql(sql, [least, most], function (tx, res) {
                // should get two results
                expect(res.rows.length).toBe(2);
                // correct ordering
                expect(res.rows.item(0).id).toBe('id2');
                expect(res.rows.item(1).id).toBe('id3');

                done();
              });
            });
          });
        }

        it(suiteName + ' Retrieve [Unicode] string with \\u0000 correctly', function (done) {
          if (isWindows) pending('BROKEN on Windows'); // XXX
          if (isWP8) pending('BROKEN for WP(8)'); // [BUG #202] UNICODE characters not working with WP(8)

          var dbName = 'Retrieve-UNICODE-string-with-u0000.db';
          var db = openDatabase(dbName, "1.0", "Demo", DEFAULT_SIZE);

          db.transaction(function (tx) {
            tx.executeSql('DROP TABLE IF EXISTS test', [], function () {
              tx.executeSql('CREATE TABLE test (name, id)', [], function() {
                tx.executeSql('INSERT INTO test VALUES (?, "id1")', ['\u0000bla'], function () {
                  tx.executeSql('SELECT name FROM test', [], function (tx, res) {
                    expect(res.rows.item(0).name).toBeDefined();
                    var name = res.rows.item(0).name;

                    // There is a bug in WebKit and Chromium where strings are created
                    // using methods that rely on '\0' for termination instead of
                    // the specified byte length.
                    //
                    // https://bugs.webkit.org/show_bug.cgi?id=137637
                    //
                    // For now we expect this test to fail there, but when it is fixed
                    // we would like to know, so the test is coded to fail if it starts
                    // working there.
                    if (isWebSql) {
                      if (name.length !== 0)
                        expect('WebKit Web SQL behavior changed, please update this test').toBe('--');

                      // STOP here (for now):
                      return done();
                    }

                    // EXPECTED correct result for plugin:
                    expect(name.length).toBe(4);
                    expect(name).toBe('\u0000bla');
                    done();
                  })
                });
              });
            });
          }, function(error) {
            // NOT EXPECTED:
            expect(false).toBe(true);
            expect(error.message).toBe('--');
            done();
          });
        });

      });

    });
  }

}

if (window.hasBrowser) mytests();
else exports.defineAutoTests = mytests;

/* vim: set expandtab : */
