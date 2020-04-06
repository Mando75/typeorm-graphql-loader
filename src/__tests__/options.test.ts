import { Connection, createConnection } from "typeorm";
import { GraphQLDatabaseLoader } from "../GraphQLDatabaseLoader";
import { seedDatabase } from "./common/seed";
import { GraphQLSchema, graphql } from "graphql";
import { Post } from "./entity/Post";
import { User } from "./entity/User";
import { ErrorLog } from "./entity/ErrorLog";
import { builder } from "./schema";
import * as chai from "chai";
const deepEqualInAnyOrder = require("deep-equal-in-any-order");

chai.use(deepEqualInAnyOrder);
const { expect } = chai;

let connection: Connection;
let Log: ErrorLog;

describe("options", () => {
  let schema: GraphQLSchema;
  let loader: GraphQLDatabaseLoader;

  before(async () => {
    connection = await createConnection({
      name: "options",
      type: "sqlite",
      database: "test_options.sqlite3",
      synchronize: true,
      dropSchema: true,
      entities: [Post, User, ErrorLog],
      logging: false
    });

    await seedDatabase(connection);

    Log = (await connection.getRepository(ErrorLog).findOne()) as ErrorLog;

    schema = builder.build();
    loader = new GraphQLDatabaseLoader(connection);
  });

  it("applies selectFields correctly", async () => {
    const result = await graphql(
      schema,
      `
        {
          requiredSelectFields(useSelectFields: true) {
            id
            combinedCodeAndMessage
          }
        }
      `,
      {},
      { loader }
    );

    const expected = {
      id: Log.id.toString(),
      combinedCodeAndMessage: Log.combinedCodeAndMessage()
    };
    expect(result).to.not.have.key("errors");
    expect(result.data!.requiredSelectFields).to.deep.equal(expected);
  });

  it("is only selecting the fields it can find in the query", async () => {
    const result = await graphql(
      schema,
      `
        {
          requiredSelectFields(useSelectFields: false) {
            id
            combinedCodeAndMessage
          }
        }
      `,
      {},
      { loader }
    );

    const expected = {
      id: Log.id.toString(),
      combinedCodeAndMessage: null
    };
    expect(result).to.not.have.key("errors");
    expect(result.data!.requiredSelectFields).to.deep.equal(expected);
  });

  it("applies SQL ordering correctly", () => {});
});
