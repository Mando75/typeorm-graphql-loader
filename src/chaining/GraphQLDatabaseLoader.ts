import {LoaderOptions, QueueItem} from "../types";
import {Connection} from "typeorm";
import {LoaderNamingStrategyEnum} from "./enums/LoaderNamingStrategy";
import {LoaderSearchMethod} from "./enums/LoaderSearchMethod";
import {GraphQLInfoParser} from "./lib/GraphQLInfoParser";

export class GraphQLDatabaseLoader {
  private _queue: QueueItem[] = [];
  private _cache: Map<string, Promise<any>> = new Map();
  private _immediate?: NodeJS.Immediate;
  private _primaryKeyColumn: string;
  private _namingStrategy: LoaderNamingStrategyEnum;
  private _defaultLoaderSearchMethod: LoaderSearchMethod;
  private _parser: GraphQLInfoParser = new GraphQLInfoParser();

  constructor(
    private connection: Connection,
    public options: LoaderOptions = {}
  ) {
    const {primaryKeyColumn, namingStrategy, defaultSearchMethod} = options;
    this._primaryKeyColumn = primaryKeyColumn ?? "id";
    this._namingStrategy = namingStrategy ?? LoaderNamingStrategyEnum.CAMELCASE;
    this._defaultLoaderSearchMethod = defaultSearchMethod ?? LoaderSearchMethod.ANY_POSITION;
  }
}
