import { LoaderOptions } from "./types";
import { Connection } from "typeorm";
import { GraphQLQueryBuilder } from "./GraphQLQueryBuilder";
import { GraphQLQueryManager } from "./GraphQLQueryManager";

export class GraphQLDatabaseLoader {
  private readonly _queryManager: GraphQLQueryManager;

  constructor(connection: Connection, options: LoaderOptions = {}) {
    this._queryManager = new GraphQLQueryManager(connection, options);
  }

  public loadEntity(entity: Function | string): GraphQLQueryBuilder {
    return new GraphQLQueryBuilder(this._queryManager, entity);
  }
}
