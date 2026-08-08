const { exec } = require("node:child_process");

function checkPostgres() {
  exec(
    "docker exec okaikei_database pg_isready --host localhost",
    handleReturn,
  );

  function handleReturn(error, stdout) {
    if (stdout.search("accepting connections") === -1) {
      //console.log('⏳ PostgreSQL is not ready yet, retrying in 2 seconds...');
      process.stdout.write(".");
      checkPostgres();
      return;
    }
    console.log("✅ PostgreSQL is ready!");
  }
}

process.stdout.write("⏳ Waiting for PostgreSQL to be ready");
checkPostgres();
