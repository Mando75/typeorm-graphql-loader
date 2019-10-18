import { snakeCase } from "typeorm/util/StringUtils";
import { LoaderOptions, SearchOptions } from "./types";

export enum LoaderNamingStrategyEnum {
  CAMELCASE,
  SNAKECASE
}

export enum LoaderSearchMethod {
  ANY_POSITION, // LIKE '%mysearch%'
  STARTS_WITH, // LIKE 'mysearch%';
  ENDS_WITH // LIKE '%mysearch';
}

export class Base {
  static SearchMethodMapping = new Map<LoaderSearchMethod, Function>([
    [LoaderSearchMethod.ANY_POSITION, (text: string) => `%${text}%`],
    [LoaderSearchMethod.STARTS_WITH, (text: string) => `${text}%`],
    [LoaderSearchMethod.ENDS_WITH, (text: string) => `%${text}`]
  ]);

  protected primaryKeyColumn: string;
  protected namingStrategy: LoaderNamingStrategyEnum;
  protected defaultLoaderSearchMethod: LoaderSearchMethod;

  constructor(options: LoaderOptions) {
    this.primaryKeyColumn = options.primaryKeyColumn || "id";
    this.namingStrategy =
      options.namingStrategy || LoaderNamingStrategyEnum.CAMELCASE;
    this.defaultLoaderSearchMethod =
      options.defaultSearchMethod || LoaderSearchMethod.ANY_POSITION;
  }

  protected formatAliasField(alias: string, field: string): string {
    switch (this.namingStrategy) {
      case LoaderNamingStrategyEnum.SNAKECASE:
        return `${alias}_${snakeCase(field)}`;
      case LoaderNamingStrategyEnum.CAMELCASE:
        return `${alias}_${field}`;
      default:
        return `${alias}_${field}`;
    }
  }

  protected formatColumnSelect(alias: string, field: string): string {
    return `${alias}.${field}`;
  }

  protected generateSearchString(
    alias: string,
    { searchText, searchColumns, searchMethod, caseSensitive }: SearchOptions
  ): { query: string; params: { searchText: string } } {
    const method = searchMethod || this.defaultLoaderSearchMethod;
    const likeQueryStrings = searchColumns.map(field => {
      if (typeof field === "string") {
        return caseSensitive
          ? `${this.formatColumnSelect(alias, field)} LIKE :searchText`
          : `LOWER(${this.formatColumnSelect(
              alias,
              field
            )}) LIKE LOWER(:searchText)`;
      } else {
        const joinedFields = field
          .map(item => this.formatColumnSelect(alias, item))
          .join(" || ' ' || ");
        return caseSensitive
          ? `${joinedFields} LIKE :searchText`
          : `LOWER(${joinedFields}) LIKE LOWER(:searchText)`;
      }
    });
    const searchTextParam = Base.SearchMethodMapping.get(method)!(searchText);
    return {
      query: `(${likeQueryStrings.join(" OR ")})`,
      params: { searchText: searchTextParam }
    };
  }
}
