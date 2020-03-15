import * as chai from "chai";
import { graphql, GraphQLSchema } from "graphql";
import { Connection, createConnection } from "typeorm";
import { GraphQLDatabaseLoader } from "../";

import { seedDatabase } from "./common/seed";
import { User } from "./entity/User";
import { Post } from "./entity/Post";
import { ErrorLog } from "./entity/ErrorLog";

import { builder } from "./schema";
import { LoaderNamingStrategyEnum } from "..";

const deepEqualInAnyOrder = require("deep-equal-in-any-order");
chai.use(deepEqualInAnyOrder);
const { expect } = chai;

let connection: Connection;
let Posts: Post[], Users: User[], user: User, ErrorLogs: ErrorLog[];

describe("loader error handling", () => {
  let schema: GraphQLSchema;
  let loader: GraphQLDatabaseLoader;

  before(async () => {
    connection = await createConnection({
      name: "error_handling",
      type: "sqlite",
      database: "test_error_handling.sqlite3",
      synchronize: true,
      dropSchema: true,
      entities: [Post, User, ErrorLog],
      logging: false
    });

    await seedDatabase(connection);

    Users = await connection.getRepository(User).find({ relations: ["posts"] });
    Posts = await connection.getRepository(Post).find({ relations: ["owner"] });
    ErrorLogs = await connection
      .getRepository(ErrorLog)
      .find({ relations: ["user"] });
    schema = builder.build();
    loader = new GraphQLDatabaseLoader(connection, {
      namingStrategy: LoaderNamingStrategyEnum.CAMELCASE
    });
  });

  it("throws an error when info is not provided", async () => {
    const result = await graphql(
      schema,
      `
        {
          logWithoutInfo {
            id
            message
            code
          }
        }
      `,
      {},
      {
        loader
      }
    );
    expect(result.errors?.[0]?.message).to.eq(
      "Missing GraphQL Resolve info. Please invoke `.info()` before calling this method"
    );
  });

  it("throws an error when pagination is not provided", async () => {
    const result = await graphql(
      schema,
      `
        {
          paginationWithoutOptions {
            id
            message
            code
          }
        }
      `,
      {},
      {
        loader
      }
    );
    expect(result.errors?.[0]?.message).to.eq(
      "Must provide pagination object before calling load paginated"
    );
  });
});
