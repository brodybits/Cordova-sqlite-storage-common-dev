#include "Winerror.h"

#include "Database.h"
#include "Statement.h"

extern "C" {
#include <regex.h>
}

// http://stackoverflow.com/questions/6288287/sqlite-in-c-and-supporting-regexp/15529331#15529331
void sqlite_regexp(sqlite3_context* context, int argc, sqlite3_value** values) {
    int ret;
    regex_t regex;
    char* reg = (char*)sqlite3_value_text(values[0]);
    char* text = (char*)sqlite3_value_text(values[1]);

    if ( argc != 2 || reg == 0 || text == 0) {
        sqlite3_result_error(context, "SQL function regexp() called with invalid arguments.\n", -1);
        return;
    }

    ret = regcomp(&regex, reg, REG_EXTENDED | REG_NOSUB);
    if ( ret != 0 ) {
        sqlite3_result_error(context, "error compiling regular expression", -1);
        return;
    }

    ret = regexec(&regex, text , 0, NULL, 0);
    regfree(&regex);

    sqlite3_result_int(context, (ret != REG_NOMATCH));
}

namespace SQLite3
{
  Database::Database(Platform::String^ dbPath)
    : sqlite(nullptr)
  {
    int ret = sqlite3_open16(dbPath->Data(), &sqlite);

    if (ret != SQLITE_OK)
    {
      sqlite3_close(sqlite);

      HRESULT hresult = MAKE_HRESULT(SEVERITY_ERROR, FACILITY_ITF, ret);
      throw ref new Platform::COMException(hresult);
    }
    // http://stackoverflow.com/questions/6288287/sqlite-in-c-and-supporting-regexp/15529331#15529331
    sqlite3_create_function(sqlite, "regexp", 2, SQLITE_ANY,0, &sqlite_regexp,0,0);
  }

  Database::~Database()
  {
    if (sqlite != nullptr) sqlite3_close(sqlite);
  }

  Statement^ Database::Prepare(Platform::String^ sql)
  {
    return ref new Statement(this, sql);
  }

  int Database::closedb()
  {
    int rc = sqlite3_close(sqlite);
	if (rc == SQLITE_OK) sqlite = nullptr;
	return rc;
  }

  int Database::close_v2()
  {
    int rc = sqlite3_close_v2(sqlite);
	if (rc == SQLITE_OK) sqlite = nullptr;
	return rc;
  }

  int Database::LastInsertRowid()
  {
    return sqlite3_last_insert_rowid(sqlite);
  }

  int Database::TotalChanges()
  {
    return sqlite3_total_changes(sqlite);
  }
}
