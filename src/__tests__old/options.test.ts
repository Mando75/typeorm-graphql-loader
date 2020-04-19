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

  describe("selectFields", () => {
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
  });

  describe("order", () => {
    it("applies asc order correctly", async () => {
      const logsPromise = connection
        .getRepository(ErrorLog)
        .createQueryBuilder()
        .orderBy({ id: "ASC" })
        .getMany();
      const resultPromise = graphql(
        schema,
        `
          {
            orderById(order: "ASC") {
              id
              code
            }
          }
        `,
        {},
        { loader }
      );
      const [logs, result] = await Promise.all([logsPromise, resultPromise]);

      const expected = logs.map((log: ErrorLog) => ({
        id: log.id.toString(),
        code: log.code
      }));
      expect(result).to.not.have.key("errors");
      expect(result.data!.orderById).to.deep.equal(expected);
    });

    it("applies desc order correctly", async () => {
      const logsPromise = connection
        .getRepository(ErrorLog)
        .createQueryBuilder()
        .orderBy({ id: "DESC" })
        .getMany();
      const resultPromise = graphql(
        schema,
        `
          {
            orderById(order: "DESC") {
              id
              code
            }
          }
        `,
        {},
        { loader }
      );
      const [logs, result] = await Promise.all([logsPromise, resultPromise]);

      const expected = logs.map((log: ErrorLog) => ({
        id: log.id.toString(),
        code: log.code
      }));
      expect(result).to.not.have.key("errors");
      expect(result.data!.orderById).to.deep.equal(expected);
    });
  });

  describe("orWhere", () => {
    it("can apply an orWhere condition", async () => {
      const resultP = graphql(
        schema,
        `
          {
            orWhereIdIsOne(id: 2) {
              id
            }
          }
        `,
        {},
        { loader }
      );
      const logsP = connection
        .getRepository(ErrorLog)
        .createQueryBuilder("log")
        .where({ id: 2 })
        .orWhere("log.id = 1")
        .getMany();
      const [logs, result] = await Promise.all([logsP, resultP]);
      const expected = logs.map(log => ({ id: log.id.toString() }));
      expect(result).to.not.have.key("errors");
      expect(result.data!.orWhereIdIsOne).to.deep.equal(expected);
    });
  });
});
