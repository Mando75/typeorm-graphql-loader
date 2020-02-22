import {
  ChainableQueueItem,
  ChainableWhereArgument,
  FieldNodeInfo,
  LoaderOptions,
  QueryMeta
} from "../types";
import { LoaderNamingStrategyEnum } from "./enums/LoaderNamingStrategy";
import { LoaderSearchMethod } from "./enums/LoaderSearchMethod";
import { GraphQLInfoParser } from "./lib/GraphQLInfoParser";
import { GraphQLResolveInfo } from "graphql";
import * as crypto from "crypto";

export class GraphQLQueryManager {
  private _queue: ChainableQueueItem[] = [];
  private _cache: Map<string, Promise<any>> = new Map();
  private _immediate?: NodeJS.Immediate;
  private _primaryKeyColumn: string;
  private _namingStrategy: LoaderNamingStrategyEnum;
  private _defaultLoaderSearchMethod: LoaderSearchMethod;
  private _parser: GraphQLInfoParser = new GraphQLInfoParser();

  constructor(private options: LoaderOptions = {}) {
    const { primaryKeyColumn, defaultSearchMethod, namingStrategy } = options;
    this._primaryKeyColumn = primaryKeyColumn ?? "id";
    this._namingStrategy = namingStrategy ?? LoaderNamingStrategyEnum.CAMELCASE;
    this._defaultLoaderSearchMethod =
      defaultSearchMethod ?? LoaderSearchMethod.ANY_POSITION;
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
    this.setImmediate();
  }

  public addCacheItem<T>(key: string, value: Promise<T | undefined>) {
    this._cache.set(key, value);
  }

  private setImmediate() {
    this._immediate = setImmediate(() => this.processQueue());
  }

  private processQueue() {
    return null;
    // TODO Fill out method
  }
}
