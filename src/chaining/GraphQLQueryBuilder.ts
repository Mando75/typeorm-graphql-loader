import { GraphQLResolveInfo } from "graphql";
import { ChainableWhereArgument } from "../types";
import { GraphQLQueryManager } from "./GraphQLQueryManager";

export class GraphQLQueryBuilder {
  private _info: GraphQLResolveInfo | null = null;
  private _andWhereExpressions: Array<ChainableWhereArgument> = [];
  private _orWhereExpressions: Array<ChainableWhereArgument> = [];

  constructor(
    private _manager: GraphQLQueryManager,
    private _entity: Function | string
  ) {}

  public info(info: GraphQLResolveInfo): GraphQLQueryBuilder {
    this._info = info;
    return this;
  }

  public where(where: ChainableWhereArgument): GraphQLQueryBuilder {
    this._andWhereExpressions.push(where);
    return this;
  }

  public orWhere(where: ChainableWhereArgument): GraphQLQueryBuilder {
    this._orWhereExpressions.push(where);
    return this;
  }

  public async loadOne<T>(): Promise<T | undefined> {
    // We need to have an info object to parse
    if (!this._info) {
      throw new Error(
        "Missing GraphQL Resolve info. Please invoke `.info()` before calling this method`"
      );
    }

    // Get's the queried fields and checks if we already have this query cached
    const { fields, found, key, item } = this._manager.processQueryMeta(
      this._info,
      this._andWhereExpressions
    );

    // If the item was found, just return it
    if (found && item) {
      return item;
    }

    const promise = new Promise<T | undefined>((resolve, reject) => {
      this._manager.addQueueItem({
        many: false,
        key,
        fields,
        andWhere: this._andWhereExpressions,
        orWhere: this._orWhereExpressions,
        resolve,
        reject,
        entity: this._entity
      });
    });

    this._manager.addCacheItem(key, promise)
  }
}
