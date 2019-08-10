import { expect } from "chai";
import { Connection, createConnection } from "typeorm";
import { GraphQLDatabaseLoader, LoaderNamingStrategyEnum } from "../src";

import { seedDatabase } from "./common/seed";
import { Post } from "./entity/Post";
import { User } from "./entity/User";

let connection: Connection;
let Posts: Post[], Users: User[];

describe("Custom Naming strategy", () => {
  const snakeAlias = "test_alias";
  const snakeField = "test_field";
  const snakeAliasField = "test_alias_test_field";
  const camelAlias = "testAlias";
  const camelField = "testField";
  const camelAliasField = "testAliasTestField";
  const titleAlias = "TestAlias";
  const titleField = "TestField";

  before(async () => {
    connection = await createConnection({
      name: "util",
      type: "sqlite",
      database: "test_util.sqlite3",
      synchronize: true,
      dropSchema: true,
      entities: [Post, User],
      logging: false
    });

    await seedDatabase(connection);

    Users = await connection.getRepository(User).find({ relations: ["posts"] });
    Posts = await connection.getRepository(Post).find({ relations: ["owner"] });
  });

  it("returns back a properly formatted camelCase field for snakecase", () => {
    const loader = new GraphQLDatabaseLoader(connection, {
      namingStrategy: LoaderNamingStrategyEnum.CAMELCASE
    });
    expect(loader["namingStrategy"](snakeAlias, snakeField)).to.equal(
      camelAliasField
    );
  });

  it("returns back a properly formatted camelCase field for titlecase", () => {
    const loader = new GraphQLDatabaseLoader(connection, {
      namingStrategy: LoaderNamingStrategyEnum.CAMELCASE
    });
    expect(loader["namingStrategy"](titleAlias, titleField)).to.equal(
      camelAliasField
    );
  });

  it("returns back a properly formatted snake_case field for TitleCase", () => {
    const loader = new GraphQLDatabaseLoader(connection, {
      namingStrategy: LoaderNamingStrategyEnum.SNAKECASE
    });
    expect(loader["namingStrategy"](titleAlias, titleField)).to.equal(
      snakeAliasField
    );
  });

  it("returns back a properly formatted snake_case field for camelcase", () => {
    const loader = new GraphQLDatabaseLoader(connection, {
      namingStrategy: LoaderNamingStrategyEnum.SNAKECASE
    });
    expect(loader["namingStrategy"](camelAlias, camelField)).to.equal(
      snakeAliasField
    );
  });
});
