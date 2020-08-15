import { Author, Book, Publisher, Review } from "../entity";
import resolvers from "../resolvers";
import { Connection, createConnection } from "typeorm";
import { Seeder } from "./Seeder";
import { GraphQLDatabaseLoader } from "../../GraphQLDatabaseLoader";
import { LoaderOptions } from "../../types";
import { buildSchema } from "type-graphql";
import { GraphQLSchema, printSchema } from "graphql";
import * as fs from "fs";
import {DecoratorTest} from "../entity/DecoratorTest";

export interface TestHelpers {
  schema: GraphQLSchema;
  loader: GraphQLDatabaseLoader;
  connection: Connection;
}

export interface StartupOptions {
  loaderOptions?: LoaderOptions;
  logging?: boolean;
}

export async function startup(
  testName: string,
  options?: StartupOptions
): Promise<TestHelpers> {
  const connection = await createConnection({
    name: testName,
    type: "sqlite",
    database: `test_${testName}.sqlite3`,
    synchronize: true,
    dropSchema: true,
    entities: [Author, Book, Publisher, Review, DecoratorTest],
    logging: !!options?.logging
  });

  const seeder = new Seeder(connection);
  await seeder.seed();

  const loader = new GraphQLDatabaseLoader(connection, options?.loaderOptions);
  const schema = await buildSchema({ resolvers });

  fs.writeFile("testSchema.graphql", printSchema(schema), err => {
    if (err) {
      console.error(err);
    }
  });

  return { schema, loader, connection };
}
