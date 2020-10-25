import {
  GraphQLEntityFields,
  LoaderOptions,
  QueryMeta,
  QueryPagination,
  QueueItem,
  QueueItemEntity,
  SearchOptions,
  WhereExpression,
} from "./types";
import { LoaderSearchMethod } from "./enums/LoaderSearchMethod";
import * as crypto from "crypto";
import {
  Brackets,
  Connection,
  EntityManager,
  OrderByCondition,
  SelectQueryBuilder,
} from "typeorm";
import { GraphQLQueryResolver } from "./GraphQLQueryResolver";
import { Formatter } from "./lib/Formatter";
import { LoaderNamingStrategyEnum } from "./enums/LoaderNamingStrategy";
import { LoaderQueryType } from "./enums/LoaderQueryType";
import { buildPaginator, PagingResult } from "typeorm-cursor-pagination";

/**
 * The query manager for the loader. Is an internal class
 * that should not be used by anything except the loader
 * @hidden
 */
export class GraphQLQueryManager {
  private _queue: QueueItem<QueueItemEntity>[] = [];
  private _cache: Map<string, Promise<any>> = new Map();
  private _immediate?: NodeJS.Immediate;
  private readonly _defaultLoaderSearchMethod: LoaderSearchMethod;
  private _resolver: GraphQLQueryResolver;
  private _formatter: Formatter;

  constructor(private _connection: Connection, options: LoaderOptions = {}) {
    const { defaultSearchMethod } = options;
    this._defaultLoaderSearchMethod =
      defaultSearchMethod ?? LoaderSearchMethod.ANY_POSITION;

    this._resolver = new GraphQLQueryResolver(options);
    this._formatter = new Formatter(
      options.namingStrategy ?? LoaderNamingStrategyEnum.CAMELCASE
    );
  }

  /**
   * Helper method to generate a TypeORM query builder
   * @param entityManager
   * @param name
   * @param alias
   */
  private static createTypeORMQueryBuilder<T>(
    entityManager: EntityManager,
    name: string,
    alias: string
  ): SelectQueryBuilder<T> {
    return entityManager
      .getRepository<T>(name)
      .createQueryBuilder(alias)
      .select([]);
  }

  /**
   * Takes a condition and formats into a type that TypeORM can
   * read
   * @param where
   * @private
   */
  private static _breakDownWhereExpression(where: WhereExpression) {
    if (where instanceof Brackets) {
      return { where: where, params: undefined };
    } else {
      const asExpression = where;
      return { where: asExpression.condition, params: asExpression.params };
    }
  }

