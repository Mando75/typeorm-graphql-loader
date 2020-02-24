import {
  ChainableQueueItem,
  ChainableWhereArgument,
  ChainableWhereExpression,
  FieldNodeInfo,
  LoaderOptions,
  LoaderWhereExpression,
  QueryMeta
} from "../types";
import { LoaderSearchMethod } from "./enums/LoaderSearchMethod";
import { GraphQLInfoParser } from "./lib/GraphQLInfoParser";
import { GraphQLResolveInfo } from "graphql";
import * as crypto from "crypto";
import {
  Brackets,
  Connection,
  EntityManager,
  SelectQueryBuilder
} from "typeorm";
import { GraphQLQueryResolver } from "./GraphQLQueryResolver";

export class GraphQLQueryManager {
  private _queue: ChainableQueueItem[] = [];
  private _cache: Map<string, Promise<any>> = new Map();
  private _immediate?: NodeJS.Immediate;
  private _defaultLoaderSearchMethod: LoaderSearchMethod;
  private _parser: GraphQLInfoParser = new GraphQLInfoParser();
  private _resolver: GraphQLQueryResolver;

  constructor(private _connection: Connection, options: LoaderOptions = {}) {
    const { defaultSearchMethod } = options;
    this._defaultLoaderSearchMethod =
      defaultSearchMethod ?? LoaderSearchMethod.ANY_POSITION;

    this._resolver = new GraphQLQueryResolver(options);
  }

  private static createTypeORMQueryBuilder(
    entityManager: EntityManager,
    name: string
  ): SelectQueryBuilder<{}> {
    return entityManager
      .getRepository<{}>(name)
      .createQueryBuilder(name)
      .select([]);
  }

  public processQueryMeta(
    info: GraphQLResolveInfo | FieldNodeInfo,
    where: Array<ChainableWhereArgument>
  ): QueryMeta {
    // Create a new md5 hash function
    const hash = crypto.createHash("md5");

    // Get the fields queried by the graphql request
    const fields = this._parser.graphqlFields(info);
    // Use the query parameters to generate a new hash for caching
    const key = hash
      .update(JSON.stringify([where, fields]))
      .digest()
      .toString("hex");

    // If this key already exists in the cache, just return the found value
    if (this._cache.has(key)) {
      return {
        fields,
        key: "",
        item: this._cache.get(key),
        found: true
      };
    }

    // Cancel any scheduled immediates so we can add more
    // items to the queue
    if (this._immediate) {
      clearImmediate(this._immediate);
    }

    // return the new cache key
    return {
      fields,
      key,
      found: false
    };
  }

  public addQueueItem(item: ChainableQueueItem) {
    this._queue.push(item);
    this._setImmediate();
  }

  public addCacheItem<T>(key: string, value: Promise<T | undefined>) {
    this._cache.set(key, value);
  }

  private _setImmediate() {
    this._immediate = setImmediate(() => this._processQueue());
  }

  private async _processQueue(): Promise<any> {
    // Clear and capture the current queue
    const queue = this._queue.splice(0, this._queue.length);
    try {
      return await this._connection.transaction(async entityManager => {
        queue.map(this._resolveQueueItem(entityManager));
      });
    } catch (e) {}
  }

  /**
   * @param entityManager
   */
  private _resolveQueueItem(entityManager: EntityManager) {
    return async (item: ChainableQueueItem) => {
      const name =
        typeof item.entity == "string" ? item.entity : item.entity.name;
      let queryBuilder: SelectQueryBuilder<{}> = GraphQLQueryManager.createTypeORMQueryBuilder(
        entityManager,
        name
      );
      queryBuilder = this._resolver.createQuery(
        name,
        item.fields,
        entityManager.connection,
        queryBuilder,
        name
      );
      queryBuilder = this._addAndWhereConditions(queryBuilder, item.andWhere);
      queryBuilder = this._addOrWhereConditions(queryBuilder, item.orWhere);

      const promise = item.many
        ? queryBuilder.getMany()
        : queryBuilder.getOne();

      return promise
        .then(item.resolve, item.reject)
        .finally(() => this._cache.delete(item.key));
    };
  }

  /**
   * Given a set of conditions, ANDs them onto the SQL WHERE expression
   * via the TypeORM QueryBuilder.
   * Will handle the initial where statement as per TypeORM style
   * @param qb
   * @param conditions
   * @private
   */
  private _addAndWhereConditions(
    qb: SelectQueryBuilder<{}>,
    conditions: Array<ChainableWhereExpression>
  ): SelectQueryBuilder<{}> {
    const initialWhere = conditions.shift();
    if (!initialWhere) return qb;

    const { where, params } = this._breakDownWhereExpression(initialWhere);
    qb = qb.where(where, params);

    conditions.forEach(condition => {
      const { where, params } = this._breakDownWhereExpression(condition);
      qb = qb.andWhere(where, params);
    });
    return qb;
  }

  /**
   * Given a set of conditions, ORs them onto the SQL WHERE expression
   * via the TypeORM QueryBuilder
   * @param qb
   * @param conditions
   * @private
   */
  private _addOrWhereConditions(
    qb: SelectQueryBuilder<{}>,
    conditions: Array<ChainableWhereExpression>
  ): SelectQueryBuilder<{}> {
    conditions.forEach(condition => {
      const { where, params } = this._breakDownWhereExpression(condition);
      qb = qb.orWhere(where, params);
    });
    return qb;
  }

  /**
   * Takes a condition and formats into a type that TypeORM can
   * read
   * @param where
   * @private
   */
  private _breakDownWhereExpression(where: ChainableWhereExpression) {
    if ((where as LoaderWhereExpression).isLoaderWhereExpression) {
      const asExpression = where as LoaderWhereExpression;
      return { where: asExpression.condition, params: asExpression.params };
    } else {
      // TypeScript weirdness here. Casting as brackets but it doesn't matter
      // because the only incompatible type is handled in the if statement above
      // Just casting this so that TypeORM behaves nicely
      return { where: where as Brackets, params: undefined };
    }
  }
}
