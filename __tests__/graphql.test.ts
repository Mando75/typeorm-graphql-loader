import * as chai from "chai";
import { graphql, GraphQLSchema } from "graphql";
import { Connection, createConnection } from "typeorm";
import { GraphQLDatabaseLoader, LoaderNamingStrategyEnum } from "../src";

import { seedDatabase } from "./common/seed";
import { Post } from "./entity/Post";
import { User } from "./entity/User";
import { builder } from "./schema";
const deepEqualInAnyOrder = require("deep-equal-in-any-order");

let connection: Connection;
let Posts: Post[], Users: User[], user: User;

chai.use(deepEqualInAnyOrder);

const { expect } = chai;

describe("GraphQL resolvers", function() {
  let schema: GraphQLSchema;
  let loader: GraphQLDatabaseLoader;

  before(async () => {
    connection = await createConnection({
      name: "graphql",
      type: "sqlite",
      database: "test_graphql.sqlite3",
      synchronize: true,
      dropSchema: true,
      entities: [Post, User],
      logging: true
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

  it("can make a simple query", async () => {
    // const loader = new GraphQLDatabaseLoader(connection);
    const result = await graphql(
      schema,
      "{ users { id } }",
      {},
      {
        loader
      }
    );
    expect(result.errors || []).to.deep.equal([]);
    expect(result).to.not.have.key("errors");
    expect(result.data).to.deep.equal({
      users: Users.map(({ id }) => ({ id: id.toString() }))
    });
  });

  it("can batch multiple queries", async () => {
    const results = await Promise.all([
      graphql(
        schema,
        "{ users { id } }",
        {},
        {
          loader
        }
      ),
      graphql(
        schema,
        "{ posts { id, owner { id } } }",
        {},
        {
          loader
        }
      )
    ]);
    const expected = [
      {
        data: {
          users: Users.map(({ id }) => ({ id: id.toString() }))
        }
      },
      {
        data: {
          posts: Posts.map(({ id, owner }) => ({
            id: id.toString(),
            owner: { id: owner.id.toString() }
          }))
        }
      }
    ];
    for (let result of results) {
      expect(result.errors || []).to.deep.equal([]);
      expect(result).to.not.have.key("errors");
    }
    expect(results).to.deep.equal(expected);
  });

  it("can load a single entity with nested relations", async () => {
    const result = await graphql(
      schema,
      `{ user(id: ${user.id}){ id email firstName lastName age posts { id title content } } }`,
      {},
      {
        loader
      }
    );

    const { id, firstName, email, lastName, age, posts } = user;
    const expected = {
      data: {
        user: {
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
});
