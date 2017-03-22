#include "Winerror.h"

#include "Database.h"
#include "Statement.h"

#include <string>
#include <codecvt>

namespace SQLite3
{
  Database::Database(Platform::String^ dbPath)
    : sqlite(nullptr)
  {
#if 1
    int ret = sqlite3_open16(dbPath->Data(), &sqlite);
#else
    // THANKS FOR GUIDANCE (example):
    // http://en.cppreference.com/w/cpp/locale/wstring_convert/to_bytes
    std::wstring_convert<std::codecvt_utf8<wchar_t>> myconv;

    // NOTE: This is done to open a database with UTF-8 internal encoding
    // ref: litehelpers/Cordova-sqlite-storage#652
    const char * dbName =
      myconv.to_bytes(dbPath->Data()).c_str();

    int ret = sqlite3_open(dbName, &sqlite);
#endif

    if (ret != SQLITE_OK)
    {
      sqlite3_close(sqlite);

      HRESULT hresult = MAKE_HRESULT(SEVERITY_ERROR, FACILITY_ITF, ret);
      throw ref new Platform::COMException(hresult);
    }
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
