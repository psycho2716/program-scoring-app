import mysql from "mysql2/promise";
import { env } from "../config/env";

export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
});

export type DbRow = mysql.RowDataPacket;
export type DbResult = mysql.ResultSetHeader;
