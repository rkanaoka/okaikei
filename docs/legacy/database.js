import { Client } from "pg";

async function query(queryObject) {
  let client;
  //console.log("DB: " + process.env.POSTGRES_DB);
  //console.log("USER: " + process.env.POSTGRES_USER);
  //console.log("PASSWORD: " + process.env.POSTGRES_PASSWORD);

  try {
    client = await getNewClient();
    const result = await client.query(queryObject);
    return result;
  } catch (error) {
    console.error("Database query error: ", error);
    throw error;
  } finally {
    await client.end();
  }
}

async function getNewClient() {
  const client = new Client({
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    ssl: getSSLValues(),
  });
  await client.connect();
  return client;
}

function getSSLValues() {
  if (process.env.POSTGRES_CA) {
    return {
      ca: process.env.POSTGRES_CA,
    };
  }
  return process.env.NODE_ENV === "production" ? true : false;
}

export default {
  query: query,
  getNewClient: getNewClient,
};

//docker compose -f infra/compose.yaml up -d
//docker ps -a
//docker logs <container_id>
//docker compose -f infra/compose.yaml down
//psql -U postgres -h localhost -p 5432 -d postgres
