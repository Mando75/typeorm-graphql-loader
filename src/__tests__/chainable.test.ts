import * as chai from "chai";
import { graphql, GraphQLSchema } from "graphql";
import { Connection, createConnection, getConnectionOptions } from "typeorm";
import { LoaderNamingStrategyEnum } from "../";
import { GraphQLDatabaseLoader } from "../chaining";

import { seedDatabase } from "./common/seed";
import { Post } from "./entity/Post";
import { User } from "./entity/User";
import { builder } from "./schema";
const deepEqualInAnyOrder = require("deep-equal-in-any-order");

let connection: Connection;
let Posts: Post[], Users: User[], user: User;

chai.use(deepEqualInAnyOrder);

const { expect } = chai;

describe("Chainable API", function() {
  let schema: GraphQLSchema;
  let loader: GraphQLDatabaseLoader;

  before(async () => {
    connection = await createConnection({
      name: "chainable",
      type: "sqlite",
      database: "test_chainable.sqlite3",
      synchronize: true,
      dropSchema: true,
      entities: [Post, User],
      logging: false
    });

    await seedDatabase(connection);

    Users = await connection.getRepository(User).find({
      relations: ["posts"]
    });
    Posts = await connection.getRepository(Post).find({ relations: ["owner"] });

    user = Users[0];

    schema = builder.build();
    loader = new GraphQLDatabaseLoader(connection, {
      namingStrategy: LoaderNamingStrategyEnum.CAMELCASE
    });
  });

  it("can load a single entity with nested relations via the chainable api", async () => {
    const result = await graphql(
      schema,
      `{ chainableUser(id: ${user.id}){ id email firstName lastName age posts { id title content } } }`,
      {},
      {
        chainable: loader
      }
    );

    const { id, firstName, email, lastName, age, posts } = user;
    const expected = {
      data: {
        chainableUser: {
          id: id.toString(),
          firstName,
          lastName,
          email,
          age,
          posts: posts.map(p => ({
            id: p.id.toString(),
            title: p.title,
            content: p.content
          }))
        }
      }
    };

    expect(result.errors || []).to.deep.equal([]);
    expect(result).to.not.have.key("errors");
    //@ts-ignore
    expect(result).to.deep.equalInAnyOrder(expected);
  });

  it("can make a simple query", async () => {
    // const loader = new GraphQLDatabaseLoader(connection);
    const result = await graphql(
      schema,
      "{ chainableUsers { id } }",
      {},
      {
        chainable: loader
      }
    );
    expect(result.errors || []).to.deep.equal([]);
    expect(result).to.not.have.key("errors");
    expect(result.data).to.deep.equal({
      chainableUsers: Users.map(({ id }) => ({ id: id.toString() }))
    });
  });
});
