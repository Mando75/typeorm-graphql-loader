import { Connection, createConnection } from "typeorm";
import { GraphQLDatabaseLoader, LoaderNamingStrategyEnum } from "../src";
import { seedDatabase } from "./common/seed";
import { GraphQLSchema, graphql } from "graphql";
import { Post } from "./entity/Post";
import { User } from "./entity/User";
import { SnakeNamingStrategy } from "./common/snakeCaseNaming";
import { builder } from "./schema";
import * as chai from "chai";
const deepEqualInAnyOrder = require("deep-equal-in-any-order");

chai.use(deepEqualInAnyOrder);
const { expect } = chai;

let connection: Connection;
let Posts: Post[], Users: User[];

describe("Custom Naming strategy", () => {
  let schema: GraphQLSchema;
  let loader: GraphQLDatabaseLoader;
  let user: User;

  before(async () => {
    connection = await createConnection({
      name: "naming",
      type: "sqlite",
      database: "test_naming.sqlite3",
      synchronize: true,
      dropSchema: true,
      entities: [Post, User],
      logging: false,
      namingStrategy: new SnakeNamingStrategy()
    });

    await seedDatabase(connection);

    Users = await connection.getRepository(User).find({
      relations: ["posts"]
    });
    Posts = await connection.getRepository(Post).find({ relations: ["owner"] });

    user = Users[0];

    schema = builder.build();
    loader = new GraphQLDatabaseLoader(connection, {
      namingStrategy: LoaderNamingStrategyEnum.SNAKECASE
    });
  });

  it("can perform a basic query with snakecase", async () => {
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

  it("can perform a complex nested query with snakecase", async () => {
    const result = await graphql(
      schema,
      `{ user(id: ${user.id}){ id email firstName lastName age posts { id title content camelizedField } } }`,
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
            content: p.content,
            camelizedField: p.camelizedField
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
