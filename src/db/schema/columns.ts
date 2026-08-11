import { sql } from "drizzle-orm";
import { datetime, varchar } from "drizzle-orm/mysql-core";

export function uuidColumn<TName extends string>(name: TName) {
  return varchar(name, { length: 36 });
}

export function uuidPrimaryColumn<TName extends string>(name: TName) {
  return varchar(name, { length: 36 }).$defaultFn(() => crypto.randomUUID());
}

export function momentColumn<TName extends string>(name: TName) {
  return datetime(name, { mode: "date", fsp: 3 });
}

export function defaultMomentColumn<TName extends string>(name: TName) {
  return momentColumn(name).default(sql`CURRENT_TIMESTAMP(3)`);
}
