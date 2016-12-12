#include "Winerror.h"

#include "Database.h"
#include "Statement.h"

extern "C" {
#include "cencode.h"
}
#include <string.h>
#include <stdint.h>
static void base64_udf(sqlite3_context * context, int argc, sqlite3_value ** argv) {
  // TODO check argc

  sqlite3_value * arg = argv[0];
  const uint8_t * inblob = (const uint8_t *)sqlite3_value_blob(arg);
  size_t inlen = sqlite3_value_bytes(arg);

  // TBD ???:
  //char * out = sqlite3_malloc(inlen * 2);
  //char * out = sqlite3_malloc(1000);

  //sprintf(out, "GOT LENGTH: %d", inlen);

  char * out = (char *)sqlite3_malloc(inlen * 2);

  base64_encodestate es;
  base64_init_encodestate(&es);

  base64_encode_block((const char *)inblob, inlen, out, &es);

  sqlite3_result_text(context, out, strlen(out), sqlite3_free);
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
    sqlite3_create_function(sqlite, "base64", 1, SQLITE_BLOB, NULL, base64_udf, NULL, NULL);
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