  /**
   * Looks up a query in the cache and returns
   * the existing promise if found.
   * @param fields
   * @param where
   */
  public processQueryMeta(
    fields: GraphQLEntityFields | null,
    where: Array<WhereExpression>
  ): QueryMeta {
    // Create a new md5 hash function
    const hash = crypto.createHash("md5");

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
        found: true,
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
      found: false,
    };
  }

  /**
   * Pushes a new item to the queue and sets a new immediate
   * @param item
   */
  public addQueueItem<T>(item: QueueItem<T>) {
    this._queue.push(item);
    this._setImmediate();
  }

  /**
   * Adds a new promise to the cache. It can now be looked up by processQueryMeta
   * if an identical request comes through
   * @param key
   * @param value
   */
  public addCacheItem<T>(key: string, value: Promise<T | undefined>) {
    this._cache.set(key, value);
  }

  /**
   * Helper to set an immediate that will process the queue
   * @private
   */
  private _setImmediate() {
    this._immediate = setImmediate(() => this._processQueue());
  }

  /**
   * Where the magic happens
   * Goes through the queue and resoles each query
   * @private
   */
  private async _processQueue(): Promise<any> {
    // Clear and capture the current queue
    const queue = this._queue.splice(0, this._queue.length);
    const queryRunner = this._connection.createQueryRunner("slave");

    try {
      await queryRunner.connect();
      await Promise.all(queue.map(this._resolveQueueItem(queryRunner.manager)));
    } catch (e) {
      queue.forEach((q) => {
        q.reject(e);
        this._cache.delete(q.key);
      });
    }

    await queryRunner.release();
  }

  /**
   * Returns a closure that will be used to resolve
   * a query from the cache
   * @param entityManager
   */
  private _resolveQueueItem(entityManager: EntityManager) {
    return async <T>(item: QueueItem<T>) => {
      const name = item.entity.name;
      const alias = item.alias ?? name;

      let queryBuilder: SelectQueryBuilder<T> = GraphQLQueryManager.createTypeORMQueryBuilder<
        T
      >(entityManager, name, alias);
      queryBuilder = this._resolver.createQuery(
        name,
        item.fields,
        entityManager.connection,
        queryBuilder,
        alias,
        item.context
      );
      queryBuilder = this._addSelectFields(
        queryBuilder,
        alias,
        item.predicates.selectFields
      );
      queryBuilder = this._addAndWhereConditions(
        queryBuilder,
        item.predicates.andWhere
      );
      queryBuilder = this._addOrWhereConditions(
        queryBuilder,
        item.predicates.orWhere
      );
      queryBuilder = this._addSearchConditions(
        queryBuilder,
        alias,
        item.predicates.search
      );
      queryBuilder = this._addOrderByCondition(
        queryBuilder,
        item.predicates.order
      );

      if (item.type === LoaderQueryType.PAGINATED) {
        queryBuilder = this._addPagination(queryBuilder, item.pagination);
      }

      queryBuilder = item.ejectQueryCallback(queryBuilder);

      let promise: Promise<
        T[] | [T[], number] | PagingResult<T> | T | undefined
      >;
      switch (item.type) {
        case LoaderQueryType.MANY:
          promise = queryBuilder.getMany();
          break;
        case LoaderQueryType.PAGINATED:
          promise = queryBuilder.getManyAndCount();
          break;
        case LoaderQueryType.SINGLE:
          promise = queryBuilder.getOne();
          break;
        case LoaderQueryType.RELAY:
          const paginator = buildPaginator({
            entity: item.entity,
          });
          promise = paginator.paginate(queryBuilder);
          break;
      }

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
  private _addAndWhereConditions<T>(
    qb: SelectQueryBuilder<T>,
    conditions: Array<WhereExpression>
  ): SelectQueryBuilder<T> {
    const initialWhere = conditions.shift();
    if (!initialWhere) return qb;

    const { where, params } = GraphQLQueryManager._breakDownWhereExpression(
      initialWhere
    );
    qb = qb.where(where, params);

    conditions.forEach((condition) => {
      const { where, params } = GraphQLQueryManager._breakDownWhereExpression(
        condition
      );
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
  private _addOrWhereConditions<T>(
    qb: SelectQueryBuilder<T>,
    conditions: Array<WhereExpression>
  ): SelectQueryBuilder<T> {
    conditions.forEach((condition) => {
      const { where, params } = GraphQLQueryManager._breakDownWhereExpression(
        condition
      );
      qb = qb.orWhere(where, params);
    });
    return qb;
  }

  /**
   * Given a list of search conditions, adds them to the query builder.
   * If multiple sets of search conditions are passed, the will be ANDed together
   * @param qb
   * @param alias
   * @param searchConditions
   * @private
   */
  private _addSearchConditions<T>(
    qb: SelectQueryBuilder<T>,
    alias: string,
    searchConditions: Array<SearchOptions>
  ): SelectQueryBuilder<T> {
    // Add an andWhere for each formatted search condition
    this._formatSearchConditions(searchConditions, alias).forEach(
      ({ query, params }) => {
        qb = qb.andWhere(query, params);
      }
    );
    return qb;
  }

  /**
   * Maps over a list of given search conditions and formats them into
   * a query and param object to be added to a query builder.
   * @param conditions
   * @param alias
   * @private
   */
  private _formatSearchConditions(
    conditions: Array<SearchOptions>,
    alias: string
  ) {
    return conditions.map(
      ({ searchColumns, searchMethod, searchText, caseSensitive }) => {
        // Determine which search method we should use (can be customized per request)
        const method = searchMethod || this._defaultLoaderSearchMethod;
        // Generates a list of 'column LIKE :searchText' in accordance with the
        // SearchOptions type definition
        const likeQueryStrings = this._formatter.formatSearchColumns(
          searchColumns,
          alias,
          caseSensitive
        );
        // Depending on our search method, we need to place our wild card
        // in a different part of the string. This handles that.
        const searchTextParam = this._formatter.getSearchMethodMapping(
          method,
          searchText
        );
        // Returns this structure so they can be safely added
        // to the query builder without providing for SQL injection
        return {
          query: `(${likeQueryStrings.join(" OR ")})`,
          params: { searchText: searchTextParam },
        };
      }
    );
  }

  /**
   * Adds pagination to the query builder
   * @param queryBuilder
   * @param pagination
   * @private
   */
  private _addPagination<T>(
    queryBuilder: SelectQueryBuilder<T>,
    pagination: QueryPagination | undefined
  ): SelectQueryBuilder<T> {
    if (pagination) {
      queryBuilder = queryBuilder.offset(pagination.offset);
      queryBuilder = queryBuilder.limit(pagination.limit);
    }
    return queryBuilder;
  }

  /**
   * Adds OrderBy condition to the query builder
   * @param queryBuilder
   * @param order
   * @private
   */
  private _addOrderByCondition<T>(
    queryBuilder: SelectQueryBuilder<T>,
    order: OrderByCondition
  ): SelectQueryBuilder<T> {
    return queryBuilder.orderBy(order);
  }

  /**
   * makes sure given fields are selected
   * by the query builder
   * @param queryBuilder
   * @param alias
   * @param selectFields
   * @private
   */
  private _addSelectFields<T>(
    queryBuilder: SelectQueryBuilder<T>,
    alias: string,
    selectFields: Array<string>
  ): SelectQueryBuilder<T> {
    selectFields.forEach((field) => {
      queryBuilder = queryBuilder.addSelect(
        this._formatter.columnSelection(alias, field),
        this._formatter.aliasField(alias, field)
      );
    });
    return queryBuilder;
  }
}
