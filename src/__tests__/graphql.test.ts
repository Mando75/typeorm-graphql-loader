import * as chai from "chai";
import { graphql, GraphQLSchema } from "graphql";
import { Connection, createConnection, getConnectionOptions } from "typeorm";
import { LoaderNamingStrategyEnum } from "../";
import { GraphQLDatabaseLoader } from "../chaining";

import { seedDatabase } from "./common/seed";
import { Post } from "./entity/Post";
import { User } from "./entity/User";
import { ErrorLog } from "./entity/ErrorLog";
import { builder } from "./schema";
const deepEqualInAnyOrder = require("deep-equal-in-any-order");

let connection: Connection;
let Posts: Post[], Users: User[], user: User;

chai.use(deepEqualInAnyOrder);

const { expect } = chai;

describe("GraphQL API", function() {
  let schema: GraphQLSchema;
  let loader: GraphQLDatabaseLoader;

  before(async () => {
    connection = await createConnection({
      name: "graphql",
      type: "sqlite",
      database: "test_graphql.sqlite3",
      synchronize: true,
      dropSchema: true,
      entities: [Post, User, ErrorLog],
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

  it("can load a single entity with nested relations via the loader api", async () => {
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

  it("can make a simple query for multiple records", async () => {
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

  it("can make a simple query for multiple records and subrecords", async () => {
    // const loader = new GraphQLDatabaseLoader(connection);
    const result = await graphql(
      schema,
      "{ users { id email firstName lastName age posts { id title content } } }",
      {},
      {
        loader
      }
    );

    const expected = {
      users: Users.map(({ id, firstName, lastName, email, age, posts }) => ({
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
      }))
    };

    expect(result.errors || []).to.deep.equal([]);
    expect(result).to.not.have.key("errors");
    expect(result.data).to.deep.equal(expected);
  });

  it("can batch multiple queries", async () => {
    // Best way to look for caching is to enable logging and view
    // the db queries called
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
    const userData = {
      data: {
        users: Users.map(({ id }) => ({ id: id.toString() }))
      }
    };

    const postData = {
      data: {
        posts: Posts.map(({ id, owner }) => ({
          id: id.toString(),
          owner: { id: owner.id.toString() }
        }))
      }
    };
    const expected = [userData, userData, postData, postData];
    for (let result of results) {
      expect(result.errors || []).to.deep.equal([]);
      expect(result).to.not.have.key("errors");
    }
    expect(results).to.deep.equal(expected);
  });

  it("can handle fragments", async () => {
    const result = await graphql(
      schema,
      `
        query users {
          users {
            ...userFragment
            posts {
              ...postFragment
            }
          }
        }
        fragment postFragment on Post {
          id
          title
        }
        fragment userFragment on User {
          id
          firstName
        }
      `,
      {},
      { loader }
    );

    expect(result.errors || []).to.deep.equal([]);
    expect(result).to.not.have.key("errors");
    expect(result.data).to.deep.equal({
      users: Users.map(({ id, firstName, posts }) => ({
        id: id.toString(),
        firstName,
        posts: posts.map(({ id, title }) => ({ id: id.toString(), title }))
      }))
    });
  });
});
