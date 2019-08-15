import { Connection, createConnection } from "typeorm";
import { GraphQLDatabaseLoader, LoaderNamingStrategyEnum } from "../src";
import { seedDatabase } from "./common/seed";
import { GraphQLSchema, graphql } from "graphql";
import { Post } from "./entity/Post";
import { User } from "./entity/User";
import { builder } from "./schema";
import * as chai from "chai";
import { LoaderSearchMethod } from "../src/base";
const deepEqualInAnyOrder = require("deep-equal-in-any-order");

chai.use(deepEqualInAnyOrder);
const { expect } = chai;

let connection: Connection;
let Posts: Post[], user: User;

describe("searching", () => {
  let schema: GraphQLSchema;
  let loader: GraphQLDatabaseLoader;

  const TEST_USER_EMAIL = "testingsearchemail@testingsearch.com";
  const TEST_USER_FIRST_NAME = "testingSearchFirstName";
  const TEST_USER_LAST_NAME = "testingSearchLastName";

  before(async () => {
    connection = await createConnection({
      name: "search",
      type: "sqlite",
      database: "test_search.sqlite3",
      synchronize: true,
      dropSchema: true,
      entities: [Post, User],
      logging: true
    });

    await seedDatabase(connection);

    user = await connection.getRepository(User).create({
      email: TEST_USER_EMAIL,
      firstName: TEST_USER_FIRST_NAME,
      lastName: TEST_USER_LAST_NAME,
      age: 23
    });
    user = await connection.createEntityManager().save(user);

    schema = builder.build();
    loader = new GraphQLDatabaseLoader(connection);
  });

  it("can perform an any position case sensitive first name search query on user", async () => {
    const result = await graphql(
      schema,
      `
        {
          userWithSensitiveSearch(search: "${TEST_USER_FIRST_NAME.slice(
            1,
            10
          )}", method: ${LoaderSearchMethod.ANY_POSITION}) {
            id
            email
            firstName
            lastName
          }
        }
      `,
      {},
      {
        loader
      }
    );

    const expected = {
      id: user.id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    };
    expect(result).to.not.have.key("errors");
    expect(result.data!.userWithSensitiveSearch).to.deep.equal(expected);
  });

  it("can perform an any position case insensitive first name search query on user", async () => {
    const result = await graphql(
      schema,
      `
        {
          userWithInSensitiveSearch(search: "${TEST_USER_FIRST_NAME.slice(
            1,
            10
          )}", method: ${LoaderSearchMethod.ANY_POSITION}) {
            id
            email
            firstName
            lastName
          }
        }
      `,
      {},
      {
        loader
      }
    );

    const expected = {
      id: user.id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    };
    expect(result).to.not.have.key("errors");
    expect(result.data!.userWithInSensitiveSearch).to.deep.equal(expected);
  });

  it("can perform a starts with case sensitive first name search query on user", async () => {
    const result = await graphql(
      schema,
      `
        {
          userWithSensitiveSearch(search: "${TEST_USER_FIRST_NAME.slice(
            0,
            10
          )}", method: ${LoaderSearchMethod.STARTS_WITH}) {
            id
            email
            firstName
            lastName
          }
        }
      `,
      {},
      {
        loader
      }
    );

    const expected = {
      id: user.id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    };
    expect(result).to.not.have.key("errors");
    expect(result.data!.userWithSensitiveSearch).to.deep.equal(expected);
  });

  it("can perform a starts with case insensitive first name search query on user", async () => {
    const result = await graphql(
      schema,
      `
        {
          userWithInSensitiveSearch(search: "${TEST_USER_FIRST_NAME.slice(
            0,
            10
          )}", method: ${LoaderSearchMethod.STARTS_WITH}) {
            id
            email
            firstName
            lastName
          }
        }
      `,
      {},
      {
        loader
      }
    );

    const expected = {
      id: user.id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    };
    expect(result).to.not.have.key("errors");
    expect(result.data!.userWithInSensitiveSearch).to.deep.equal(expected);
  });

  it("can perform an ends with case sensitive first name search query on user", async () => {
    const result = await graphql(
      schema,
      `
        {
          userWithSensitiveSearch(search: "${TEST_USER_FIRST_NAME.slice(
            10,
            TEST_USER_FIRST_NAME.length
          )}", method: ${LoaderSearchMethod.ENDS_WITH}) {
            id
            email
            firstName
            lastName
          }
        }
      `,
      {},
      {
        loader
      }
    );

    const expected = {
      id: user.id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    };
    expect(result).to.not.have.key("errors");
    expect(result.data!.userWithSensitiveSearch).to.deep.equal(expected);
  });

  it("can perform an ends with case insensitive first name search query on user", async () => {
    const result = await graphql(
      schema,
      `
        {
          userWithInSensitiveSearch(search: "${TEST_USER_FIRST_NAME.slice(
            10,
            TEST_USER_FIRST_NAME.length
          )}", method: ${LoaderSearchMethod.ENDS_WITH}) {
            id
            email
            firstName
            lastName
          }
        }
      `,
      {},
      {
        loader
      }
    );

    const expected = {
      id: user.id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    };
    expect(result).to.not.have.key("errors");
    expect(result.data!.userWithInSensitiveSearch).to.deep.equal(expected);
  });
});
